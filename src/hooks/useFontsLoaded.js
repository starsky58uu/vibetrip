/**
 * 載入 App 用的字型：思源黑體（Noto Sans TC）四種字重。
 * 等所有字型載完（或失敗）才回 true，避免文字閃爍。
 */
import { useFonts } from 'expo-font';
import {
  NotoSansTC_400Regular,
  NotoSansTC_500Medium,
  NotoSansTC_700Bold,
  NotoSansTC_900Black,
} from '@expo-google-fonts/noto-sans-tc';

export const useFontsLoaded = () => {
  const [fontsLoaded, error] = useFonts({
    NotoSansTC_400Regular,
    NotoSansTC_500Medium,
    NotoSansTC_700Bold,
    NotoSansTC_900Black,
  });
  return fontsLoaded || !!error;
};
