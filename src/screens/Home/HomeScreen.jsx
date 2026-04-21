import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Fonts } from '../../constants/theme';
import { VIBES } from '../../data/vibeData';
import VibeIcon from '../../components/VibeIcon';
import WeatherIcon from '../../components/WeatherIcon';
import Masthead from '../../components/Masthead';
import useWeather, { owmIconToKind, vibeTag } from '../../hooks/useWeather';
import { useTheme } from '../../context/ThemeContext';

export default function HomeScreen() {
  const navigation  = useNavigation();
  const insets      = useSafeAreaInsets();
  const { colors, vibeStyle } = useTheme();
  const [selectedVibe, setSelectedVibe] = useState(null);
  const { current, loading: weatherLoading } = useWeather();

  const handleGenerate = () => {
    if (!selectedVibe) return;
    navigation.navigate('Trip', { screen: 'TripMain', params: { vibeKey: selectedVibe } });
  };

  const selected = VIBES.find(v => v.key === selectedVibe);

  const now      = new Date();
  const hhmm     = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const chipKind  = current ? owmIconToKind(current.icon) : 'partly';
  const chipTitle = current
    ? `${current.district ?? '目前位置'} · ${current.description}`
    : '天氣讀取中…';
  const chipSub   = current
    ? `${Math.round(current.temperature)}°C / ${hhmm} / 濕度 ${current.humidity}%`
    : '— ';
  const chipTag   = current ? vibeTag(current.condition, now.getHours()) : '載入中';

  const s = makeStyles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <Masthead onMenuPress={() => navigation.navigate('Profile', { screen: 'ProfileMain' })} colors={colors} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Weather chip */}
        <TouchableOpacity
          style={s.weatherChip}
          onPress={() => navigation.navigate('Profile', { screen: 'Weather' })}
          activeOpacity={0.8}
        >
          <View style={s.weatherIcon}>
            <WeatherIcon kind={chipKind} size={24} color={colors.ink2} />
          </View>
          <View style={s.weatherText}>
            <Text style={s.weatherTitle}>{chipTitle}</Text>
            <Text style={s.weatherSub}>{chipSub}</Text>
          </View>
          <Text style={s.weatherTag}>{chipTag}</Text>
        </TouchableOpacity>

        {/* Heading */}
        <View style={s.heading}>
          <Text style={s.headingLabel}>WHAT'S YOUR VIBE</Text>
          <Text style={s.headingH1}>
            接下來{' '}
            <Text style={s.headingAccent}>三小時</Text>，
          </Text>
          <Text style={s.headingH1}>你想要什麼樣的漫遊？</Text>
        </View>

        {/* Vibe grid — style controlled by ThemeContext */}
        <VibeGrid
          style={vibeStyle}
          colors={colors}
          selected={selectedVibe}
          onSelect={setSelectedVibe}
        />

        {/* CTA */}
        <TouchableOpacity
          onPress={handleGenerate}
          activeOpacity={selectedVibe ? 0.8 : 1}
          style={[s.cta, !selectedVibe && s.ctaDisabled]}
        >
          <Text style={s.ctaText}>
            {selected ? `生成「${selected.zh}」行程` : '先挑一個 vibe ——'}
          </Text>
          {selectedVibe && <ArrowSvg color={colors.paper} />}
        </TouchableOpacity>
        <Text style={s.ctaSub}>✧ CONTEXT-AWARE · ON-THE-FLY ✧</Text>
      </ScrollView>
    </View>
  );
}

// ─── Vibe Grid — three presentation modes ────────────────────────────────────

function VibeGrid({ style = 'card', colors, selected, onSelect }) {
  if (style === 'circle') return <VibeCircle colors={colors} selected={selected} onSelect={onSelect} />;
  if (style === 'stamp')  return <VibeStamp  colors={colors} selected={selected} onSelect={onSelect} />;
  return                         <VibeCard   colors={colors} selected={selected} onSelect={onSelect} />;
}

