import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { DUMMY_COMMUNITY_SPOTS } from '../constants/MapData';

export const useMapLogic = () => {
  const mapRef = useRef(null);

  // 地圖與標記狀態
  const [mapMode, setMapMode] = useState('explore'); 
  const [mySpots, setMySpots] = useState([]); 
  const [communitySpots, setCommunitySpots] = useState(DUMMY_COMMUNITY_SPOTS);
  const [userLocation, setUserLocation] = useState(null);

  // 彈出視窗狀態
  const [selectedSpot, setSelectedSpot] = useState(null); 
  const [selectedCommunitySpot, setSelectedCommunitySpot] = useState(null); 

  // 編輯表單狀態
  const [editingNote, setEditingNote] = useState(''); 
  const [editingImage, setEditingImage] = useState(null); 

  // 初始化定位
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

  // 新增個人足跡
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

  const saveAndCloseSpot = () => {
    if (selectedSpot) {
      setMySpots(mySpots.map(s => 
        s.id === selectedSpot.id ? { ...s, note: editingNote, imageUri: editingImage } : s
      ));
    }
    setSelectedSpot(null);
  };

  // 社群互動邏輯
  const openCommunitySpot = (spot) => {
    setCommunitySpots(prev => prev.map(s => s.id === spot.id ? { ...s, isViewed: true } : s));
    setSelectedCommunitySpot({ ...spot, isViewed: true });
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

  // 圖片選擇器
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.8, 
    });
    if (!result.canceled) setEditingImage(result.assets[0].uri); 
  };

  return {
    mapRef, mapMode, setMapMode,
    mySpots, communitySpots,
    selectedSpot, setSelectedSpot,
    selectedCommunitySpot, setSelectedCommunitySpot,
    editingNote, setEditingNote,
    editingImage, pickImage, saveAndCloseSpot,
    goToUserLocation, handleMapLongPress, openMySpotDetail,
    openCommunitySpot, toggleCommunityLike, toggleCommunitySave
  };
};