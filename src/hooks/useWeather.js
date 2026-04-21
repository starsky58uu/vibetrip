import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { apiGet } from '../services/apiClient';

// Maps OWM icon code to WeatherIcon kind prop
export function owmIconToKind(icon = '') {
  const code = icon.slice(0, 2);
  const night = icon.endsWith('n');
  if (code === '01') return night ? 'night' : 'sunny';
  if (code === '02' || code === '03') return 'partly';
  if (code === '04') return 'cloudy';
  if (code === '09' || code === '10' || code === '11') return 'rain';
  return 'partly';
}

// Poetic tag that combines weather condition × time of day
export function vibeTag(condition = '', hour = 12) {
  const slot =
    hour < 6  ? 0 :  // 深夜/凌晨
    hour < 9  ? 1 :  // 清晨
    hour < 12 ? 2 :  // 上午
    hour < 14 ? 3 :  // 正午
    hour < 17 ? 4 :  // 午後
    hour < 19 ? 5 :  // 傍晚
    hour < 22 ? 6 :  // 夜晚
               7;    // 深夜

  const tags = {
    Clear:       ['星光未盡 ↗', '清晨日出 ↗', '日光正好 ↗', '正午豔陽 ↗', '午後微光 ↗', '夕陽追光 ↗', '星空清澈 ↗', '夜深好眠 ↗'],
    Clouds:      ['靜夜朦朧 ↗', '雲霧輕飄 ↗', '柔光慢走 ↗', '白雲悠悠 ↗', '雲影搖曳 ↗', '雲霞如畫 ↗', '涼風微涼 ↗', '雲掩月色 ↗'],
    Rain:        ['夜雨綿綿 ↗', '晨雨輕敲 ↗', '雨天好眠 ↗', '雨聲正濃 ↗', '咖啡躲雨 ↗', '雨後清涼 ↗', '雨夜漫步 ↗', '深夜雨聲 ↗'],
    Drizzle:     ['夜雨綿綿 ↗', '微雨如霧 ↗', '毛毛雨天 ↗', '細雨飄飄 ↗', '霧雨輕灑 ↗', '雨後青翠 ↗', '細雨夜行 ↗', '深夜雨聲 ↗'],
    Thunderstorm:['雷雨交加 ↗', '雷聲轟轟 ↗', '躲進室內 ↗', '閃電正烈 ↗', '室內最安全 ↗', '雷雨漸歇 ↗', '雷夜驚心 ↗', '夜雷作響 ↗'],
    Snow:        ['深夜雪落 ↗', '晨雪初積 ↗', '雪花飛舞 ↗', '正午白雪 ↗', '午後雪景 ↗', '暮色雪光 ↗', '夜雪靜謐 ↗', '深夜雪靜 ↗'],
    Mist:        ['霧夜迷途 ↗', '晨霧繚繞 ↗', '霧裡探路 ↗', '霧氣氤氳 ↗', '薄霧午後 ↗', '暮霧朦朧 ↗', '霧夜漫遊 ↗', '深夜霧濃 ↗'],
    Fog:         ['霧夜迷途 ↗', '晨霧繚繞 ↗', '霧裡探路 ↗', '霧氣氤氳 ↗', '薄霧午後 ↗', '暮霧朦朧 ↗', '霧夜漫遊 ↗', '深夜霧濃 ↗'],
  };

  return (tags[condition] ?? tags.Clouds)[slot];
}

export default function useWeather() {
  const [current, setCurrent] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        let lat = 25.0330, lon = 121.5654;
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lon = loc.coords.longitude;
        }
        const [cur, fore] = await Promise.all([
          apiGet('/api/v1/weather/current', { lat, lon }),
          apiGet('/api/v1/weather/forecast', { lat, lon }),
        ]);
        if (!mounted) return;
        setCurrent(cur);
        setForecast(fore);
      } catch (e) {
        console.warn('[useWeather]', e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { current, forecast, loading };
}
