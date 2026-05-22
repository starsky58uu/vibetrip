// VibeTrip design system data — vibes and trip templates

export const VIBES = [
  { key: 'cafe',   zh: '喝杯咖啡', en: 'Café Drift',   icon: 'cafe',   accent: '#8B6F4E' },
  { key: 'food',   zh: '肚子餓了', en: 'Hungry Mood',  icon: 'food',   accent: '#C85A3B' },
  { key: 'photo',  zh: '想拍美照', en: 'Photo Hunt',   icon: 'photo',  accent: '#6E7A4B' },
  { key: 'rain',   zh: '躲雨室內', en: 'Rain Shelter', icon: 'rain',   accent: '#3E5873' },
  { key: 'walk',   zh: '散步感受', en: 'Slow Walk',    icon: 'walk',   accent: '#8B6F4E' },
  { key: 'gift',   zh: '挑個小物', en: 'Tiny Gift',    icon: 'gift',   accent: '#C85A3B' },
  { key: 'random', zh: '隨便都好', en: 'Surprise Me',  icon: 'random', accent: '#1C1A17' },
];

// ── 深夜 / 凌晨 fallback（後端不可用時，確保不推薦已關店家）────────────────────
export const TRIP_DATA_NIGHT = {
  cafe: {
    title: '深夜 · 宵夜咖啡時光',
    subtitle: '凌晨才有的安靜，配一杯不睡的咖啡',
    duration: 180,
    items: [
      { time: '00:00', dur: '30min', activity: '24h 全家 or 7-ELEVEN',   desc: '現磨咖啡配關東煮，深夜最誠實的組合', icon: 'cafe', dist: '步行 3 min', tag: '24H', mood: '☕' },
      { time: '00:40', dur: '60min', activity: '鬧區夜間公園長椅',         desc: '帶著咖啡坐在夜裡，什麼都不用想',      icon: 'walk', dist: '步行 7 min', tag: '夜景', mood: '🌙' },
      { time: '01:50', dur: '50min', activity: '深夜拉麵 or 鹹酥雞攤',    desc: '宵夜魂降臨，一碗湯或一包炸物',        icon: 'food', dist: '步行 5 min', tag: '宵夜', mood: '🍜' },
    ],
  },
  food: {
    title: '深夜 · 宵夜探險隊',
    subtitle: '不是饞，只是深夜的胃比白天誠實',
    duration: 180,
    items: [
      { time: '00:00', dur: '50min', activity: '鹹酥雞炸物攤',    desc: '九層塔香氣瀰漫，深夜最懂你的食物',   icon: 'food', dist: '步行 4 min', tag: '必吃',   mood: '🍗' },
      { time: '01:00', dur: '40min', activity: '深夜拉麵館',       desc: '豚骨湯底 + 溏心蛋，暖胃又暖心',      icon: 'food', dist: '步行 6 min', tag: '24H',   mood: '🍜' },
      { time: '01:50', dur: '40min', activity: '夜市燒烤攤',       desc: '串燒 + 台灣啤酒，這才叫宵夜',        icon: 'food', dist: '步行 8 min', tag: '宵夜',  mood: '🍺' },
    ],
  },
  photo: {
    title: '深夜 · 城市霓虹獵影',
    subtitle: '夜裡的光更真實，按快門不需要理由',
    duration: 180,
    items: [
      { time: '00:00', dur: '50min', activity: '夜間橋景 or 高架橋下',  desc: '城市燈火倒映水面，深夜才有的構圖', icon: 'photo', dist: '步行 10 min', tag: '夜景',   mood: '🌃' },
      { time: '01:00', dur: '50min', activity: '便利商店霓虹燈招牌',    desc: '冷色光打在臉上，台灣版電影場景',   icon: 'photo', dist: '步行 5 min',  tag: '霓虹',   mood: '📸' },
      { time: '02:00', dur: '40min', activity: '夜市收攤後的空曠街道',  desc: '人少燈還在，孤獨感是這裡限定的',   icon: 'walk',  dist: '步行 8 min',  tag: '祕境',  mood: '🎞' },
    ],
  },
  rain: {
    title: '深夜 · 室內避雨漫遊',
    subtitle: '雨聲加上深夜，最適合什麼都不做',
    duration: 180,
    items: [
      { time: '00:00', dur: '60min', activity: '24h 漫畫咖啡館',     desc: '包廂隔音好，漫畫讀到天亮都沒事',   icon: 'photo', dist: '步行 5 min', tag: '避雨',  mood: '📚' },
      { time: '01:10', dur: '50min', activity: '麥當勞 24H 店',      desc: '薯條 + 手機，深夜的社會觀察場',    icon: 'food',  dist: '步行 4 min', tag: '24H',   mood: '🍟' },
      { time: '02:10', dur: '40min', activity: '超商窗邊座位',       desc: '看雨打在玻璃上，配一罐啤酒剛好',   icon: 'cafe',  dist: '步行 3 min', tag: '靜謐', mood: '🌧' },
    ],
  },
  walk: {
    title: '深夜 · 城市慢步',
    subtitle: '深夜的街道是另一個城市',
    duration: 180,
    items: [
      { time: '00:00', dur: '60min', activity: '河濱夜間步道',        desc: '風吹過來，只有腳步聲和水聲',         icon: 'walk', dist: '步行 10 min', tag: '清醒', mood: '🌙' },
      { time: '01:10', dur: '50min', activity: '空曠廣場夜遊',        desc: '平日人擠人的地方，深夜只有你',       icon: 'walk', dist: '步行 8 min',  tag: '祕境', mood: '🚶' },
      { time: '02:10', dur: '30min', activity: '24h 超商補給站',      desc: '走累了進來，能量棒配熱咖啡',         icon: 'cafe', dist: '步行 5 min',  tag: '24H',  mood: '⚡' },
    ],
  },
  gift: {
    title: '深夜 · 便利商店尋寶',
    subtitle: '深夜的選物，全靠直覺',
    duration: 180,
    items: [
      { time: '00:00', dur: '40min', activity: '7-ELEVEN 限定商品區', desc: '聯名款 or 季節限定，撿便宜的好時機', icon: 'gift',  dist: '步行 3 min', tag: '限定品', mood: '🎁' },
      { time: '00:50', dur: '50min', activity: '全家甜點冷藏櫃',      desc: '深夜糕點最療癒，選一個蛋糕帶走',    icon: 'food',  dist: '步行 4 min', tag: '甜點',   mood: '🍰' },
      { time: '01:50', dur: '50min', activity: '夜市收攤前最後一逛',  desc: '老闆急著收，反而才肯讓價',          icon: 'gift',  dist: '步行 9 min', tag: '撿便宜', mood: '🧧' },
    ],
  },
  random: {
    title: '深夜 · 凌晨漂流',
    subtitle: '反正睡不著，就讓深夜帶著走',
    duration: 180,
    items: [
      { time: '00:00', dur: '30min', activity: '轉角遇到的燈亮超商', desc: '深夜的起點，永遠是全家或 7-11',   icon: 'cafe', dist: '步行 5 min',  tag: '偶遇', mood: '🎲' },
      { time: '00:40', dur: '60min', activity: '漫無目的的夜間散步', desc: '跟著路燈走，不要計畫',             icon: 'walk', dist: '漫步 ~',      tag: '隨意', mood: '🌙' },
      { time: '01:50', dur: '40min', activity: '路邊宵夜攤',         desc: '聞到香味就停，這就是深夜的命運',   icon: 'food', dist: '步行 6 min',  tag: '直覺', mood: '✨' },
    ],
  },
};

