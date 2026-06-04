import React from 'react';
import {
  Modal, KeyboardAvoidingView, Platform, TouchableOpacity,
  StyleSheet, View, Text, ScrollView, Image, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '../../../constants/theme';
import { usePAL } from '../../../context/DimContext';

const PAL = {
  yellow: '#E2E146',
  pink:   '#FF6FA8',
  blue:   '#2E45B0',
  black:  '#000000',
  white:  '#FFFFFF',
};

export default function AddSpotModal({
  visible, onClose, isLoggedIn,
  editingNote, setEditingNote,
  editingImage, pickImage, saveAndCloseSpot,
}) {
  const C = usePAL();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        pointerEvents="box-none"
      >
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: C.white }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={[styles.title, { color: C.black }]}>
              {isLoggedIn ? '記錄並分享' : '本機私密記錄'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={C.black} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* 照片區 — 黃底膠囊風 */}
            <TouchableOpacity
              style={[styles.photoBox, { backgroundColor: C.yellow }]}
              onPress={pickImage} activeOpacity={0.85}
            >
              {editingImage ? (
                <Image source={{ uri: editingImage }} style={styles.photo} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={36} color={C.black} />
                  <Text style={[styles.photoHint, { color: C.black }]}>點擊上傳照片</Text>
                </>
              )}
            </TouchableOpacity>

            {/* 備註輸入 */}
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>記事</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.white, color: C.black }]}
                placeholder="寫下這裡的故事…"
                placeholderTextColor="rgba(0,0,0,0.32)"
                multiline
                value={editingNote}
                onChangeText={setEditingNote}
              />
            </View>

            {/* 儲存按鈕 */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: C.blue }]}
              onPress={saveAndCloseSpot} activeOpacity={0.85}
            >
              <Ionicons
                name={isLoggedIn ? 'cloud-upload-outline' : 'save-outline'}
                size={18}
                color={C.white}
              />
              <Text style={[styles.saveBtnText, { color: C.white }]}>
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
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: PAL.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 22, paddingBottom: 40, paddingTop: 12,
    maxHeight: '85%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignSelf: 'center', marginBottom: 14,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  title: { fontFamily: Fonts.sansBlack, fontSize: 17, color: PAL.black },

  // 照片膠囊
  photoBox: {
    width: '100%', height: 180,
    backgroundColor: PAL.yellow,
    borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    gap: 6,
  },
  photo:     { width: '100%', height: '100%', resizeMode: 'cover' },
  photoHint: { fontFamily: Fonts.sansBold, fontSize: 12, color: PAL.black, letterSpacing: 1 },

  // 輸入膠囊
  inputWrap: { marginBottom: 16 },
  inputLabel: {
    fontFamily: Fonts.sansBlack, fontSize: 11, color: 'rgba(0,0,0,0.5)',
    letterSpacing: 2, marginBottom: 8, marginLeft: 4,
  },
  input: {
    backgroundColor: PAL.white,
    height: 110, borderRadius: 20, padding: 14,
    fontSize: 14, fontFamily: Fonts.sansMed,
    color: PAL.black, textAlignVertical: 'top',
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.12)',
  },

  // 儲存按鈕
  saveBtn: {
    backgroundColor: PAL.blue,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 999,
  },
  saveBtnText: { fontFamily: Fonts.sansBlack, color: PAL.white, fontSize: 15, letterSpacing: 1 },
});
