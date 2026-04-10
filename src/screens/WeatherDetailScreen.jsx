import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  SafeAreaView, TouchableOpacity 
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const themeColors = {
  background: '#362360',
  textMain: '#E9F3FB',
  accentMain: '#C95E9E',
  border: '#1E1238'
};

const WeatherDetailScreen = ({ route, navigation }) => {
  const { lat, lon, district } = route.params;
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const API_KEY = process.env.OPENWEATHER_API_KEY;
        // 抓取 5天/3小時 預報資料
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=zh_tw&appid=${API_KEY}`;
        const res = await axios.get(url);
        
        // 過濾資料：每天只取中午 12:00 的數據來代表那天的天氣
        const dailyData = res.data.list.filter(item => item.dt_txt.includes("12:00:00"));
        setForecast(dailyData);
      } catch (error) {
        console.error("預報抓取失敗", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const renderWeatherItem = ({ item }) => {
    // 簡單判定圖示
    const main = item.weather[0].main;
    let icon = '☁️';
    if (main === 'Clear') icon = '☀️';
    else if (main === 'Clouds') icon = '⛅';
    else if (main === 'Rain') icon = '🌧️';

    return (
      <View style={styles.weatherCard}>
        <Text style={styles.dateText}>{item.dt_txt.split(' ')[0]}</Text>
        <Text style={styles.iconText}>{icon}</Text>
        <Text style={styles.tempText}>{Math.round(item.main.temp)}°C</Text>
        <Text style={styles.descText}>{item.weather[0].description}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close-circle-outline" size={36} color={themeColors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{district} 未來五日預報</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={themeColors.accentMain} />
        </View>
      ) : (
        <FlatList
          data={forecast}
          renderItem={renderWeatherItem}
          keyExtractor={(item) => item.dt.toString()}
          contentContainerStyle={styles.listPadding}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: themeColors.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    marginTop: 10 
  },
  headerTitle: { 
    fontSize: 22, 
    color: themeColors.textMain, 
    fontWeight: 'bold', 
    marginLeft: 15,
    fontFamily: 'VibePixel' // 延用妳的字體
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listPadding: { padding: 20 },
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(233, 243, 251, 0.1)',
    padding: 20,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: themeColors.border,
    marginBottom: 15,
  },
  dateText: { color: themeColors.textMain, fontSize: 16, fontFamily: 'VibePixel' },
  iconText: { fontSize: 28 },
  tempText: { color: themeColors.accentMain, fontSize: 20, fontWeight: 'bold' },
  descText: { color: themeColors.textSub, fontSize: 14, fontFamily: 'VibePixel' }
});

export default WeatherDetailScreen;