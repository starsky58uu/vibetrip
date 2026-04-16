import React from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBlindBoxLogic } from './hooks/useBlindBoxLogic'; 

const { width } = Dimensions.get('window');

const themeColors = {
  background: '#362360', 
  textMain: '#E9F3FB',   
  textSub: '#84A6D3',    
  accentMain: '#C95E9E', 
  accentSub: '#C3AED9',  
};

const ResultScreen = ({ route, navigation }) => {
  // 透過 Hook 取得所有狀態與函式
  const { 
    currentTime, 
    currentPlan, 
    headerData, 
    fadeAnim, 
    handleReshuffle 
  } = useBlindBoxLogic(route);

  return (
    <View style={styles.container}>

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
                    <Ionicons name={item.icon} size={22} color="#362360" />
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
            style={styles.reshuffleButton} 
            activeOpacity={0.8}
            onPress={handleReshuffle} 
          >
            <Ionicons name="refresh" size={20} color={themeColors.textMain} />
            <Text style={styles.reshuffleButtonText}>再抽一次驚喜盲盒</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.arButton} 
            activeOpacity={0.9}
            onPress={() => navigation.navigate('AR')}
          >
            <Ionicons name="scan" size={22} color="#362360" />
            <Text style={styles.arButtonText}>開啟 AR 實境導航</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: themeColors.background, paddingTop: 60 },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#E9F3FB', 
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 14, marginLeft: 24, alignSelf: 'flex-start',
    borderWidth: 2.5, borderColor: '#1E1238', shadowColor: themeColors.accentMain, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
    zIndex: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: themeColors.accentMain, marginRight: 8 },
  headerText: { fontFamily: 'VibePixel', color: '#362360', fontSize: 12 },
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
    borderWidth: 2, borderColor: '#1E1238', zIndex: 2,
  },
  timeText: { fontFamily: 'VibePixel', fontSize: 11, color: '#362360' },
  eventCard: {
    flex: 1, marginLeft: 15, borderRadius: 24, padding: 16,
    borderWidth: 2.5, borderColor: '#1E1238',
    shadowColor: '#1E1238', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  activityTitle: { fontFamily: 'VibePixel', fontSize: 16, color: '#362360', marginLeft: 8 },
  activityDesc: { fontFamily: 'VibePixel', fontSize: 12, color: 'rgba(54, 35, 96, 0.8)', lineHeight: 18 },
  shakeHintContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 25, marginBottom: 15 },
  shakeText: { fontFamily: 'VibePixel', fontSize: 13, color: themeColors.textSub, marginLeft: 10 },
  arButton: {
    backgroundColor: themeColors.accentMain, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, borderRadius: 16, gap: 10,
    borderWidth: 2.5, borderColor: '#1E1238',
    shadowColor: themeColors.textMain, shadowOffset: { width: 5, height: 5 }, shadowOpacity: 1, shadowRadius: 0,
  },
  reshuffleButton: {
    backgroundColor: 'rgba(201, 94, 158, 0.2)', 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 16, marginBottom: 15, 
    borderWidth: 2, borderColor: themeColors.accentMain, borderStyle: 'dashed', 
  },
  reshuffleButtonText: { fontFamily: 'VibePixel', fontSize: 16, color: themeColors.textMain, marginLeft: 8 },
});

export default ResultScreen;