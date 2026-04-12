import React from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  SafeAreaView, TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// 模組化引入
import { themeColors } from '../../constants/theme';
import { useWeatherForecast } from './hooks/useWeatherForecast';

const WeatherDetailScreen = ({ route, navigation }) => {
  const { lat, lon, district } = route.params || {};
  
  // 透過 Hook 拿到處理好的乾淨資料
  const { forecast, loading } = useWeatherForecast(lat, lon);

  const renderWeatherItem = ({ item }) => (
    <View style={styles.weatherCard}>
      <Text style={styles.dateText}>{item.date}</Text>
      <Text style={styles.iconText}>{item.icon}</Text>
      <Text style={styles.tempText}>{item.temp}°C</Text>
      <Text style={styles.descText}>{item.desc}</Text>
    </View>
  );

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
          keyExtractor={(item) => item.id}
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
    fontFamily: 'VibePixel'
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