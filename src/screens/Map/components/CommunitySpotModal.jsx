import React from 'react';
import { Modal, KeyboardAvoidingView, Platform, TouchableOpacity, StyleSheet, View, Text, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors } from '../../../constants/theme';

export default function CommunitySpotModal({ visible, spot, onClose, onToggleLike, onToggleSave }) {
  if (!visible || !spot) return null;

  return (
    <Modal visible={true} transparent={true} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.bottomSheetOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} pointerEvents="box-none">
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <View style={styles.bottomSheet}>
          <View style={styles.dragHandle} />
          
          <View style={styles.threadHeader}>
            <View style={styles.threadAuthorRow}>
              <Image source={{ uri: spot.author.avatar }} style={styles.threadAvatar} />
              <View>
                <Text style={styles.threadAuthorName}>{spot.author.name}</Text>
                <Text style={styles.threadTime}>{spot.timeAgo}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={28} color={themeColors.textSub} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.threadContent}>{spot.content}</Text>
            
            {spot.image && (
              <TouchableOpacity activeOpacity={0.9} onPress={() => onToggleLike(spot.id)}>
                <Image source={{ uri: spot.image }} style={styles.threadImage} />
              </TouchableOpacity>
            )}
            
            <View style={styles.threadActionRow}>
              <TouchableOpacity style={styles.threadActionBtn} onPress={() => onToggleLike(spot.id)}>
                <Ionicons name={spot.isLiked ? "heart" : "heart-outline"} size={26} color={spot.isLiked ? themeColors.accentMain : themeColors.textMain} />
                <Text style={[styles.threadActionText, spot.isLiked && { color: themeColors.accentMain }]}>{spot.likes}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.threadActionBtn}>
                <Ionicons name="chatbubble-outline" size={24} color={themeColors.textMain} />
                <Text style={styles.threadActionText}>{spot.replies}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, spot.isSaved && { backgroundColor: themeColors.background, borderColor: themeColors.accentMain }]} 
              onPress={() => onToggleSave(spot.id)} activeOpacity={0.8}
            >
              <Ionicons name={spot.isSaved ? "heart" : "bookmark-outline"} size={20} color={spot.isSaved ? themeColors.accentMain : themeColors.textMain} />
              <Text style={[styles.saveBtnText, spot.isSaved && { color: themeColors.accentMain }]}>
                {spot.isSaved ? "已收藏至我的足跡 ❤️" : "收藏行程至我的足跡"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bottomSheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  bottomSheet: { backgroundColor: themeColors.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 25, paddingBottom: 40, paddingTop: 15, maxHeight: '80%', borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: themeColors.border, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.3, shadowRadius: 10 },
  dragHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: themeColors.textSub, alignSelf: 'center', marginBottom: 15 },
  threadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  threadAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  threadAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: themeColors.accentMain },
  threadAuthorName: { fontFamily: 'VibePixel', fontSize: 16, color: themeColors.textMain, marginBottom: 2 },
  threadTime: { fontFamily: 'VibePixel', fontSize: 12, color: themeColors.textSub },
  threadContent: { fontFamily: 'VibePixel', fontSize: 15, color: themeColors.textMain, lineHeight: 22, marginBottom: 15 },
  threadImage: { width: '100%', height: 220, borderRadius: 16, marginBottom: 15, backgroundColor: themeColors.border, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  threadActionRow: { flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 25, paddingHorizontal: 5 },
  threadActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  threadActionText: { fontFamily: 'VibePixel', fontSize: 15, color: themeColors.textSub },
  saveBtn: { backgroundColor: themeColors.accentMain, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 16, borderRadius: 20, borderWidth: 2, borderColor: themeColors.border },
  saveBtnText: { fontFamily: 'VibePixel', color: themeColors.textMain, fontSize: 16, marginTop: 2 },
});