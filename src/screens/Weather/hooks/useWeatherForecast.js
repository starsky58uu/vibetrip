import { useState, useEffect } from 'react';
import axios from 'axios';

export const useWeatherForecast = (lat, lon) => {
  const [data, setData] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      if (!lat || !lon) return;

      (async () => {
          try {
              const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
              const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=zh_tw&appid=${API_KEY}`;
              const res = await axios.get(url);

              // 【正確的資料處理邏輯】精算每一天的真正最高溫/最低溫與最大降雨機率，並判定天氣權重
              const dailyMap = {};
              const conditionPriority = { Rain: 3, Clouds: 2, Clear: 1 };

              res.data.list.forEach((item) => {
                  const date = item.dt_txt.split(' ')[0];
                  const currentMain = item.weather[0].main;

                  if (!dailyMap[date]) {
                      dailyMap[date] = {
                          date,
                          max: -Infinity,
                          min: Infinity,
                          icon: currentMain,
                          pop: 0,
                      };
                  }

                  // 精算單日最高與最低溫
                  if (item.main.temp_max > dailyMap[date].max) dailyMap[date].max = item.main.temp_max;
                  if (item.main.temp_min < dailyMap[date].min) dailyMap[date].min = item.main.temp_min;

                  // 抓取當日最高降雨機率
                  if (item.pop > dailyMap[date].pop) dailyMap[date].pop = item.pop;

                  // 天氣狀況優先級判定
                  const currentPrio = conditionPriority[dailyMap[date].icon] || 0;
                  const newPrio = conditionPriority[currentMain] || 0;

                  if (newPrio > currentPrio) {
                      dailyMap[date].icon = currentMain;
                  }
              });

              setDailyData(Object.values(dailyMap).slice(0, 5)); // 取未來 5 天
              setData(res.data);
          } catch (error) {
              console.error('預報抓取失敗', error);
          } finally {
              setLoading(false);
          }
      })();
  }, [lat, lon]);

  return { data, dailyData, loading };
};