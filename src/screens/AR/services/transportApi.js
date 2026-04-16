import { fetchWithTimeout, getDistance } from '../utils/helpers';
import MRT_MAP from '../../../data/mrt_map.json';

const TDX_CLIENT_ID = process.env.EXPO_PUBLIC_TDX_CLIENT_ID?.trim();
const TDX_CLIENT_SECRET = process.env.EXPO_PUBLIC_TDX_CLIENT_SECRET?.trim();

let cachedToken = null;
let tokenExpiry = 0;

export const getTdxToken = async () => {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;
  try {
    const body = Object.entries({ grant_type: 'client_credentials', client_id: TDX_CLIENT_ID, client_secret: TDX_CLIENT_SECRET })
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    const res = await fetchWithTimeout('https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    });
    const data = await res.json();
    cachedToken = data.access_token;
    tokenExpiry = now + (data.expires_in - 60) * 1000;
    return cachedToken;
  } catch (err) { return null; }
};

// 【修改】原有的 getBusETASec，讓它順便回傳車牌號碼
export const getBusETASec = async (token, routeName, stopName, walkSec = 0) => {
  try {
    const altStop = stopName.includes('台') ? stopName.replace(/台/g, '臺') : stopName.replace(/臺/g, '台');
    const filter = encodeURIComponent(`StopName/Zh_tw eq '${stopName}' or StopName/Zh_tw eq '${altStop}'`);
    const res = await fetchWithTimeout(`https://tdx.transportdata.tw/api/basic/v2/Bus/EstimatedTimeOfArrival/City/Taipei/${encodeURIComponent(routeName.trim())}?$filter=${filter}&$format=JSON`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;
    
    const coming = data.filter(b => b.EstimateTime != null && b.StopStatus === 0).sort((a, b) => a.EstimateTime - b.EstimateTime);
    const catchable = coming.find(b => b.EstimateTime > (walkSec + 45)); 
    
    const targetBus = catchable || coming[0];
    if (!targetBus) return null;

    return {
      estimateSec: targetBus.EstimateTime,
      plateNumb: targetBus.PlateNumb // 取得即將到站的車牌號碼
    };
  } catch (err) { return null; }
};

// 【新增】透過車牌號碼追蹤公車目前位置 (動態定點資料 A2)
export const getBusRealTimeStatus = async (token, routeName, plateNumb) => {
  if (!plateNumb) return null;
  try {
    const url = `https://tdx.transportdata.tw/api/basic/v2/Bus/RealTimeNearStop/City/Taipei/${encodeURIComponent(routeName.trim())}?$filter=PlateNumb eq '${plateNumb}'&$format=JSON`;
    const res = await fetchWithTimeout(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    
    if (!Array.isArray(data) || !data.length) return null;
    
    const bus = data[0];
    // A2EventType: 0: 離站, 1: 進站
    return {
      currentStop: bus.StopName.Zh_tw,
      status: bus.A2EventType === 1 ? '進站中' : '已離站',
      stopSeq: bus.StopSequence // 透過站序可以計算還要幾站
    };
  } catch (err) { return null; }
};

export const getMrtETASec = async (token, stationName, walkSec = 0, systemCode = 'TRTC') => {
  try {
    const cleanName = stationName.replace(/捷運/g, '').replace(/站$/g, '').split('(')[0].trim();
    const altCleanName = cleanName.replace(/台/g, '臺');
    const stationID = MRT_MAP[cleanName] || MRT_MAP[altCleanName];
    if (!stationID) return null;

    const apiUrl = systemCode === 'TRTC' 
      ? `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/RealTimeStationArrival/TRTC?$filter=StationID eq '${stationID}'&$format=JSON`
      : `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/LiveBoard/${systemCode}?$filter=StationID eq '${stationID}'&$format=JSON`;

    const response = await fetchWithTimeout(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const validTrains = data.filter(train => train.EstimateTime != null).map(train => ({ estimateSec: train.EstimateTime * 60 })).sort((a, b) => a.estimateSec - b.estimateSec);
    const catchable = validTrains.find(t => t.estimateSec > (walkSec + 45));
    return catchable ? catchable.estimateSec : (validTrains[0]?.estimateSec || null);
  } catch (err) { return null; }
};

export const getNearestYouBike = async (lat, lon, token, isStart) => {
  try {
    const stUrl = `https://tdx.transportdata.tw/api/basic/v2/Bike/Station/City/Taipei?$format=JSON`;
    const stRes = await fetchWithTimeout(stUrl, { headers: { Authorization: `Bearer ${token}` } });
    const stData = await stRes.json();
    if (!Array.isArray(stData) || !stData.length) return null;

    const avUrl = `https://tdx.transportdata.tw/api/basic/v2/Bike/Availability/City/Taipei?$format=JSON`;
    const avRes = await fetchWithTimeout(avUrl, { headers: { Authorization: `Bearer ${token}` } });
    const avData = await avRes.json();

    if (!Array.isArray(avData)) return null;

    const stations = stData.map(st => {
      const av = avData.find(a => a.StationUID === st.StationUID);
      return {
        ...st,
        AvailableRentBikes: av ? av.AvailableRentBikes : 0,
        AvailableReturnBikes: av ? av.AvailableReturnBikes : 0,
        dist: getDistance(lat, lon, st.StationPosition.PositionLat, st.StationPosition.PositionLon)
      };
    });

    const validStations = stations.filter(s => 
      s.dist <= 1000 && (isStart ? s.AvailableRentBikes > 0 : s.AvailableReturnBikes > 0)
    );

    if (!validStations.length) return null;
    return validStations.sort((a, b) => a.dist - b.dist)[0];
  } catch (err) { return null; }
};