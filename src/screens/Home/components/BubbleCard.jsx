import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors } from '../../../constants/theme';

export default function BubbleCard({ message, onDismiss }) {
  const popAnim = useRef(new Animated.Value(0)).current; 

  const handleClose = () => {
    Animated.timing(popAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  const cardScale = popAnim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [1, 1.05, 0] });
  const cardOpacity = popAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });

  const particles = [...Array(6)].map((_, i) => {
    const angle = (i * Math.PI * 2) / 6;
    const distance = 40; 
    return {
      translateX: popAnim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * distance] }),
      translateY: popAnim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * distance] }),
      scale: popAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1.5, 0] }),
      opacity: popAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] })
    };
  });

  return (
    <View style={styles.bubbleCardWrapper}>
      {particles.map((animStyle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            { transform: [{ translateX: animStyle.translateX }, { translateY: animStyle.translateY }, { scale: animStyle.scale }], opacity: animStyle.opacity }
          ]}
        />
      ))}
      <Animated.View style={[styles.greetingCard, { transform: [{ scale: cardScale }], opacity: cardOpacity }]}>
        <Text style={styles.greetingText}>{message}</Text>
        <TouchableOpacity activeOpacity={0.6} onPress={handleClose} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Ionicons name="close" size={18} color={themeColors.textSub} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleCardWrapper: { alignItems: 'center', justifyContent: 'center' },
  greetingCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 18, 56, 0.75)', 
    paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(233, 243, 251, 0.15)', 
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6,
  },
  greetingText: { color: themeColors.textMain, fontSize: 13, letterSpacing: 0.5, fontFamily: 'VibePixel', marginRight: 12 },
  particle: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: themeColors.accentMain },
});