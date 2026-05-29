import { useFonts } from 'expo-font';
// 像素字體（卡通風主頁專用）
const Cubic11 = require('../assets/fonts/Cubic_11.ttf');
// 黑體 — 全 App 中文骨幹（編輯雜誌風）
import {
  NotoSansTC_400Regular,
  NotoSansTC_500Medium,
  NotoSansTC_700Bold,
  NotoSansTC_900Black,
} from '@expo-google-fonts/noto-sans-tc';
// 明朝體 — 編輯感大標、引言
import { NotoSerifTC_400Regular, NotoSerifTC_700Bold } from '@expo-google-fonts/noto-serif-tc';
// 拉丁字 — 大數字、編號
import { Fraunces_300Light, Fraunces_500Medium } from '@expo-google-fonts/fraunces';
// 舊組件相容
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif';
// 等寬 — kicker / NO.247 / 時間日期標籤
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';

export const useFontsLoaded = () => {
  const [fontsLoaded, error] = useFonts({
    Cubic11,
    NotoSansTC_400Regular,
    NotoSansTC_500Medium,
    NotoSansTC_700Bold,
    NotoSansTC_900Black,
    NotoSerifTC_400Regular,
    NotoSerifTC_700Bold,
    Fraunces_300Light,
    Fraunces_500Medium,
    InstrumentSerif_400Regular_Italic,
    JetBrainsMono_400Regular,
  });
  return fontsLoaded || !!error;
};
