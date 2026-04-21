import { fetchWithTimeout, getDistance } from '../utils/helpers';
import { apiGet } from '../../../services/apiClient';
import MRT_MAP from '../../../data/mrt_map.json';

const TDX_CLIENT_ID     = process.env.EXPO_PUBLIC_TDX_CLIENT_ID?.trim();
const TDX_CLIENT_SECRET = process.env.EXPO_PUBLIC_TDX_CLIENT_SECRET?.trim();

let cachedToken = null;
let tokenExpiry = 0;

export const getTdxToken = async () => {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;
  try {
    const body = Object.entries({
      grant_type: 'client_credentials',
      client_id: TDX_CLIENT_ID,
      client_secret: TDX_CLIENT_SECRET,
    }).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

    const res = await fetchWithTimeout(
      'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token',
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }
    );
    const data = await res.json();
    cachedToken = data.access_token;
    tokenExpiry = now + (data.expires_in - 60) * 1000;
    return cachedToken;
  } catch { return null; }
};

// Places search — backend first, Google fallback
export const searchPlaces = async (query, lat, lng) => {
  try {
    const data = await apiGet('/api/v1/places/search', { query, lat, lon: lng });
    return (data.places || []).map(p => ({
      name:      p.name,
      latitude:  p.latitude,
      longitude: p.longitude,
      rating:    p.rating ?? null,
      dist:      Math.round(p.distance_meters ?? 0),
    }));
  } catch {
    // fallback: Google Places (keys on device)
    const key = process.env.EXPO_PUBLIC_GOOGLE_API_KEY?.trim();
    if (!key) return [];
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=2000&keyword=${encodeURIComponent(query)}&language=zh-TW&key=${key}`;
    const res = await fetchWithTimeout(url);
    const data = await res.json();
    return (data.results || []).map(p => ({
      name:      p.name,
      latitude:  p.geometry.location.lat,
      longitude: p.geometry.location.lng,
      rating:    p.rating ?? null,
      dist:      getDistance(lat, lng, p.geometry.location.lat, p.geometry.location.lng),
    })).sort((a, b) => a.dist - b.dist).slice(0, 6);
  }
};

// Bus ETA — backend first, TDX fallback
export const getBusETASec = async (token, routeName, stopName, walkSec = 0) => {
  try {
    const data = await apiGet('/api/v1/transit/bus/eta', {
      route_name: routeName.trim(),
      stop_name:  stopName,
    });
    if (!data.eta_seconds) return null;
    return { estimateSec: data.eta_seconds, plateNumb: data.plate_number };
  } catch {
    // TDX direct fallback
    try {
      const altStop = stopName.includes('台')
        ? stopName.replace(/台/g, '臺')
        : stopName.replace(/臺/g, '台');
      const filter = encodeURIComponent(
        `StopName/Zh_tw eq '${stopName}' or StopName/Zh_tw eq '${altStop}'`
      );
      const res = await fetchWithTimeout(
        `https://tdx.transportdata.tw/api/basic/v2/Bus/EstimatedTimeOfArrival/City/Taipei/${encodeURIComponent(routeName.trim())}?$filter=${filter}&$format=JSON`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) return null;
      const coming = data
        .filter(b => b.EstimateTime != null && b.StopStatus === 0)
        .sort((a, b) => a.EstimateTime - b.EstimateTime);
      const target = coming.find(b => b.EstimateTime > walkSec + 45) || coming[0];
      if (!target) return null;
      return { estimateSec: target.EstimateTime, plateNumb: target.PlateNumb };
    } catch { return null; }
  }
};

// MRT ETA — backend first, TDX fallback
export const getMrtETASec = async (token, stationName, walkSec = 0) => {
  try {
    const data = await apiGet('/api/v1/transit/mrt/eta', { station_name: stationName });
    return data.next_trains?.[0]?.eta_seconds ?? null;
  } catch {
    // TDX direct fallback
    try {
      const clean = stationName.replace(/捷運/g, '').replace(/站$/g, '').split('(')[0].trim();
      const stationID = MRT_MAP[clean] || MRT_MAP[clean.replace(/台/g, '臺')];
      if (!stationID) return null;
      const res = await fetchWithTimeout(
        `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/RealTimeStationArrival/TRTC?$filter=StationID eq '${stationID}'&$format=JSON`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) return null;
      const trains = data
        .filter(t => t.EstimateTime != null)
        .map(t => t.EstimateTime * 60)
        .sort((a, b) => a - b);
      return trains.find(s => s > walkSec + 45) ?? trains[0] ?? null;
    } catch { return null; }
  }
};

// YouBike nearest — backend first (PostGIS), TDX fallback
export const getNearestYouBike = async (lat, lon, token, isStart) => {
  try {
    const data = await apiGet('/api/v1/transit/bikes', { lat, lon, type: isStart ? 'rent' : 'return', limit: 1 });
    const stations = data.stations || [];
    const match = stations[0];
    if (!match) return null;
    return {
      StationName:     { Zh_tw: match.name },
      StationPosition: { PositionLat: match.latitude, PositionLon: match.longitude },
      AvailableRentBikes:   match.available_rent,
      AvailableReturnBikes: match.available_return,
      dist: match.distance_meters,
    };
  } catch {
    // TDX direct fallback
    try {
      const [stRes, avRes] = await Promise.all([
        fetchWithTimeout('https://tdx.transportdata.tw/api/basic/v2/Bike/Station/City/Taipei?$format=JSON', { headers: { Authorization: `Bearer ${token}` } }),
        fetchWithTimeout('https://tdx.transportdata.tw/api/basic/v2/Bike/Availability/City/Taipei?$format=JSON', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const stData = await stRes.json();
      const avData = await avRes.json();
      if (!Array.isArray(stData)) return null;
      const stations = stData.map(st => {
        const av = Array.isArray(avData) ? avData.find(a => a.StationUID === st.StationUID) : null;
        return {
          ...st,
          AvailableRentBikes:   av ? av.AvailableRentBikes   : 0,
          AvailableReturnBikes: av ? av.AvailableReturnBikes : 0,
          dist: getDistance(lat, lon, st.StationPosition.PositionLat, st.StationPosition.PositionLon),
        };
      });
      const valid = stations
        .filter(s => s.dist <= 1000 && (isStart ? s.AvailableRentBikes > 0 : s.AvailableReturnBikes > 0))
        .sort((a, b) => a.dist - b.dist);
      return valid[0] ?? null;
    } catch { return null; }
  }
};

// Bus real-time tracking via plate number (TDX only — no backend equivalent yet)
export const getBusRealTimeStatus = async (token, routeName, plateNumb) => {
  if (!plateNumb) return null;
  try {
    const res = await fetchWithTimeout(
      `https://tdx.transportdata.tw/api/basic/v2/Bus/RealTimeNearStop/City/Taipei/${encodeURIComponent(routeName.trim())}?$filter=PlateNumb eq '${plateNumb}'&$format=JSON`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;
    const bus = data[0];
    return {
      currentStop: bus.StopName.Zh_tw,
      status:      bus.A2EventType === 1 ? '進站中' : '已離站',
      stopSeq:     bus.StopSequence,
    };
  } catch { return null; }
};
