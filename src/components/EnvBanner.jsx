import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { envBannerLabel, shouldShowEnvBanner } from '../config/env';

/** 非 production 或連本機 API 時顯示小標籤，避免搞混環境 */
export default function EnvBanner() {
  const insets = useSafeAreaInsets();

  if (!shouldShowEnvBanner()) return null;

  return (
    <View style={[styles.wrap, { top: insets.top }]}>
      <Text style={styles.text} numberOfLines={1}>
        {envBannerLabel()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  text: {
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.65)',
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    maxWidth: '92%',
  },
});
