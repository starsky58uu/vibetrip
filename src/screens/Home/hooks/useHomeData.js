import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import axios from 'axios';

const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

export const useHomeData = () => {
  const [location, setLocation] = useState(null);
  const [district, setDistrict] = useState(null);
  // 分離天氣狀態與溫度
  const [temperature, setTemperature] = useState(null); 
  const [weatherCondition, setWeatherCondition] = useState(null);
  const [greetingMessage, setGreetingMessage] = useState(null);
  
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

  // 3. 處理天氣與貼心小語
  useEffect(() => {
    if (!location) return; 
    const fetchWeather = async () => {
      try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${location.latitude}&lon=${location.longitude}&units=metric&lang=zh_tw&appid=${OPENWEATHER_API_KEY}`;
        const res = await axios.get(url);
        
        if (res.data && res.data.main) {
          const temp = Math.round(res.data.main.temp);
          const condition = res.data.weather[0].main; 
          
          setTemperature(`${temp}°C`);
          setWeatherCondition(condition);

          let msg = `今日氣溫 ${temp}°C，適合出門走走。`;
          if (condition === 'Rain' || condition === 'Drizzle') msg = '今日降雨機率高，出門請留意攜帶雨具。';
          else if (temp >= 28) msg = '今日氣溫較高，外出請注意防曬與水分補充。';
          else if (temp <= 18) msg = '今日氣溫偏涼，請適時添加衣物。';

          setGreetingMessage(msg);
        }
      } catch (error) { 
        setTemperature('25°C'); 
        setWeatherCondition('Clear');
        setGreetingMessage('願妳有美好的一天。');
      } finally {
        setIsLoading(false);
      }
    };
    fetchWeather();
  }, [location]);

  return { location, district, temperature, weatherCondition, greetingMessage, currentTime, isLoading };
};