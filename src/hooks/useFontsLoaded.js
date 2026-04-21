import { useFonts } from 'expo-font';
import { ZenOldMincho_400Regular, ZenOldMincho_700Bold } from '@expo-google-fonts/zen-old-mincho';
import { Fraunces_300Light, Fraunces_500Medium } from '@expo-google-fonts/fraunces';
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';

export const useFontsLoaded = () => {
  const [fontsLoaded, error] = useFonts({
    ZenOldMincho_400Regular,
    ZenOldMincho_700Bold,
    Fraunces_300Light,
    Fraunces_500Medium,
    InstrumentSerif_400Regular_Italic,
    JetBrainsMono_400Regular,
  });
  return fontsLoaded || !!error;
};
