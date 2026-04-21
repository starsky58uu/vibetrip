import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { T, Fonts } from '../constants/theme';

const DAY_ZH = ['日', '月', '火', '水', '木', '金', '土'];

function getDateStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y} · ${m} · ${d} · ${DAY_ZH[now.getDay()]}`;
}

/**
 * Magazine-style masthead bar.
 * @param {Function} onMenuPress  - called when the hamburger icon is tapped
 * @param {object}   colors       - optional theme colour override (falls back to T)
 */
export default function Masthead({ onMenuPress, colors }) {
  const C = colors ?? T;

  return (
    <View style={[styles.header, { borderBottomColor: C.line }]}>
      <View style={styles.headerLeft}>
        <Text style={[styles.headerLogo, { color: C.ink }]}>VibeTrip</Text>
        <Text style={[styles.headerNum,  { color: C.ink3 }]}>NO.247</Text>
      </View>
      <Text style={[styles.headerDate, { color: C.ink3 }]}>{getDateStr()}</Text>
      <TouchableOpacity
        style={[styles.headerBtn, { borderColor: C.line }]}
        onPress={onMenuPress}
        activeOpacity={0.7}
      >
        <Ionicons name="reorder-three-outline" size={18} color={C.accent} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
  },
  headerLogo: {
    fontFamily: Fonts.latin,
    fontSize: 18,
  },
  headerNum: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
  },
  headerDate: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  headerBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});
