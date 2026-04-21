import { useState, useEffect } from 'react';
import { apiGet } from '../../../services/apiClient';

/**
 * 5 日天氣預報 — 透過後端代理，不直接打 OWM API。
 * 回傳格式與舊 axios 版相容：{ data, dailyData, loading }
 *   dailyData: [{ date, max, min, icon, pop }, ...]  (最多 5 天)
 *   data:      後端原始 { hourly, daily } 物件
 */
export const useWeatherForecast = (lat, lon) => {
  const [data, setData]           = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!lat || !lon) return;
    setLoading(true);

    (async () => {
      try {
        const res = await apiGet('/api/v1/weather/forecast', { lat, lon });

        // 從逐時資料計算每日最高降雨機率
        const popByDate = {};
        res.hourly.forEach(h => {
          const date = new Date(h.time).toISOString().slice(0, 10);
          if (popByDate[date] === undefined || h.precipitation_prob > popByDate[date]) {
            popByDate[date] = h.precipitation_prob;
          }
        });

        const mapped = res.daily.slice(0, 5).map(d => ({
          date: d.date,
          max:  d.temp_max,
          min:  d.temp_min,
          icon: d.condition,   // e.g. "Clear" / "Rain" / "Clouds"
          pop:  popByDate[d.date] ?? 0,
        }));

        setDailyData(mapped);
        setData(res);
      } catch (error) {
        console.error('[useWeatherForecast] 預報抓取失敗', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [lat, lon]);

  return { data, dailyData, loading };
};