/** 2-column rectangular card tiles (default) */
function VibeCard({ colors, selected, onSelect }) {
  return (
    <View style={cs.cardGrid}>
      {VIBES.map((v, i) => {
        const isActive = selected === v.key;
        return (
          <TouchableOpacity
            key={v.key}
            onPress={() => onSelect(v.key)}
            activeOpacity={0.7}
            style={[
              cs.cardTile,
              { borderColor: isActive ? v.accent : colors.line, borderWidth: isActive ? 1.5 : 1 },
              i === 6 && cs.cardTileFull,
              isActive && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
              !isActive && { backgroundColor: 'transparent' },
            ]}
          >
            <View style={[
              cs.cardIcon,
              { backgroundColor: isActive ? v.accent : colors.paper2 },
            ]}>
              <VibeIcon kind={v.icon} size={22} color={isActive ? colors.paper : v.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[cs.cardZh, { color: colors.ink }]}>{v.zh}</Text>
              <Text style={[cs.cardEn, { color: colors.ink3 }]}>{v.en}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** 4-column circle icon grid */
function VibeCircle({ colors, selected, onSelect }) {
  return (
    <View style={cs.circleGrid}>
      {VIBES.map(v => {
        const isActive = selected === v.key;
        return (
          <TouchableOpacity
            key={v.key}
            onPress={() => onSelect(v.key)}
            activeOpacity={0.7}
            style={cs.circleTile}
          >
            <View style={[
              cs.circleIcon,
              {
                backgroundColor: isActive ? v.accent : colors.card,
                borderColor: isActive ? v.accent : colors.line,
                shadowColor: isActive ? v.accent : 'transparent',
                shadowOpacity: isActive ? 0.35 : 0,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: isActive ? 3 : 0,
                transform: [{ scale: isActive ? 1.05 : 1 }],
              },
            ]}>
              <VibeIcon
                kind={v.icon}
                size={30}
                color={isActive ? colors.paper : colors.ink2}
              />
            </View>
            <Text style={[
              cs.circleLabel,
              { color: isActive ? colors.ink : colors.ink3, fontWeight: isActive ? '600' : '400' },
            ]}>
              {v.zh}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** 3-column dashed stamp tiles */
function VibeStamp({ colors, selected, onSelect }) {
  const ROTATIONS = [-1, 0.8, -0.4, 1, -0.7, 0.3, -0.2];
  return (
    <View style={cs.stampGrid}>
      {VIBES.map((v, i) => {
        const isActive = selected === v.key;
        return (
          <TouchableOpacity
            key={v.key}
            onPress={() => onSelect(v.key)}
            activeOpacity={0.7}
            style={[
              cs.stampTile,
              {
                borderColor: isActive ? v.accent : colors.line,
                borderWidth: isActive ? 1.5 : 1,
                borderStyle: 'dashed',
                backgroundColor: isActive ? colors.paper2 : 'transparent',
                transform: [{ rotate: `${ROTATIONS[i] ?? 0}deg` }],
              },
            ]}
          >
            {isActive && (
              <View style={[cs.stampBadge, { borderColor: colors.stamp, backgroundColor: colors.paper }]}>
                <Text style={[cs.stampBadgeText, { color: colors.stamp }]}>選</Text>
              </View>
            )}
            <VibeIcon
              kind={v.icon}
              size={24}
              color={isActive ? v.accent : colors.ink2}
            />
            <Text style={[cs.stampLabel, { color: isActive ? v.accent : colors.ink2 }]}>
              {v.zh}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Inline SVG arrow ────────────────────────────────────────────────────────

function ArrowSvg({ color }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Static card / circle / stamp styles (no color) ──────────────────────────

const cs = StyleSheet.create({
  // card
  cardGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  cardTile:     { width: '47.5%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16 },
  cardTileFull: { width: '100%' },
  cardIcon:     { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardZh:       { fontFamily: Fonts.serifBold, fontSize: 13, lineHeight: 18 },
  cardEn:       { fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 1.5, marginTop: 2 },

  // circle
  circleGrid:   { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  circleTile:   { width: '25%', alignItems: 'center', paddingVertical: 10, gap: 6 },
  circleIcon:   { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  circleLabel:  { fontFamily: Fonts.serif, fontSize: 11 },

  // stamp
  stampGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  stampTile:    { width: '31%', padding: 14, borderRadius: 2, alignItems: 'center', gap: 6, position: 'relative' },
  stampBadge:   {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  stampBadgeText: { fontFamily: Fonts.serifBold, fontSize: 9 },
  stampLabel:   { fontFamily: Fonts.serif, fontSize: 12 },
});

// ─── Dynamic styles (depend on colors) ───────────────────────────────────────

function makeStyles(C) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.paper },

    marginText: {
      position: 'absolute',
      right: 14,
      top: 80,
      fontFamily: Fonts.serif,
      color: C.ink4,
      fontSize: 10,
      letterSpacing: 8,
      opacity: 0.45,
      transform: [{ rotate: '90deg' }, { translateX: 60 }, { translateY: -60 }],
    },

    scroll:        { flex: 1 },
    scrollContent: { padding: 20, paddingTop: 10, paddingBottom: 30 },

    // Weather chip
    weatherChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: 18,
      padding: 12,
      marginBottom: 28,
    },
    weatherIcon: {
      width: 42, height: 42, borderRadius: 12,
      backgroundColor: '#F3DCB2',
      alignItems: 'center', justifyContent: 'center',
    },
    weatherText: { flex: 1 },
    weatherTitle: { fontFamily: Fonts.serifBold, fontSize: 14, color: C.ink },
    weatherSub:   { fontFamily: Fonts.mono,      fontSize: 10, color: C.ink3, marginTop: 2 },
    weatherTag:   { fontFamily: Fonts.latinItalic, fontSize: 12, color: C.tea },

    // Heading
    heading:      { marginBottom: 22 },
    headingLabel: { fontFamily: Fonts.mono, fontSize: 10, color: C.ink3, letterSpacing: 4, marginBottom: 6 },
    headingH1:    { fontFamily: Fonts.serifBold, fontSize: 28, color: C.ink, lineHeight: 36 },
    headingAccent:{ fontFamily: Fonts.latinItalic, color: C.accent, fontSize: 28 },

    // CTA
    cta:         { backgroundColor: C.ink, borderRadius: 100, padding: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 8 },
    ctaDisabled: { backgroundColor: C.ink4 },
    ctaText:     { fontFamily: Fonts.latinItalic, fontSize: 16, color: C.paper, letterSpacing: 0.5 },
    ctaSub:      { fontFamily: Fonts.mono, fontSize: 9, color: C.ink4, letterSpacing: 4, textAlign: 'center', marginTop: 4 },
  });
}
