// 把 hex 顏色往白色方向淺化（amount 0~1，越大越白）
function lighten(hex, amount = 0.55) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.round(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * amount);
  const g = Math.round(((n >> 8)  & 0xff) + (255 - ((n >> 8)  & 0xff)) * amount);
  const b = Math.round(( n        & 0xff) + (255 - ( n        & 0xff)) * amount);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

/**
 * 根據目前主題 colors 動態產生 Google Maps customMapStyle。
 * MapScreen 裡用 useMemo(() => getMapStyle(colors), [colors]) 包一下。
 */
export function getMapStyle(C) {
  return [
    // 底色：主題底紙色
    { elementType: 'geometry',           stylers: [{ color: C.paper2 }] },
    // 文字
    { elementType: 'labels.text.fill',   stylers: [{ color: C.ink3 }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: C.paper }] },
    // 行政區
    { featureType: 'administrative',           elementType: 'geometry.stroke',     stylers: [{ color: C.line }] },
    { featureType: 'administrative.locality',  elementType: 'labels.text.fill',    stylers: [{ color: C.ink2 }] },
    // 景點
    { featureType: 'poi',                elementType: 'geometry',             stylers: [{ color: lighten(C.paper2, 0.3) }] },
    { featureType: 'poi',                elementType: 'labels.text.fill',     stylers: [{ color: C.tea }] },
    // 公園：苔綠淺化
    { featureType: 'poi.park',           elementType: 'geometry',             stylers: [{ color: lighten(C.moss, 0.65) }] },
    { featureType: 'poi.park',           elementType: 'labels.text.fill',     stylers: [{ color: C.moss }] },
    // 道路
    { featureType: 'road',               elementType: 'geometry',             stylers: [{ color: C.card }] },
    { featureType: 'road',               elementType: 'geometry.stroke',      stylers: [{ color: C.line }] },
    { featureType: 'road',               elementType: 'labels.text.fill',     stylers: [{ color: C.ink3 }] },
    { featureType: 'road.highway',       elementType: 'geometry',             stylers: [{ color: lighten(C.accent, 0.75) }] },
    { featureType: 'road.highway',       elementType: 'geometry.stroke',      stylers: [{ color: lighten(C.accent, 0.5) }] },
    // 大眾運輸
    { featureType: 'transit',            elementType: 'geometry',             stylers: [{ color: C.paper2 }] },
    { featureType: 'transit.station',    elementType: 'labels.text.fill',     stylers: [{ color: C.accent }] },
    // 水域：indigo 淺化
    { featureType: 'water',              elementType: 'geometry',             stylers: [{ color: lighten(C.indigo, 0.65) }] },
    { featureType: 'water',              elementType: 'labels.text.fill',     stylers: [{ color: C.indigo }] },
  ];
}

// 保留舊名稱給其他地方用（其實只有 MapScreen 用，可忽略）
export const darkMapStyle = [];

export const DUMMY_COMMUNITY_SPOTS = [
  {
    id: 'c1', lat: 25.0330, lng: 121.5654,
    author: { name: 'Moxi_0508', avatar: 'https://i.pravatar.cc/150?img=47' },
    timeAgo: '2h',
    content: '考完試去吃了一碗濃郁的雞白湯拉麵，再找間不限時咖啡廳寫 Code，今天大安區的行程給過 ✨',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=600&auto=format&fit=crop',
    likes: 128, replies: 12, isLiked: false, isSaved: false, isViewed: false,
  },
  {
    id: 'c2', lat: 25.0422, lng: 121.5478,
    author: { name: 'Cyber_Traveler', avatar: 'https://i.pravatar.cc/150?img=11' },
    timeAgo: '5h',
    content: '九份夜拍秘境真的太扯了，不用去象山人擠人。',
    image: 'https://images.unsplash.com/photo-1498503182468-3b51cbb6cb24?q=80&w=600&auto=format&fit=crop',
    likes: 85, replies: 4, isLiked: false, isSaved: false, isViewed: false, 
  }
];