import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ActivityIndicator, 
  SafeAreaView, TouchableOpacity, ScrollView, FlatList
} from 'react-native';
import axios from 'axios';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const themeColors = {
  background: '#362360',
  cardBg: 'rgba(30, 18, 56, 0.6)',
  textMain: '#E9F3FB',
  textSub: '#A094B7',
  accentMain: '#C95E9E',
  accentBlue: '#5EB4C9',
  border: '#1E1238'
};

// 氣象署風格：風向轉換
const getWindDirection = (degree) => {
  const directions = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'];
  const index = Math.round(((degree %= 360) < 0 ? degree + 360 : degree) / 45) % 8;
  return directions[index] + '風';
};

const getWeatherIcon = (main) => {
  switch (main) {
    case 'Clear': return 'weather-sunny';
    case 'Clouds': return 'weather-cloudy';
    case 'Rain': return 'weather-pouring';
    case 'Drizzle': return 'weather-partly-rainy';
    case 'Thunderstorm': return 'weather-lightning';
    case 'Snow': return 'weather-snowy';
    default: return 'weather-cloudy';
  }
};

const formatTime = (dateString) => dateString.split(' ')[1].substring(0, 5);

// 轉換 Unix 時間為 HH:mm (用於日出日落)
const formatUnixTime = (unixTime) => {
  const date = new Date(unixTime * 1000);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const WeatherDetailScreen = ({ route, navigation }) => {
  const { lat, lon, district } = route.params;
  const [data, setData] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=zh_tw&appid=${API_KEY}`;
        const res = await axios.get(url);
        
        // 【正確的資料處理邏輯】精算每一天的真正最高溫/最低溫與最大降雨機率，並判定天氣權重
        const dailyMap = {};
        const conditionPriority = { 'Rain': 3, 'Clouds': 2, 'Clear': 1 };

        res.data.list.forEach(item => {
          const date = item.dt_txt.split(' ')[0];
          const currentMain = item.weather[0].main;

          if (!dailyMap[date]) {
            dailyMap[date] = { 
              date, 
              max: -Infinity, 
              min: Infinity, 
              icon: currentMain, 
              pop: 0 
            };
          }

          // 精算單日最高與最低溫
          if (item.main.temp_max > dailyMap[date].max) dailyMap[date].max = item.main.temp_max;
          if (item.main.temp_min < dailyMap[date].min) dailyMap[date].min = item.main.temp_min;
          
          // 抓取當日最高降雨機率
          if (item.pop > dailyMap[date].pop) dailyMap[date].pop = item.pop;

          // 天氣狀況優先級判定 (如果有下雨，當天圖示就該是雨天)
          const currentPrio = conditionPriority[dailyMap[date].icon] || 0;
          const newPrio = conditionPriority[currentMain] || 0;

          if (newPrio > currentPrio) {
            dailyMap[date].icon = currentMain;
          }
        });

        setDailyData(Object.values(dailyMap).slice(0, 5)); // 取未來 5 天
        setData(res.data);
      } catch (error) {
        console.error("預報抓取失敗", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !data) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={themeColors.accentMain} />
          <Text style={styles.loadingText}>連線氣象資料中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const current = data.list[0];
  const hourlyForecast = data.list.slice(0, 8); // 未來 24 小時 (8個時段)

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* 導航列 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={themeColors.textMain} />
          <Text style={styles.headerTitle}>{district}</Text>
        </TouchableOpacity>
        <Text style={styles.updateTime}>更新於 {formatTime(current.dt_txt)}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* === 主視覺區塊 === */}
        <View style={styles.dashboardHero}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroTemp}>{Math.round(current.main.temp)}<Text style={{fontSize: 30}}>°C</Text></Text>
            <Text style={styles.heroDesc}>{current.weather[0].description} · 體感 {Math.round(current.main.feels_like)}°</Text>
          </View>
          <MaterialCommunityIcons 
            name={getWeatherIcon(current.weather[0].main)} 
            size={70} 
            color={themeColors.textMain} 
          />
        </View>

        {/* 重點數據橫條 */}
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStat}>
            <Ionicons name="umbrella-outline" size={20} color={themeColors.accentBlue} />
            <Text style={styles.quickStatText}>{Math.round(current.pop * 100)}%</Text>
          </View>
          <View style={styles.quickStat}>
            <Ionicons name="water-outline" size={20} color={themeColors.textSub} />
            <Text style={styles.quickStatText}>{current.main.humidity}%</Text>
          </View>
          <View style={styles.quickStat}>
            <MaterialCommunityIcons name="weather-windy" size={20} color={themeColors.textSub} />
            <Text style={styles.quickStatText}>{getWindDirection(current.wind.deg)}</Text>
          </View>
        </View>

        {/* === 逐 3 小時預報 === */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>逐 3 小時預報</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={hourlyForecast}
            keyExtractor={(item) => item.dt.toString()}
            renderItem={({ item }) => (
              <View style={styles.hourlyItem}>
                <Text style={styles.hourlyTime}>{formatTime(item.dt_txt)}</Text>
                <MaterialCommunityIcons 
                  name={getWeatherIcon(item.weather[0].main)} 
                  size={26} 
                  color={themeColors.textMain} 
                  style={{ marginVertical: 6 }}
                />
                <Text style={styles.hourlyTemp}>{Math.round(item.main.temp)}°</Text>
                <Text style={[styles.hourlyPop, item.pop > 0 && { color: themeColors.accentBlue }]}>
                  {Math.round(item.pop * 100)}%
                </Text>
              </View>
            )}
          />
        </View>

        {/* === 週間預報 === */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>一週預報</Text>
          {dailyData.map((item, index) => {
            const isToday = index === 0;
            const displayDate = isToday ? '今天' : item.date.substring(5).replace('-', '/');
            
            return (
              <View key={item.date} style={[styles.dailyItem, index === dailyData.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.dailyDate}>{displayDate}</Text>
                
                <View style={styles.dailyCenter}>
                  <MaterialCommunityIcons name="umbrella" size={14} color={item.pop > 0 ? themeColors.accentBlue : 'transparent'} />
                  <Text style={[styles.dailyPop, item.pop === 0 && { color: 'transparent' }]}>
                    {Math.round(item.pop * 100)}%
                  </Text>
                  <MaterialCommunityIcons name={getWeatherIcon(item.icon)} size={24} color={themeColors.textMain} style={{ marginLeft: 10 }} />
                </View>

                <View style={styles.dailyTempRange}>
                  <Text style={styles.dailyMin}>{Math.round(item.min)}°</Text>
                  <View style={styles.tempBar}></View>
                  <Text style={styles.dailyMax}>{Math.round(item.max)}°</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* === 專業氣象觀測資料 === */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>風速</Text>
            <Text style={styles.detailValue}>{current.wind.speed} <Text style={styles.detailUnit}>m/s</Text></Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>氣壓</Text>
            <Text style={styles.detailValue}>{current.main.pressure} <Text style={styles.detailUnit}>hPa</Text></Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>日出時間</Text>
            <Text style={styles.detailValue}>{formatUnixTime(data.city.sunrise)}</Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>日落時間</Text>
            <Text style={styles.detailValue}>{formatUnixTime(data.city.sunset)}</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: themeColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: themeColors.textMain, marginTop: 10, fontFamily: 'VibePixel' },
  
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center', 
    paddingHorizontal: 15, 
    paddingTop: 10,
    paddingBottom: 15
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, color: themeColors.textMain, fontWeight: 'bold', fontFamily: 'VibePixel', marginLeft: 5 },
  updateTime: { color: themeColors.textSub, fontSize: 12, fontFamily: 'VibePixel' },
  
  scrollContent: { paddingHorizontal: 15, paddingBottom: 40 },
  
  dashboardHero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 15
  },
  heroLeft: { flex: 1 },
  heroTemp: { fontSize: 64, fontWeight: 'bold', color: themeColors.textMain, letterSpacing: -2 },
  heroDesc: { fontSize: 16, color: themeColors.textMain, fontFamily: 'VibePixel', marginTop: -5 },
  
  quickStatsRow: {
    flexDirection: 'row',
    backgroundColor: themeColors.cardBg,
    borderRadius: 15,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  quickStat: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  quickStatText: { color: themeColors.textMain, fontFamily: 'VibePixel', marginLeft: 6, fontSize: 14 },

  cardSection: {
    backgroundColor: themeColors.cardBg,
    borderRadius: 20,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  sectionTitle: {
    color: themeColors.textSub,
    fontSize: 14,
    fontFamily: 'VibePixel',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 8
  },

  hourlyItem: { alignItems: 'center', width: 55 },
  hourlyTime: { color: themeColors.textMain, fontSize: 13, fontFamily: 'VibePixel' },
  hourlyTemp: { color: themeColors.textMain, fontSize: 16, fontWeight: 'bold' },
  hourlyPop: { color: themeColors.textSub, fontSize: 11, marginTop: 4, fontFamily: 'VibePixel' },

  dailyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  dailyDate: { flex: 1.5, color: themeColors.textMain, fontSize: 16, fontFamily: 'VibePixel' },
  dailyCenter: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  dailyPop: { color: themeColors.accentBlue, fontSize: 13, fontFamily: 'VibePixel', marginLeft: 4, width: 35 },
  
  dailyTempRange: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  dailyMin: { color: themeColors.textSub, fontSize: 15, fontWeight: 'bold', width: 25, textAlign: 'right' },
  tempBar: { width: 40, height: 4, backgroundColor: themeColors.accentMain, borderRadius: 2, marginHorizontal: 8, opacity: 0.7 },
  dailyMax: { color: themeColors.textMain, fontSize: 15, fontWeight: 'bold', width: 25, textAlign: 'left' },

  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  detailCard: {
    width: '48%',
    backgroundColor: themeColors.cardBg,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  detailLabel: { color: themeColors.textSub, fontSize: 13, fontFamily: 'VibePixel', marginBottom: 5 },
  detailValue: { color: themeColors.textMain, fontSize: 20, fontWeight: 'bold' },
  detailUnit: { fontSize: 12, color: themeColors.textSub, fontWeight: 'normal' }
});

export default WeatherDetailScreen;