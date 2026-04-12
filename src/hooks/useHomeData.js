import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import axios from 'axios';

const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

export const useHomeData = () => {
  const [location, setLocation] = useState(null);
  const [district, setDistrict] = useState(null);
  const [weather, setWeather] = useState(null);
  const [currentTime, setCurrentTime] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 1. 處理時間更新
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  // 2. 處理定位與行政區
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setIsLoading(false);
        return;
      }
      try {
        const currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = currentLoc.coords;
        setLocation({ latitude, longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 });
        
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        setDistrict(geo[0]?.district || geo[0]?.subregion || '台北市');
      } catch (error) { 
        setDistrict('未知區域'); 
      }
    })();
  }, []);

  // 3. 處理天氣 (依賴定位結果)
  useEffect(() => {
    if (!location) return; 
    const fetchWeather = async () => {
      try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${location.latitude}&lon=${location.longitude}&units=metric&lang=zh_tw&appid=${OPENWEATHER_API_KEY}`;
        const res = await axios.get(url);
        if (res.data && res.data.main) {
          const temp = Math.round(res.data.main.temp);
          setWeather(`☀️ ${temp}°C`);
        }
      } catch (error) { 
        setWeather('⛅ 25°C'); 
      } finally {
        setIsLoading(false);
      }
    };
    fetchWeather();
  }, [location]);

  return { location, district, weather, currentTime, isLoading };
};