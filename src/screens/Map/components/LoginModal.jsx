import React from 'react';
import { Modal, KeyboardAvoidingView, Platform, TouchableOpacity, StyleSheet, View, Text, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors } from '../../../constants/theme';

export default function LoginModal({ visible, onClose, username, setUsername, password, setPassword, isLoading, handleLogin }) {
  if (!visible) return null;

  return (
    <Modal visible={true} transparent={true} animationType="fade">
      <KeyboardAvoidingView style={styles.loginOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.loginCard}>
          <TouchableOpacity style={styles.closeLoginBtn} onPress={onClose}>
            <Ionicons name="close" size={28} color={themeColors.textSub} />
          </TouchableOpacity>
          <View style={styles.iconWrapper}>
            <Ionicons name="cloud-upload" size={32} color={themeColors.textMain} />
          </View>
          <Text style={styles.loginTitle}>登入時光膠囊</Text>
          <Text style={styles.loginSubtitle}>備份足跡，解鎖社群分享與收藏功能</Text>
          
          <TextInput 
            style={styles.input} 
            placeholder="帳號" 
            placeholderTextColor={themeColors.textSub} 
            value={username} 
            onChangeText={setUsername} 
            autoCapitalize="none" 
          />
          <TextInput 
            style={styles.input} 
            placeholder="密碼" 
            placeholderTextColor={themeColors.textSub} 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry 
          />
          
          <TouchableOpacity style={styles.loginSubmitBtn} onPress={handleLogin} activeOpacity={0.8}>
            {isLoading ? <ActivityIndicator color={themeColors.textMain} /> : <Text style={styles.loginSubmitBtnText}>登入 / 註冊</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  loginOverlay: { flex: 1, backgroundColor: 'rgba(30, 18, 56, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  loginCard: { width: '100%', backgroundColor: themeColors.background, borderRadius: 24, borderWidth: 2, borderColor: themeColors.accentSub, padding: 25, alignItems: 'center' },
  closeLoginBtn: { position: 'absolute', top: 15, right: 15, zIndex: 1 },
  iconWrapper: { backgroundColor: themeColors.accentSub, width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: themeColors.border, marginBottom: 15, marginTop: -50 },
  loginTitle: { fontFamily: 'VibePixel', fontSize: 20, color: themeColors.textMain, marginBottom: 8 },
  loginSubtitle: { fontFamily: 'VibePixel', fontSize: 11, color: themeColors.textSub, marginBottom: 25, textAlign: 'center' },
  input: { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, borderColor: themeColors.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, fontFamily: 'VibePixel', color: themeColors.textMain, marginBottom: 15 },
  loginSubmitBtn: { width: '100%', backgroundColor: themeColors.accentMain, paddingVertical: 15, borderRadius: 16, borderWidth: 2, borderColor: themeColors.border, alignItems: 'center', marginTop: 10 },
  loginSubmitBtnText: { fontFamily: 'VibePixel', fontSize: 16, color: themeColors.textMain },
});