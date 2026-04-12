import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Modal, Image, ScrollView, Dimensions
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const themeColors = {
  background: '#362360',
  textMain: '#E9F3FB',
  accentMain: '#C95E9E',
  accentSub: '#C3AED9',
  textSub: '#84A6D3',
  border: '#1E1238',
  panel: 'rgba(54, 35, 96, 0.65)',
};

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1E1238" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#84A6D3" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1E1238" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#A0B6D3" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#9B4A7B" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#241842" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#362360" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1E1238" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#5C6B89" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#140B29" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4A5D7A" }] }
];

const DUMMY_COMMUNITY_SPOTS = [
  {
    id: 'c1', lat: 25.0330, lng: 121.5654,
    author: { name: 'Moxi_0508', avatar: 'https://i.pravatar.cc/150?img=47' },
    timeAgo: '2h',
    content: '考完試去吃了一碗濃郁的雞白湯拉麵，再找間不限時咖啡廳寫 Code，今天大安區的行程給過 ✨',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=600&auto=format&fit=crop',
    likes: 128, replies: 12, isLiked: false, isSaved: false, isViewed: false,
  },
  {
    id: 'c2', lat: 25.0422, lng: 121.5478,
    author: { name: 'Cyber_Traveler', avatar: 'https://i.pravatar.cc/150?img=11' },
    timeAgo: '5h',
    content: '九份夜拍秘境真的太扯了，不用去象山人擠人。',
    image: 'https://images.unsplash.com/photo-1498503182468-3b51cbb6cb24?q=80&w=600&auto=format&fit=crop',
    likes: 85, replies: 4, isLiked: false, isSaved: false, isViewed: false, 
  }
];

const MapScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [mapMode, setMapMode] = useState('explore'); 
  const [mySpots, setMySpots] = useState([]); 
  const [communitySpots, setCommunitySpots] = useState(DUMMY_COMMUNITY_SPOTS);

  const [selectedSpot, setSelectedSpot] = useState(null); 
  const [selectedCommunitySpot, setSelectedCommunitySpot] = useState(null); 

  const [editingNote, setEditingNote] = useState(''); 
  const [editingImage, setEditingImage] = useState(null); 
  const [userLocation, setUserLocation] = useState(null);

  const mapRef = useRef(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.03,  
        longitudeDelta: 0.03,
      };
      setUserLocation(coords);
      if (mapRef.current) mapRef.current.animateToRegion(coords, 1000);
    })();
  }, []);

  const goToUserLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(userLocation, 1000);
    }
  };

  const handleMapLongPress = (e) => {
    if (mapMode !== 'personal') {
      alert('請先切換到「我的足跡」模式才能新增打卡點喔！');
      return;
    }
    const newCoordinate = e.nativeEvent.coordinate;
    const newSpot = {
      id: Date.now().toString(), lat: newCoordinate.latitude, lng: newCoordinate.longitude,
      note: '', imageUri: null, 
    };
    setMySpots([...mySpots, newSpot]);
    openMySpotDetail(newSpot); 
  };

  const openMySpotDetail = (spot) => {
    setSelectedSpot(spot);
    setEditingNote(spot.note);
    setEditingImage(spot.imageUri); 
  };

  // 開啟社群膠囊：標記為已讀
  const openCommunitySpot = (spot) => {
    setCommunitySpots(prev => prev.map(s => 
      s.id === spot.id ? { ...s, isViewed: true } : s
    ));
    setSelectedCommunitySpot({ ...spot, isViewed: true });
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.8, 
    });
    if (!result.canceled) setEditingImage(result.assets[0].uri); 
  };

  const saveAndCloseSpot = () => {
    if (selectedSpot) {
      setMySpots(mySpots.map(s => 
        s.id === selectedSpot.id ? { ...s, note: editingNote, imageUri: editingImage } : s
      ));
    }
    setSelectedSpot(null);
  };

  const handleLogin = () => {
    if (!username || !password) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false); setIsLoggedIn(true); setShowLoginOverlay(false);
    }, 1000);
  };

  const toggleCommunityLike = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCommunitySpots(prev => prev.map(spot => {
      if (spot.id === id) {
        const updated = { ...spot, isLiked: !spot.isLiked, likes: spot.isLiked ? spot.likes - 1 : spot.likes + 1 };
        if (selectedCommunitySpot?.id === id) setSelectedCommunitySpot(updated); 
        return updated;
      }
      return spot;
    }));
  };

  const toggleCommunitySave = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCommunitySpots(prev => prev.map(spot => {
      if (spot.id === id) {
        const updated = { ...spot, isSaved: !spot.isSaved };
        if (selectedCommunitySpot?.id === id) setSelectedCommunitySpot(updated);
        return updated;
      }
      return spot;
    }));
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{ latitude: 25.0400, longitude: 121.5450, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        customMapStyle={darkMapStyle}
        showsUserLocation={true}
        showsMyLocationButton={false} 
        onLongPress={handleMapLongPress} 
      >
        {/* 🌟 我的足跡 */}
        {mapMode === 'personal' && mySpots.map((spot) => (
          <Marker key={`my-${spot.id}`} coordinate={{ latitude: spot.lat, longitude: spot.lng }} onPress={(e) => { e.stopPropagation(); openMySpotDetail(spot); }}>
            <View style={styles.safeMarker}>
              <View style={styles.safeMarkerInner}>
                <Ionicons name={spot.imageUri ? "checkmark-circle" : "camera"} size={22} color={themeColors.background} />
              </View>
            </View>
          </Marker>
        ))}

        {/* 🌟 探索膠囊 */}
        {mapMode === 'explore' && communitySpots.map((spot) => {
          let iconName = 'help';
          let markerColor = '#7f69c8'; 
          let iconColor = themeColors.background;

          if (spot.isSaved) {
            iconName = 'heart';
            markerColor = themeColors.accentMain; 
            iconColor = themeColors.textMain;
          } else if (spot.isViewed) {
            iconName = 'eye';
            markerColor = themeColors.textSub; 
            iconColor = themeColors.background;
          }

          return (
            <Marker key={`com-${spot.id}`} coordinate={{ latitude: spot.lat, longitude: spot.lng }} onPress={(e) => { e.stopPropagation(); openCommunitySpot(spot); }}>
              {/* 拿掉會當機的外框，直接渲染 */}
              <View style={[styles.safeMarker, { borderColor: markerColor, backgroundColor: '#1E1238' }]}>
                <View style={[styles.safeMarkerInner, { backgroundColor: markerColor }]}>
                  <Ionicons name={iconName} size={22} color={iconColor} />
                </View>
              </View>
            </Marker>
          );
        })}
      </MapView>

      <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity style={[styles.segmentBtn, mapMode === 'explore' && styles.segmentBtnActive]} onPress={() => setMapMode('explore')} activeOpacity={0.8}>
            <Ionicons name="earth" size={16} color={mapMode === 'explore' ? themeColors.textMain : themeColors.textSub} />
            <Text style={[styles.segmentText, mapMode === 'explore' && styles.segmentTextActive]}>探索膠囊</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segmentBtn, mapMode === 'personal' && styles.segmentBtnActive]} onPress={() => setMapMode('personal')} activeOpacity={0.8}>
            <Ionicons name="location" size={16} color={mapMode === 'personal' ? themeColors.textMain : themeColors.textSub} />
            <Text style={[styles.segmentText, mapMode === 'personal' && styles.segmentTextActive]}>我的足跡</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={() => isLoggedIn ? setIsLoggedIn(false) : setShowLoginOverlay(true)}>
          <Ionicons name={isLoggedIn ? "log-out" : "person"} size={22} color={themeColors.textMain} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.fab} onPress={goToUserLocation}>
          <Ionicons name="locate" size={24} color={themeColors.textMain} />
        </TouchableOpacity>
      </View>

      {!selectedSpot && !selectedCommunitySpot && (
        <View style={styles.bottomBannerContainer}>
          <View style={styles.aiCard}>
            <Ionicons name={mapMode === 'personal' ? "information-circle" : "search"} size={24} color={themeColors.accentMain} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.aiTitle}>{mapMode === 'personal' ? '建立回憶' : '探索世界'}</Text>
              <Text style={styles.aiText}>
                {mapMode === 'personal' 
                  ? (isLoggedIn ? '長按地圖新增足跡，將自動同步至雲端。' : '長按地圖新增本機足跡。登入解鎖分享！')
                  : '點開地圖上的「？」探索別人的行程！遇到喜歡的就收藏成愛心吧❤️'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 新增我的足跡抽屜 */}
      <Modal visible={!!selectedSpot} transparent={true} animationType="slide" onRequestClose={() => setSelectedSpot(null)}>
        <KeyboardAvoidingView style={styles.bottomSheetOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} pointerEvents="box-none">
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setSelectedSpot(null)} />
          <View style={styles.bottomSheet}>
            <View style={styles.dragHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{isLoggedIn ? "記錄並準備分享 ✍️" : "本機私密記錄 ✍️"}</Text>
              <TouchableOpacity onPress={() => setSelectedSpot(null)}><Ionicons name="close-circle" size={28} color={themeColors.textSub} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <TouchableOpacity style={styles.photoContainer} onPress={pickImage} activeOpacity={0.8}>
                {editingImage ? <Image source={{ uri: editingImage }} style={styles.uploadedImage} /> : <><Ionicons name="image-outline" size={40} color={themeColors.textSub} /><Text style={styles.photoPlaceholderText}>點擊上傳照片</Text></>}
              </TouchableOpacity>
              <TextInput style={styles.textArea} placeholder="寫下這裡的故事..." placeholderTextColor={themeColors.textSub} multiline={true} value={editingNote} onChangeText={setEditingNote} />
              <TouchableOpacity style={styles.saveBtn} onPress={saveAndCloseSpot} activeOpacity={0.8}>
                <Ionicons name={isLoggedIn ? "cloud-upload" : "save"} size={20} color={themeColors.textMain} />
                <Text style={styles.saveBtnText}>{isLoggedIn ? "同步至雲端" : "儲存至手機"}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 觀看社群貼文抽屜 */}
      <Modal visible={!!selectedCommunitySpot} transparent={true} animationType="slide" onRequestClose={() => setSelectedCommunitySpot(null)}>
        <KeyboardAvoidingView style={styles.bottomSheetOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} pointerEvents="box-none">
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setSelectedCommunitySpot(null)} />
          <View style={styles.bottomSheet}>
            <View style={styles.dragHandle} />
            <View style={styles.threadHeader}>
              <View style={styles.threadAuthorRow}>
                <Image source={{ uri: selectedCommunitySpot?.author.avatar }} style={styles.threadAvatar} />
                <View>
                  <Text style={styles.threadAuthorName}>{selectedCommunitySpot?.author.name}</Text>
                  <Text style={styles.threadTime}>{selectedCommunitySpot?.timeAgo}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedCommunitySpot(null)}><Ionicons name="close-circle" size={28} color={themeColors.textSub} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.threadContent}>{selectedCommunitySpot?.content}</Text>
              {selectedCommunitySpot?.image && (
                <TouchableOpacity activeOpacity={0.9} onDoublePress={() => toggleCommunityLike(selectedCommunitySpot.id)}>
                  <Image source={{ uri: selectedCommunitySpot.image }} style={styles.threadImage} />
                </TouchableOpacity>
              )}
              <View style={styles.threadActionRow}>
                <TouchableOpacity style={styles.threadActionBtn} onPress={() => toggleCommunityLike(selectedCommunitySpot?.id)}>
                  <Ionicons name={selectedCommunitySpot?.isLiked ? "heart" : "heart-outline"} size={26} color={selectedCommunitySpot?.isLiked ? themeColors.accentMain : themeColors.textMain} />
                  <Text style={[styles.threadActionText, selectedCommunitySpot?.isLiked && { color: themeColors.accentMain }]}>{selectedCommunitySpot?.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.threadActionBtn}>
                  <Ionicons name="chatbubble-outline" size={24} color={themeColors.textMain} />
                  <Text style={styles.threadActionText}>{selectedCommunitySpot?.replies}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity 
                style={[styles.saveBtn, selectedCommunitySpot?.isSaved && { backgroundColor: themeColors.background, borderColor: themeColors.accentMain }]} 
                onPress={() => toggleCommunitySave(selectedCommunitySpot?.id)} activeOpacity={0.8}
              >
                <Ionicons name={selectedCommunitySpot?.isSaved ? "heart" : "bookmark-outline"} size={20} color={selectedCommunitySpot?.isSaved ? themeColors.accentMain : themeColors.textMain} />
                <Text style={[styles.saveBtnText, selectedCommunitySpot?.isSaved && { color: themeColors.accentMain }]}>
                  {selectedCommunitySpot?.isSaved ? "已收藏至我的足跡 ❤️" : "收藏行程至我的足跡"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 登入彈窗 */}
      <Modal visible={showLoginOverlay} transparent={true} animationType="fade">
        <KeyboardAvoidingView style={styles.loginOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.loginCard}>
            <TouchableOpacity style={styles.closeLoginBtn} onPress={() => setShowLoginOverlay(false)}>
              <Ionicons name="close" size={28} color={themeColors.textSub} />
            </TouchableOpacity>
            <View style={styles.iconWrapper}><Ionicons name="cloud-upload" size={32} color={themeColors.textMain} /></View>
            <Text style={styles.loginTitle}>登入時光膠囊</Text>
            <Text style={styles.loginSubtitle}>備份足跡，解鎖社群分享與收藏功能</Text>
            <TextInput style={styles.input} placeholder="帳號" placeholderTextColor={themeColors.textSub} value={username} onChangeText={setUsername} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="密碼" placeholderTextColor={themeColors.textSub} value={password} onChangeText={setPassword} secureTextEntry />
            <TouchableOpacity style={styles.loginSubmitBtn} onPress={handleLogin} activeOpacity={0.8}>
              {isLoading ? <ActivityIndicator color={themeColors.textMain} /> : <Text style={styles.loginSubmitBtnText}>登入 / 註冊</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: themeColors.background },
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  segmentedControl: { flexDirection: 'row', backgroundColor: 'rgba(30, 18, 56, 0.85)', borderRadius: 24, padding: 4, borderWidth: 1.5, borderColor: themeColors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  segmentBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
  segmentBtnActive: { backgroundColor: themeColors.accentMain },
  segmentText: { fontFamily: 'VibePixel', fontSize: 13, color: themeColors.textSub, marginTop: 2 },
  segmentTextActive: { color: themeColors.textMain },
  fabContainer: { position: 'absolute', right: 15, top: '45%', alignItems: 'center', gap: 15, zIndex: 10 },
  fab: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(54, 35, 96, 0.9)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: themeColors.border, shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.4, shadowRadius: 3 },
  bottomBannerContainer: { position: 'absolute', bottom: 100, left: 15, right: 15, zIndex: 5 },
  aiCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(54, 35, 96, 0.95)', borderWidth: 2, borderColor: themeColors.accentSub, borderRadius: 20, padding: 15, shadowColor: themeColors.accentSub, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  aiTitle: { fontFamily: 'VibePixel', fontSize: 14, color: themeColors.accentMain, marginBottom: 4 },
  aiText: { fontFamily: 'VibePixel', fontSize: 12, color: themeColors.textMain, lineHeight: 18 },

  // 💡 修復重點：拿掉 Android 的 elevation 陰影，純靠加粗邊框維持質感
  safeMarker: { 
    width: 44, height: 44, borderRadius: 22, backgroundColor: themeColors.accentMain, 
    borderWidth: 2.5, borderColor: themeColors.textMain, alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 3 },
      android: { elevation: 0 } // 絕對不能有陰影，不然會被切成方形！
    })
  },
  safeMarkerInner: { width: 30, height: 30, borderRadius: 15, backgroundColor: themeColors.background, alignItems: 'center', justifyContent: 'center' },
  
  bottomSheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  bottomSheet: { backgroundColor: themeColors.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 25, paddingBottom: 40, paddingTop: 15, maxHeight: '80%', borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: themeColors.border, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.3, shadowRadius: 10 },
  dragHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: themeColors.textSub, alignSelf: 'center', marginBottom: 15 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontFamily: 'VibePixel', fontSize: 18, color: themeColors.textMain },
  photoContainer: { width: '100%', height: 180, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 2, borderColor: themeColors.border, overflow: 'hidden' },
  uploadedImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoPlaceholderText: { fontFamily: 'VibePixel', fontSize: 12, color: themeColors.textSub, marginTop: 8 },
  textArea: { backgroundColor: 'rgba(255,255,255,0.05)', height: 120, borderRadius: 20, padding: 16, fontSize: 14, fontFamily: 'VibePixel', color: themeColors.textMain, textAlignVertical: 'top', borderWidth: 2, borderColor: themeColors.border, marginBottom: 20 },
  saveBtn: { backgroundColor: themeColors.accentMain, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 16, borderRadius: 20, borderWidth: 2, borderColor: themeColors.border },
  saveBtnText: { fontFamily: 'VibePixel', color: themeColors.textMain, fontSize: 16, marginTop: 2 },
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

export default MapScreen;