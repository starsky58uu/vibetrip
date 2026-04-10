import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Modal, Image, ScrollView
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import * as Location from 'expo-location';

const themeColors = {
  background: '#362360',
  textMain: '#E9F3FB',
  accentMain: '#C95E9E',
  accentSub: '#C3AED9',
  textSub: '#84A6D3',
  border: '#1E1238'
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

const MapScreen = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [spots, setSpots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null); 
  const [editingNote, setEditingNote] = useState(''); 
  const [editingImage, setEditingImage] = useState(null); 
  const [userLocation, setUserLocation] = useState(null);

  const mapRef = useRef(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,  
        longitudeDelta: 0.01,
      };
      setUserLocation(coords);

      if (mapRef.current) {
        mapRef.current.animateToRegion(coords, 1000);
      }
    })();
  }, []);

  const goToUserLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(userLocation, 1000);
    }
  };

  const handleMapLongPress = (e) => {
    if (!isLoggedIn) return; 

    const newCoordinate = e.nativeEvent.coordinate;
    const newSpot = {
      id: Date.now().toString(),
      lat: newCoordinate.latitude,
      lng: newCoordinate.longitude,
      note: '', 
      imageUri: null, 
    };
    
    setSpots([...spots, newSpot]);
    openSpotDetail(newSpot); 
  };

  const openSpotDetail = (spot) => {
    setSelectedSpot(spot);
    setEditingNote(spot.note);
    setEditingImage(spot.imageUri); 
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, 
      aspect: [4, 3], 
      quality: 0.8, 
    });

    if (!result.canceled) {
      setEditingImage(result.assets[0].uri); 
    }
  };

  const saveAndCloseSpot = () => {
    if (selectedSpot) {
      setSpots(spots.map(s => 
        s.id === selectedSpot.id 
          ? { ...s, note: editingNote, imageUri: editingImage } 
          : s
      ));
    }
    setSelectedSpot(null);
  };

  const handleLogin = () => {
    if (!username || !password) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsLoggedIn(true);
      setShowLoginOverlay(false);
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: 25.0400,
          longitude: 121.5450,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        customMapStyle={darkMapStyle}
        showsUserLocation={true}
        showsMyLocationButton={false} // 🌟 修正名稱
        onLongPress={handleMapLongPress} 
      >
        {spots.map((spot) => (
          <Marker
            key={spot.id}
            coordinate={{ latitude: spot.lat, longitude: spot.lng }}
            onPress={(e) => {
              e.stopPropagation(); 
              openSpotDetail(spot);
            }} 
          >
            <View style={styles.safeMarker}>
              <View style={styles.safeMarkerInner}>
                <Ionicons name={spot.imageUri ? "checkmark-circle" : "camera"} size={20} color={themeColors.background} />
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* 🌟 渲染回到所在地按鈕 */}
      <TouchableOpacity style={styles.recenterBtn} onPress={goToUserLocation}>
        <Ionicons name="locate" size={28} color={themeColors.background} />
      </TouchableOpacity>

      {!isLoggedIn && !showLoginOverlay && (
        <TouchableOpacity style={styles.openLoginBtn} onPress={() => setShowLoginOverlay(true)}>
          <Ionicons name="person-circle" size={30} color={themeColors.textMain} />
        </TouchableOpacity>
      )}

      {isLoggedIn && !selectedSpot && (
        <View style={styles.aiBanner} pointerEvents="box-none">
          <View style={styles.aiCard}>
            <Text style={styles.aiTitle}>🤖 AI 足跡提示</Text>
            <Text style={styles.aiText}>長按地圖上的任何一個地方，就可以上傳照片並留下回憶！</Text>
          </View>
        </View>
      )}

      {isLoggedIn && !selectedSpot && (
        <TouchableOpacity style={styles.logoutBtn} onPress={() => setIsLoggedIn(false)}>
          <Ionicons name="log-out" size={24} color={themeColors.textMain} />
        </TouchableOpacity>
      )}

      {/* 📸 回憶紀錄彈窗 */}
      <Modal
        visible={!!selectedSpot}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedSpot(null)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            keyboardShouldPersistTaps="handled"
            style={{ width: '100%' }}
          >
            <View style={styles.recordCard}>
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedSpot(null)}>
                <Ionicons name="close-circle" size={32} color={themeColors.accentMain} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.photoContainer} onPress={pickImage} activeOpacity={0.8}>
                {editingImage ? (
                  <Image source={{ uri: editingImage }} style={styles.uploadedImage} />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={50} color={themeColors.textSub} />
                    <Text style={styles.photoPlaceholderText}>點擊上傳這座城市的照片</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.recordTitle}>記錄當下的心情 ✍️</Text>
              
              <TextInput
                style={styles.textArea}
                placeholder="寫下這裡的故事..."
                placeholderTextColor={themeColors.textSub}
                multiline={true}
                value={editingNote}
                onChangeText={setEditingNote}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={saveAndCloseSpot} activeOpacity={0.8}>
                <Text style={styles.saveBtnText}>收藏這份回憶 ✨</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* 🔐 登入彈窗 */}
      {showLoginOverlay && (
        <KeyboardAvoidingView 
          style={styles.loginOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            keyboardShouldPersistTaps="handled"
            style={{ width: '100%' }}
          >
            <View style={styles.loginCard}>
              <TouchableOpacity style={styles.closeLoginBtn} onPress={() => setShowLoginOverlay(false)}>
                <Ionicons name="close-circle" size={32} color={themeColors.textMain} />
              </TouchableOpacity>
              
              <View style={styles.iconWrapper}>
                <Ionicons name="lock-closed" size={40} color={themeColors.textMain} />
              </View>
              <Text style={styles.loginTitle}>時光膠囊</Text>

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
                <Text style={styles.loginSubmitBtnText}>
                  {isLoading ? '讀取足跡中...' : '開啟膠囊 ✨'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: themeColors.background },
  recenterBtn: {
    position: 'absolute', bottom: 120, right: 20, // 🌟 修正拼字 buttom -> bottom
    backgroundColor: themeColors.textMain, // 🌟 修正變數名 Mail -> Main
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: themeColors.border,
    shadowColor: themeColors.accentMain, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.8, shadowRadius: 3,
  }, // 🌟 補上逗點
  safeMarker: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: themeColors.accentMain,
    borderWidth: 3, borderColor: themeColors.border, alignItems: 'center', justifyContent: 'center',
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, 
  },
  safeMarkerInner: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: themeColors.textMain,
    alignItems: 'center', justifyContent: 'center',
  },
  openLoginBtn: {
    position: 'absolute', top: 60, left: 20, zIndex: 10, backgroundColor: themeColors.background,
    width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: themeColors.accentMain,
  },
  aiBanner: {
    position: 'absolute', top: 60, left: 20, right: 20, alignItems: 'center',
  },
  aiCard: {
    backgroundColor: themeColors.textMain, borderWidth: 3, borderColor: themeColors.border,
    borderRadius: 20, padding: 16, width: '100%',
  },
  aiTitle: { fontSize: 14, color: themeColors.accentMain, marginBottom: 6, fontWeight: 'bold' },
  aiText: { fontSize: 16, color: themeColors.background, lineHeight: 22 },
  logoutBtn: {
    position: 'absolute', bottom: 150, right: 20, backgroundColor: themeColors.background,
    width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: themeColors.accentMain,
  },
  scrollContent: {
    flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(30, 18, 56, 0.7)', 
  },
  recordCard: {
    width: '100%', backgroundColor: themeColors.textMain, borderRadius: 24,
    padding: 24, borderWidth: 4, borderColor: themeColors.border,
  },
  closeModalBtn: { position: 'absolute', top: 12, right: 12, zIndex: 1 },
  photoContainer: {
    width: '100%', height: 160, backgroundColor: themeColors.background, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20, marginTop: 10,
    borderWidth: 3, borderColor: themeColors.border, overflow: 'hidden', 
  },
  uploadedImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoPlaceholderText: { color: themeColors.textSub, marginTop: 10, fontWeight: 'bold' },
  recordTitle: { fontSize: 18, color: themeColors.background, fontWeight: 'bold', marginBottom: 10 },
  textArea: {
    backgroundColor: '#FFFFFF', height: 100, borderRadius: 16, padding: 16, fontSize: 16, 
    color: themeColors.background, textAlignVertical: 'top', borderWidth: 3, borderColor: themeColors.border,
    marginBottom: 20,
  },
  saveBtn: {
    backgroundColor: themeColors.accentMain, paddingVertical: 16, borderRadius: 16,
    borderWidth: 3, borderColor: themeColors.border, alignItems: 'center',
  },
  saveBtnText: { color: themeColors.textMain, fontSize: 18, fontWeight: 'bold' },
  loginOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(30, 18, 56, 0.8)', zIndex: 100,
  },
  loginCard: {
    width: '100%', backgroundColor: themeColors.accentSub, borderRadius: 24,
    borderWidth: 4, borderColor: themeColors.border, padding: 24, alignItems: 'center',
  },
  closeLoginBtn: { position: 'absolute', top: 12, right: 12, zIndex: 1 },
  iconWrapper: {
    backgroundColor: themeColors.background, width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: themeColors.border,
    marginBottom: 16, marginTop: -60, 
  },
  loginTitle: { fontSize: 28, color: themeColors.background, marginBottom: 24, fontWeight: 'bold' },
  input: {
    width: '100%', backgroundColor: themeColors.textMain, borderWidth: 3, borderColor: themeColors.border, 
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    color: themeColors.background, marginBottom: 16,
  },
  loginSubmitBtn: {
    width: '100%', backgroundColor: themeColors.accentMain, paddingVertical: 16,
    borderRadius: 16, borderWidth: 3, borderColor: themeColors.border, alignItems: 'center',
    marginTop: 8,
  },
  loginSubmitBtnText: { fontSize: 18, color: themeColors.textMain, fontWeight: 'bold' },
});

export default MapScreen;