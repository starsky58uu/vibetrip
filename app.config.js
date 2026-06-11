import { getAppVariant, loadEnvFiles } from './scripts/load-env.js';

loadEnvFiles();

const appVariant = getAppVariant();

export default {
    expo: {
        name: 'vibetrip',
        slug: 'vibetrip',
        extra: {
            eas: {
                projectId: "d47fb124-39cd-4fb8-b71f-18bfb731fde5"
            },
            appVariant,
            apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? '',
        },
        updates: {
            url: "https://u.expo.dev/d47fb124-39cd-4fb8-b71f-18bfb731fde5"
        },
        runtimeVersion: {
            policy: "appVersion"
        },
        version: '1.0.0',
        orientation: 'portrait',
        icon: './assets/logo2.png',
        userInterfaceStyle: 'light',
        splash: {
            image: './src/assets/splash-icon.png',
            resizeMode: 'contain',
            backgroundColor: '#ffffff',
        },
        ios: {
            supportsTablet: true,
            config: {
                googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_API_KEY,
            },
        },
        android: {
            adaptiveIcon: {
                backgroundColor: '#E6F4FE',
                foregroundImage: './src/assets/android-icon-foreground.png',
                backgroundImage: './src/assets/android-icon-background.png',
                monochromeImage: './src/assets/android-icon-monochrome.png',
            },
            config: {
                googleMaps: {
                    apiKey: process.env.EXPO_PUBLIC_GOOGLE_API_KEY,
                },
            },
            package: 'com.beebeebee.vibetrip',
        },
        web: {
            favicon: './assets/favicon.png',
        },
        plugins: ['expo-font', 'expo-secure-store'],
    },
};
