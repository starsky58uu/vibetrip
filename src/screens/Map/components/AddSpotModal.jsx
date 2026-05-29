import React from 'react';
import {
  Modal, KeyboardAvoidingView, Platform, TouchableOpacity,
  StyleSheet, View, Text, ScrollView, Image, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors, Fonts } from '../../../constants/theme';

export default function AddSpotModal({
  visible, onClose, isLoggedIn,
  editingNote, setEditingNote,
  editingImage, pickImage, saveAndCloseSpot,
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        pointerEvents="box-none"
      >
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>
              {isLoggedIn ? '記錄並準備分享 ✍️' : '本機私密記錄 ✍️'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={28} color={themeColors.textSub} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* 照片區 */}
            <TouchableOpacity style={styles.photoBox} onPress={pickImage} activeOpacity={0.8}>
              {editingImage ? (
                <Image source={{ uri: editingImage }} style={styles.photo} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={40} color={themeColors.textSub} />
                  <Text style={styles.photoHint}>點擊上傳照片</Text>
                </>
              )}
            </TouchableOpacity>

            {/* 備註輸入 */}
            <TextInput
              style={styles.input}
              placeholder="寫下這裡的故事..."
              placeholderTextColor={themeColors.textSub}
              multiline
              value={editingNote}
              onChangeText={setEditingNote}
            />

            {/* 儲存按鈕 */}
            <TouchableOpacity style={styles.saveBtn} onPress={saveAndCloseSpot} activeOpacity={0.8}>
              <Ionicons
                name={isLoggedIn ? 'cloud-upload' : 'save'}
                size={20}
                color={themeColors.textMain}
              />
              <Text style={styles.saveBtnText}>
                {isLoggedIn ? '同步至雲端' : '儲存至手機'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: themeColors.background,
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 25, paddingBottom: 40, paddingTop: 15,
    maxHeight: '80%',
    borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2,
    borderColor: themeColors.border,
  },
  handle: {
    width: 40, height: 5, borderRadius: 3,
    backgroundColor: themeColors.textSub,
    alignSelf: 'center', marginBottom: 15,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  title: { fontFamily: Fonts.serifBold, fontSize: 18, color: themeColors.textMain },

  photoBox: {
    width: '100%', height: 180,
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, borderWidth: 2, borderColor: themeColors.border,
    overflow: 'hidden',
  },
  photo:     { width: '100%', height: '100%', resizeMode: 'cover' },
  photoHint: { fontFamily: Fonts.serif, fontSize: 12, color: themeColors.textSub, marginTop: 8 },

  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    height: 120, borderRadius: 20, padding: 16,
    fontSize: 14, fontFamily: Fonts.serif,
    color: themeColors.textMain, textAlignVertical: 'top',
    borderWidth: 2, borderColor: themeColors.border, marginBottom: 20,
  },

  saveBtn: {
    backgroundColor: themeColors.accentMain,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 20,
    borderWidth: 2, borderColor: themeColors.border,
  },
  saveBtnText: { fontFamily: Fonts.serifBold, color: themeColors.textMain, fontSize: 16 },
});
