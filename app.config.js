import 'dotenv/config';

export default {
    expo: {
        name: 'vibetrip',
        slug: 'vibetrip',
        version: '1.0.0',
        orientation: 'portrait',
        icon: './src/assets/icon.png',
        userInterfaceStyle: 'light',
        splash: {
            image: './src/assets/splash-icon.png',
            resizeMode: 'contain',
            backgroundColor: '#ffffff',
        },
        ios: {
            supportsTablet: true,
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
        plugins: ['expo-font'],
    },
};