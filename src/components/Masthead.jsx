import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { T, Fonts } from '../constants/theme';

const DAY_ZH = ['日', '月', '火', '水', '木', '金', '土'];

// 4 個 tab 對應的 metadata（順序＝色順序）
const TAB_META = [
  { id: 'Home',    en: 'HOME' },
  { id: 'Trip',    en: 'TRIP' },
  { id: 'Explore', en: 'EXPLORE' },
  { id: 'Profile', en: 'ME' },
];

function getDateStr() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${m} / ${d} · ${DAY_ZH[now.getDay()]}`;
}

/**
 * 編輯雜誌風刊頭：VibeTrip + tab 對應色點 + tab 英文名 / 日期 + 頁碼 01/04
 * @param {string} tabName  - 目前 tab 的 name（'Home' | 'Trip' | 'Explore' | 'Profile'）
 * @param {object} colors   - 主題色（含 cRed/cYellow/cBlue/cGreen）
 */
export default function Masthead({ tabName = 'Home', colors }) {
  const C = colors ?? T;
  const TAB_COLORS = [C.cRed, C.cYellow, C.cBlue, C.cGreen];
  const idx = Math.max(0, TAB_META.findIndex(t => t.id === tabName));
  const meta = TAB_META[idx];
  const c    = TAB_COLORS[idx];

  return (
    <View style={[styles.header, { borderBottomColor: C.ink, backgroundColor: C.paper }]}>
      {/* 左：logo + 色點 + tab 英文名 */}
      <View style={styles.left}>
        <Text style={[styles.logo, { color: C.ink }]}>VibeTrip</Text>
        <View style={[styles.dot, { backgroundColor: c }]} />
        <Text style={[styles.tabName, { color: C.ink }]}>{meta.en}</Text>
      </View>

      {/* 右：日期 + 頁碼 */}
      <View style={styles.right}>
        <Text style={[styles.date, { color: C.ink3 }]}>{getDateStr()}</Text>
        <Text style={styles.pageNum}>
          <Text style={{ color: c, fontWeight: '700' }}>0{idx + 1}</Text>
          <Text style={{ color: C.ink3 }}>/0{TAB_META.length}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    // 黑體 800（系統字），編輯感
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  dot: {
    width: 5,
    height: 5,
  },
  tabName: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 2.5,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  date: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  pageNum: {
    fontFamily: Fonts.latinMed,
    fontSize: 13,
    letterSpacing: -0.4,
  },
});
