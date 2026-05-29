import { apiGet } from '../../../services/apiClient';

// 大眾運輸 / 地點查詢一律走後端（/api/v1/transit/*、/api/v1/places/*）。
// 前端不再持有 TDX / Google 金鑰，也不直接打任何外部 API。
// 各函式保留 token 參數僅為相容呼叫端，實際不使用。

// 地點搜尋 — 走後端
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
    return [];
  }
};

// 公車到站 — 走後端
export const getBusETASec = async (token, routeName, stopName, walkSec = 0) => {
  try {
    const data = await apiGet('/api/v1/transit/bus/eta', {
      route_name: routeName.trim(),
      stop_name:  stopName,
    });
    if (!data.eta_seconds) return null;
    return { estimateSec: data.eta_seconds, plateNumb: data.plate_number };
  } catch {
    return null;
  }
};

// 捷運到站 — 走後端
export const getMrtETASec = async (token, stationName, walkSec = 0) => {
  try {
    const data = await apiGet('/api/v1/transit/mrt/eta', { station_name: stationName });
    return data.next_trains?.[0]?.eta_seconds ?? null;
  } catch {
    return null;
  }
};

// 最近 YouBike 站 — 走後端（PostGIS）
export const getNearestYouBike = async (lat, lon, token, isStart) => {
  try {
    const data = await apiGet('/api/v1/transit/bikes', {
      lat, lon, type: isStart ? 'rent' : 'return', limit: 1,
    });
    const match = (data.stations || [])[0];
    if (!match) return null;
    return {
      StationName:     { Zh_tw: match.name },
      StationPosition: { PositionLat: match.latitude, PositionLon: match.longitude },
      AvailableRentBikes:   match.available_rent,
      AvailableReturnBikes: match.available_return,
      dist: match.distance_meters,
    };
  } catch {
    return null;
  }
};

// 公車車輛即時位置追蹤（依車牌）：後端尚無對應端點，暫時停用。
// 之後若後端新增 /transit/bus/realtime，再改走後端即可。
export const getBusRealTimeStatus = async () => null;
