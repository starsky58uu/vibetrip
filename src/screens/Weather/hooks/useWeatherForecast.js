import { useState, useEffect } from 'react';
import axios from 'axios';

export const useWeatherForecast = (lat, lon) => {
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 確保有經緯度才去打 API
    if (!lat || !lon) return;

    const fetchWeather = async () => {
      try {
        const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=zh_tw&appid=${API_KEY}`;
        const res = await axios.get(url);
        
        // 過濾並整理資料，讓 UI 直接拿乾淨的格式
        const dailyData = res.data.list
          .filter(item => item.dt_txt.includes("12:00:00"))
          .map(item => {
            const main = item.weather[0].main;
            let icon = '☁️';
            if (main === 'Clear') icon = '☀️';
            else if (main === 'Clouds') icon = '⛅';
            else if (main === 'Rain') icon = '🌧️';

            return {
              id: item.dt.toString(),
              date: item.dt_txt.split(' ')[0],
              icon: icon,
              temp: Math.round(item.main.temp),
              desc: item.weather[0].description
            };
          });

        setForecast(dailyData);
      } catch (error) {
        console.error("預報抓取失敗", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [lat, lon]);

  return { forecast, loading };
};