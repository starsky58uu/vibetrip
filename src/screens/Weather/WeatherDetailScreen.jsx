import React from 'react';
import { 
  View, Text, StyleSheet, ActivityIndicator, 
  TouchableOpacity, ScrollView, FlatList 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { themeColors as T } from '../../constants/theme';
import { getWindDirection, getWeatherIcon, formatTime, formatUnixTime } from './utils/helpers';
import { useWeatherForecast } from './hooks/useWeatherForecast';

const WeatherDetailScreen = ({ route, navigation }) => {
  const { lat, lon, district } = route.params;
  
  const { data, dailyData, loading } = useWeatherForecast(lat, lon);

  if (loading || !data) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.accentMain} />
          <Text style={styles.loadingText}>連線氣象資料中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const current = data.list[0];
  const hourlyForecast = data.list.slice(0, 8);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={T.textMain} />
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
            name={getWeatherIcon(current.weather[0].main)} size={70} color={T.textMain} 
          />
        </View>

        {/* 重點數據橫條 */}
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStat}>
            <Ionicons name="umbrella-outline" size={20} color={T.accentBlue} />
            <Text style={styles.quickStatText}>{Math.round(current.pop * 100)}%</Text>
          </View>
          <View style={styles.quickStat}>
            <Ionicons name="water-outline" size={20} color={T.textSub} />
            <Text style={styles.quickStatText}>{current.main.humidity}%</Text>
          </View>
          <View style={styles.quickStat}>
            <MaterialCommunityIcons name="weather-windy" size={20} color={T.textSub} />
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
                  name={getWeatherIcon(item.weather[0].main)} size={26} color={T.textMain} style={{ marginVertical: 6 }}
                />
                <Text style={styles.hourlyTemp}>{Math.round(item.main.temp)}°</Text>
                <Text style={[styles.hourlyPop, item.pop > 0 && { color: T.accentBlue }]}>
                  {Math.round(item.pop * 100)}%
                </Text>
              </View>
            )}
          />
        </View>

        {/* === 一週預報 === */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>一週預報</Text>
          {dailyData.map((item, index) => {
            const isToday = index === 0;
            const displayDate = isToday ? '今天' : item.date.substring(5).replace('-', '/');
            
            return (
              <View key={item.date} style={[styles.dailyItem, index === dailyData.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.dailyDate}>{displayDate}</Text>
                <View style={styles.dailyCenter}>
                  <MaterialCommunityIcons name="umbrella" size={14} color={item.pop > 0 ? T.accentBlue : 'transparent'} />
                  <Text style={[styles.dailyPop, item.pop === 0 && { color: 'transparent' }]}>
                    {Math.round(item.pop * 100)}%
                  </Text>
                  <MaterialCommunityIcons name={getWeatherIcon(item.icon)} size={24} color={T.textMain} style={{ marginLeft: 10 }} />
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
  safeContainer: { flex: 1, backgroundColor: T.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: T.textMain, marginTop: 10, fontFamily: 'VibePixel' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: 10, paddingBottom: 15 },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, color: T.textMain, fontWeight: 'bold', fontFamily: 'VibePixel', marginLeft: 5 },
  updateTime: { color: T.textSub, fontSize: 12, fontFamily: 'VibePixel' },
  scrollContent: { paddingHorizontal: 15, paddingBottom: 40 },
  dashboardHero: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, marginBottom: 15 },
  heroLeft: { flex: 1 },
  heroTemp: { fontSize: 64, fontWeight: 'bold', color: T.textMain, letterSpacing: -2 },
  heroDesc: { fontSize: 16, color: T.textMain, fontFamily: 'VibePixel', marginTop: -5 },
  quickStatsRow: { flexDirection: 'row', backgroundColor: T.cardBg, borderRadius: 15, paddingVertical: 12, marginBottom: 20, borderWidth: 1, borderColor: T.border },
  quickStat: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  quickStatText: { color: T.textMain, fontFamily: 'VibePixel', marginLeft: 6, fontSize: 14 },
  cardSection: { backgroundColor: T.cardBg, borderRadius: 20, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: T.border },
  sectionTitle: { color: T.textSub, fontSize: 14, fontFamily: 'VibePixel', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 8 },
  hourlyItem: { alignItems: 'center', width: 55 },
  hourlyTime: { color: T.textMain, fontSize: 13, fontFamily: 'VibePixel' },
  hourlyTemp: { color: T.textMain, fontSize: 16, fontWeight: 'bold' },
  hourlyPop: { color: T.textSub, fontSize: 11, marginTop: 4, fontFamily: 'VibePixel' },
  dailyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  dailyDate: { flex: 1.5, color: T.textMain, fontSize: 16, fontFamily: 'VibePixel' },
  dailyCenter: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  dailyPop: { color: T.accentBlue, fontSize: 13, fontFamily: 'VibePixel', marginLeft: 4, width: 35 },
  dailyTempRange: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  dailyMin: { color: T.textSub, fontSize: 15, fontWeight: 'bold', width: 25, textAlign: 'right' },
  tempBar: { width: 40, height: 4, backgroundColor: T.accentMain, borderRadius: 2, marginHorizontal: 8, opacity: 0.7 },
  dailyMax: { color: T.textMain, fontSize: 15, fontWeight: 'bold', width: 25, textAlign: 'left' },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  detailCard: { width: '48%', backgroundColor: T.cardBg, borderRadius: 15, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: T.border },
  detailLabel: { color: T.textSub, fontSize: 13, fontFamily: 'VibePixel', marginBottom: 5 },
  detailValue: { color: T.textMain, fontSize: 20, fontWeight: 'bold' },
  detailUnit: { fontSize: 12, color: T.textSub, fontWeight: 'normal' }
});

export default WeatherDetailScreen;