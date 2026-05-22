import { useFonts } from 'expo-font';
// ZenOldMincho 只含日文漢字，部分繁體中文字缺字
// → 換成 Noto Serif TC（思源宋體繁體），同為明朝體，完整繁體中文字集
import { NotoSerifTC_400Regular, NotoSerifTC_700Bold } from '@expo-google-fonts/noto-serif-tc';
import { Fraunces_300Light, Fraunces_500Medium } from '@expo-google-fonts/fraunces';
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';

export const useFontsLoaded = () => {
  const [fontsLoaded, error] = useFonts({
    NotoSerifTC_400Regular,
    NotoSerifTC_700Bold,
    Fraunces_300Light,
    Fraunces_500Medium,
    InstrumentSerif_400Regular_Italic,
    JetBrainsMono_400Regular,
  });
  return fontsLoaded || !!error;
};
