import { useFonts } from 'expo-font';

export const useFontsLoaded = () => {
  const [fontsLoaded] = useFonts({ 
    'VibePixel': require('../assets/fonts/Cubic_11.ttf') 
  });
  
  return fontsLoaded;
};