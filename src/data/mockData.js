// src/data/mockData.js

export const mockPlans = {
  cafe: [
    { 
      title: '廢物文青之旅', 
      items: [
        { time: '14:00', activity: '隱藏版老屋咖啡', desc: '先來杯冠軍咖啡喚醒靈魂 [cite: 11]', icon: 'cafe', color: '#84A6D3' },
        { time: '15:30', activity: '獨立書店', desc: '翻兩頁就放回去，享受氣氛 [cite: 28]', icon: 'book', color: '#C3AED9' }
      ]
    },
    { 
      title: '咖啡因中毒', 
      items: [
        { time: '14:20', activity: '手沖精品店', desc: '專注於 3 小時的味覺饗宴 [cite: 7, 31]', icon: 'cafe', color: '#C95E9E' },
        { time: '16:00', activity: '河邊散步', desc: '消化咖啡因並尋找 AR 膠囊 [cite: 18, 31]', icon: 'walk', color: '#84A6D3' }
      ]
    },
    { 
      title: '黑膠空間逃避行', 
      items: [
        { time: '15:00', activity: '黑膠唱片行', desc: '戴上耳機，這 3 小時誰也別吵我 [cite: 7, 10]', icon: 'headset', color: '#C3AED9' },
        { time: '16:40', activity: '河畔看日落', desc: '最後的餘暉留給自己 [cite: 5, 28]', icon: 'sunny', color: '#84A6D3' }
      ]
    }
  ],
  food: [
    { 
      title: '肚子餓了的極致享受', 
      items: [
        { time: '12:00', activity: '隱藏版拉麵', desc: '巷弄裡的職人味道 [cite: 11]', icon: 'restaurant', color: '#C95E9E' },
        { time: '13:30', activity: '手工甜點', desc: '甜點是另一個胃的事 [cite: 31]', icon: 'ice-cream', color: '#84A6D3' }
      ]
    },
    { 
      title: '辛辣與救贖', 
      items: [
        { time: '18:00', activity: '四川紅油抄手', desc: '燃燒靈魂的麻辣感 [cite: 10, 11]', icon: 'flame', color: '#C95E9E' },
        { time: '19:10', activity: '黑糖珍珠奶茶', desc: '這杯就是妳的救贖 [cite: 2, 31]', icon: 'beaker', color: '#C3AED9' }
      ]
    },
    { 
      title: '隱藏菜單大冒險', 
      items: [
        { time: '13:00', activity: '巷弄私廚', desc: '沒有招牌，只有懂的人才在 [cite: 5, 11]', icon: 'restaurant', color: '#84A6D3' },
        { time: '15:00', activity: '街角雕魚燒', desc: '咬一口暖呼呼的幸福 [cite: 2, 31]', icon: 'fast-food', color: '#C3AED9' }
      ]
    }
  ],
  photo: [
    { 
      title: '美照收藏家', 
      items: [
        { time: '15:00', activity: '古著店巡禮', desc: '穿上復古風格拍一張 [cite: 11, 14]', icon: 'camera', color: '#C3AED9' },
        { time: '16:30', activity: '夕陽觀景台', desc: '捕捉當下的絕美光影 [cite: 10, 13]', icon: 'sunny', color: '#C95E9E' }
      ]
    },
    { 
      title: '城市霓虹計畫', 
      items: [
        { time: '19:00', activity: '信義區天橋', desc: '在賽博龐克的夜色下長曝 [cite: 28, 31]', icon: 'camera', color: '#C3AED9' },
        { time: '20:30', activity: '地下酒吧', desc: '酒標與微光是最美濾鏡 [cite: 7, 31]', icon: 'wine', color: '#C95E9E' }
      ]
    },
    { 
      title: '文青極簡構圖', 
      items: [
        { time: '14:00', activity: '美術館白牆', desc: '留白，是給生活的呼吸感 [cite: 21, 31]', icon: 'aperture', color: '#84A6D3' },
        { time: '15:40', activity: '純白質感選物', desc: '拍拍那些精緻的小碎片 [cite: 28, 31]', icon: 'camera', color: '#C3AED9' }
      ]
    }
  ],
  rain: [ // 🌟 躲室內 [cite: 10, 31]
    { 
      title: '雨中地下樂園', 
      items: [
        { time: '14:00', activity: '地下街遊逛', desc: '不用撐傘也能漫步 2 公里 [cite: 10, 31]', icon: 'umbrella', color: '#84A6D3' },
        { time: '16:00', activity: '懷舊遊戲場', desc: '在投幣機中忘記煩心事 [cite: 10, 24]', icon: 'game-controller', color: '#C3AED9' }
      ]
    },
    { 
      title: '雨天避難所', 
      items: [
        { time: '14:30', activity: '百貨公司展覽', desc: '躲開濕氣，沉浸在美感中 [cite: 31]', icon: 'color-palette', color: '#C95E9E' },
        { time: '16:30', activity: '室內水族館', desc: '看著水母漂浮，時間也停了 [cite: 7, 31]', icon: 'fish', color: '#84A6D3' }
      ]
    },
    { 
      title: '書堆裡的雨聲', 
      items: [
        { time: '15:00', activity: '24小時書店', desc: '躲進書堆裡等雨停 [cite: 31]', icon: 'book', color: '#C3AED9' },
        { time: '17:00', activity: '陶藝手作室', desc: '親手捏出雨天的形狀 [cite: 7, 21]', icon: 'brush', color: '#C95E9E' }
      ]
    }
  ],
  walk: [ // 🌟 散散步 [cite: 10, 31]
    { 
      title: '綠色隧道漫遊', 
      items: [
        { time: '16:00', activity: '富錦街林蔭', desc: '觀察路上可愛的建築與植物 [cite: 31]', icon: 'leaf', color: '#84A6D3' },
        { time: '17:30', activity: '河堤吹風', desc: '聽聽自己的心跳聲 [cite: 5, 31]', icon: 'walk', color: '#C3AED9' }
      ]
    },
    { 
      title: '舊城區發現案', 
      items: [
        { time: '15:00', activity: '大稻埕巷弄', desc: '在舊房子間尋找未來 [cite: 31]', icon: 'map', color: '#C3AED9' },
        { time: '17:00', activity: '碼頭夕陽', desc: '這就是活著的感覺 [cite: 2, 48]', icon: 'sunny', color: '#C95E9E' }
      ]
    },
    { 
      title: '貓咪足跡觀察', 
      items: [
        { time: '14:30', activity: '師大巷弄', desc: '猜測下一隻貓在哪出現 [cite: 10, 31]', icon: 'paw', color: '#84A6D3' },
        { time: '16:00', activity: '社區小公園', desc: '盪個鞦韆讓大腦關機 [cite: 5, 31]', icon: 'walk', color: '#C3AED9' }
      ]
    }
  ],
  gift: [ // 🌟 買東西 [cite: 31]
    { 
      title: 'P 人的購物質感', 
      items: [
        { time: '14:30', activity: '設計師選物店', desc: '買些沒用但可愛的小東西 [cite: 31, 32]', icon: 'gift', color: '#C95E9E' },
        { time: '16:00', activity: '復古玩具行', desc: '尋回 10 歲時的自己 [cite: 24, 31]', icon: 'cube', color: '#C3AED9' }
      ]
    },
    { 
      title: '香味收集計畫', 
      items: [
        { time: '15:00', activity: '香氛調配室', desc: '帶走專屬這趟旅行的味道 [cite: 7, 31]', icon: 'flask', color: '#84A6D3' },
        { time: '16:30', activity: '乾燥花手作', desc: '留住這 3 小時的美好 [cite: 21, 31]', icon: 'flower', color: '#C95E9E' }
      ]
    },
    { 
      title: '文房具迷航', 
      items: [
        { time: '14:00', activity: '進口文具專門', desc: '鋼筆寫下的都是心情 [cite: 31, 44]', icon: 'create', color: '#C3AED9' },
        { time: '15:40', activity: '印章店手作', desc: '蓋下這次漫遊的足跡膠囊 [cite: 18, 19]', icon: 'bookmark', color: '#84A6D3' }
      ]
    }
  ]
};