export const TRIP_DATA = {
  cafe: {
    title: '信義區 · 咖啡漫遊',
    subtitle: '午後光線正好，找個角落發呆',
    duration: 180,
    items: [
      { time: '14:40', dur: '20min', activity: 'Fika Fika Cafe',     desc: '北歐烘豆冠軍，先來杯單品淺焙醒腦',     icon: 'cafe',  dist: '步行 5 min',  tag: '冠軍豆', mood: '☕' },
      { time: '15:15', dur: '45min', activity: '光合作用書店',         desc: '一整面書牆與舊木地板，順手翻本詩集',   icon: 'photo', dist: '步行 8 min',  tag: '獨立書店', mood: '📖' },
      { time: '16:10', dur: '60min', activity: '四四南村 · 斜陽',      desc: '老眷村的紅磚牆，拍幾張最好看的光影',   icon: 'photo', dist: '步行 12 min', tag: '黃金時刻', mood: '🌤' },
      { time: '17:20', dur: '40min', activity: 'ICHIGO 草莓可麗露',    desc: '限量的可麗露配伯爵茶，療癒疲憊的腳',   icon: 'food',  dist: '步行 6 min',  tag: '隱藏版', mood: '🍰' },
    ],
  },
  food: {
    title: '信義區 · 隱味覓食',
    subtitle: '肚子餓了，直接衝最近的三家',
    duration: 180,
    items: [
      { time: '14:40', dur: '50min', activity: '麻 · 深夜拉麵',     desc: '濃厚雞白湯 + 溏心蛋，一碗就滿足',   icon: 'food', dist: '步行 4 min',  tag: '老闆推薦', mood: '🍜' },
      { time: '15:40', dur: '30min', activity: 'Pâtisserie ALEX', desc: '法式千層與伯爵茶，甜點胃獨立',         icon: 'food', dist: '步行 7 min',  tag: '甜點', mood: '🍰' },
      { time: '16:20', dur: '50min', activity: 'Mikkeller 啤酒館', desc: '下午提早開，精釀配炸物剛剛好',        icon: 'food', dist: '步行 10 min', tag: '精釀', mood: '🍺' },
    ],
  },
  photo: {
    title: '信義區 · 光影尋寶',
    subtitle: '下午 4 點的斜射光最美',
    duration: 180,
    items: [
      { time: '14:40', dur: '40min', activity: '不只是圖書館',     desc: '木地板與老家具，自然光打得像日劇', icon: 'photo', dist: '步行 6 min',  tag: '復古感', mood: '📸' },
      { time: '15:30', dur: '50min', activity: '四四南村',         desc: '紅磚 + 101 的經典構圖，別錯過黃金時刻', icon: 'photo', dist: '步行 8 min',  tag: '經典機位', mood: '🌇' },
      { time: '16:40', dur: '40min', activity: '象山親山步道前段', desc: '不必攻頂，六巨石就能拍到整個信義區', icon: 'walk', dist: '步行 15 min', tag: '微健行', mood: '🌄' },
    ],
  },
  rain: {
    title: '信義區 · 躲雨探險',
    subtitle: '雨天就是最適合逛室內的日子',
    duration: 180,
    items: [
      { time: '14:40', dur: '60min', activity: 'Moshi Moshi 雜貨', desc: '日系文具與生活小物，意外好逛',       icon: 'gift',  dist: '步行 5 min',  tag: '雜貨', mood: '☔️' },
      { time: '15:50', dur: '50min', activity: '誠品信義 · 三樓藝文', desc: '雨聲配書香，挑本這季新到的小說', icon: 'photo', dist: '步行 4 min',  tag: '書店', mood: '📚' },
      { time: '16:50', dur: '50min', activity: '松菸 · 誠品生活',   desc: '舊菸廠的光影 + 工藝小店，越晚越有味道', icon: 'photo', dist: '捷運 1 站', tag: '老靈魂', mood: '🏛' },
    ],
  },
  walk: {
    title: '信義區 · 慢步曲線',
    subtitle: '沒有終點，只有風吹過來的方向',
    duration: 180,
    items: [
      { time: '14:40', dur: '50min', activity: '松菸後方生態池',   desc: '水面倒映建築，意外地安靜',             icon: 'walk', dist: '步行 10 min', tag: '祕境', mood: '🌿' },
      { time: '15:40', dur: '60min', activity: '國父紀念館後巷',   desc: '舊公寓與咖啡小店交錯的巷弄',           icon: 'walk', dist: '步行 12 min', tag: '巷弄', mood: '🚶' },
      { time: '16:50', dur: '50min', activity: '象山公園入口',     desc: '回程路過坐坐，看信義區慢慢亮起來',     icon: 'walk', dist: '步行 15 min', tag: '夕陽', mood: '🌆' },
    ],
  },
  gift: {
    title: '信義區 · 挑點什麼',
    subtitle: '不為了誰，只是今天想帶點東西回家',
    duration: 180,
    items: [
      { time: '14:40', dur: '40min', activity: 'fujin tree 樣品屋', desc: '台灣設計師選物，手感陶器與香氛',  icon: 'gift', dist: '步行 7 min', tag: '設計', mood: '🎁' },
      { time: '15:30', dur: '45min', activity: '印花樂 · 在地選品', desc: '小布包和織品，台味又好看',         icon: 'gift', dist: '步行 6 min', tag: '手作', mood: '🧶' },
      { time: '16:25', dur: '45min', activity: 'Yu Chocolatier 畬室', desc: '給自己一盒會融化的黑巧克力',  icon: 'food', dist: '步行 8 min', tag: '甜點', mood: '🍫' },
    ],
  },
  random: {
    title: '信義區 · 命運安排',
    subtitle: '不想選，就讓命運幫你安排',
    duration: 180,
    items: [
      { time: '14:40', dur: '30min', activity: '不期而遇的路口咖啡', desc: '走到哪算哪，遇到香味就坐下', icon: 'cafe',  dist: '步行 5 min',  tag: '偶遇', mood: '🎲' },
      { time: '15:15', dur: '50min', activity: '某間老相機店',       desc: '阿伯願意聊半小時他的徠卡',   icon: 'photo', dist: '步行 9 min',  tag: '老店', mood: '📷' },
      { time: '16:10', dur: '60min', activity: '完全沒計畫的下午',   desc: '看到喜歡的光就停下來',       icon: 'walk',  dist: '漫步 ~',      tag: '隨意', mood: '✨' },
    ],
  },
};

/**
 * 根據現在時間返回合適的 fallback 行程資料。
 * 深夜（22:00-05:59）或清晨（06:00-08:59）使用夜間版本，避免推薦已關閉店家。
 */
export function getFallbackTrip(vibeKey) {
  const hour = new Date().getHours();
  const isNight = hour >= 22 || hour < 9; // 22:00 ~ 08:59 用夜間 fallback
  const source = isNight ? TRIP_DATA_NIGHT : TRIP_DATA;
  return source[vibeKey] || source.random || TRIP_DATA.cafe;
}
