import React from 'react'; 
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// 模組化引入
import { themeColors } from '../../constants/theme';
import { useBlindBoxLogic } from './hooks/useBlindBoxLogic';

const ResultScreen = ({ route, navigation }) => {
  const { currentPlan, fadeAnim } = useBlindBoxLogic(route.params);

  return (
    <View style={styles.container}>
      <View style={styles.headerBadge}>
        <View style={styles.dot} />
        <Text style={styles.headerText}>大安區 · 偵測搖晃中 · ☁️ 22℃</Text>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.pageTitle}>{currentPlan.title}</Text>

          <View style={styles.glassPanel}>
            <View style={styles.timelineLine} />
            {currentPlan.items && currentPlan.items.map((item, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={[styles.timeMarker, { backgroundColor: item.color }]}>
                  <Text style={styles.timeText}>{item.time}</Text>
                </View>
                <View style={[styles.eventCard, { backgroundColor: item.color }]}>
                  <View style={styles.cardHeader}>
                    <Ionicons name={item.icon} size={22} color={themeColors.background} />
                    <Text style={styles.activityTitle}>{item.activity}</Text>
                  </View>
                  <Text style={styles.activityDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.shakeHintContainer}>
            <Ionicons name="phone-portrait-outline" size={24} color={themeColors.accentSub} />
            <Text style={styles.shakeText}>不滿意？搖一搖手機重新抽取！</Text>
          </View>

          <TouchableOpacity 
            style={styles.arButton} 
            activeOpacity={0.9}
            onPress={() => navigation.navigate('AR')}
          >
            <Ionicons name="scan" size={22} color={themeColors.background} />
            <Text style={styles.arButtonText}>開啟 AR 實境導航</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

// 樣式大掃除：所有寫死的 '#362360', '#1E1238' 全部替換成 themeColors
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: themeColors.background, paddingTop: 60 },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: themeColors.textMain, 
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 14, marginLeft: 24, alignSelf: 'flex-start',
    borderWidth: 2.5, borderColor: themeColors.border, shadowColor: themeColors.accentMain, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
    zIndex: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: themeColors.accentMain, marginRight: 8 },
  headerText: { fontFamily: 'VibePixel', color: themeColors.background, fontSize: 12 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 120 },
  pageTitle: { 
    fontFamily: 'VibePixel', fontSize: 24, color: themeColors.textMain, 
    marginBottom: 25, marginLeft: 10,
    textShadowColor: themeColors.accentMain, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 
  },
  glassPanel: {
    backgroundColor: 'rgba(54, 35, 96, 0.65)', 
    borderRadius: 40, padding: 20,
    borderWidth: 2, borderColor: 'rgba(233, 243, 251, 0.15)',
  },
  timelineLine: {
    position: 'absolute', left: 42, top: 40, bottom: 40,
    width: 3, backgroundColor: 'rgba(233, 243, 251, 0.2)', borderRadius: 2,
  },
  timelineItem: { flexDirection: 'row', marginBottom: 30, alignItems: 'flex-start' },
  timeMarker: {
    width: 60, paddingVertical: 5, borderRadius: 10, alignItems: 'center',
    borderWidth: 2, borderColor: themeColors.border, zIndex: 2,
  },
  timeText: { fontFamily: 'VibePixel', fontSize: 11, color: themeColors.background },
  eventCard: {
    flex: 1, marginLeft: 15, borderRadius: 24, padding: 16,
    borderWidth: 2.5, borderColor: themeColors.border,
    shadowColor: themeColors.border, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  activityTitle: { fontFamily: 'VibePixel', fontSize: 16, color: themeColors.background, marginLeft: 8 },
  activityDesc: { fontFamily: 'VibePixel', fontSize: 12, color: 'rgba(54, 35, 96, 0.8)', lineHeight: 18 },
  shakeHintContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 25, marginBottom: 15 },
  shakeText: { fontFamily: 'VibePixel', fontSize: 13, color: themeColors.textSub, marginLeft: 10 },
  arButton: {
    backgroundColor: themeColors.accentMain, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, borderRadius: 16, gap: 10,
    borderWidth: 2.5, borderColor: themeColors.border,
    shadowColor: themeColors.textMain, shadowOffset: { width: 5, height: 5 }, shadowOpacity: 1, shadowRadius: 0,
  },
  arButtonText: { fontFamily: 'VibePixel', fontSize: 17, color: themeColors.background },
});

export default ResultScreen;