import { Dimensions } from 'react-native';
import { themeColors } from '../../../constants/theme';

const { width } = Dimensions.get('window');
export const CARD_WIDTH = width * 0.46;
export const SPACING = 12;
export const SPACER_WIDTH = (width - CARD_WIDTH) / 2;

export const vibes = [
    { id: 'left-spacer' },
    { id: 'cafe', icon: 'cafe', label: '想耍廢', bgColor: themeColors.textSub },
    { id: 'photo', icon: 'camera', label: '拍美照', bgColor: themeColors.accentSub },
    { id: 'food', icon: 'restaurant', label: '肚子餓', bgColor: themeColors.textSub },
    { id: 'rain', icon: 'umbrella', label: '躲室內', bgColor: themeColors.accentSub },
    { id: 'walk', icon: 'walk', label: '散散步', bgColor: themeColors.textSub },
    { id: 'gift', icon: 'gift', label: '買東西', bgColor: themeColors.accentSub },
    { id: 'random', icon: 'help-circle', label: '隨便啦', bgColor: '#B197FC' },
    { id: 'right-spacer' },
];

export const originalPurpleMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#241842' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#241842' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#84A6D3' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#362360' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1E1238' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1E1238' }] },
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'on' }] },
];

export const getWeatherIcon = (condition) => {
    switch (condition) {
        case 'Clear':
            return 'sunny-outline';
        case 'Clouds':
            return 'cloud-outline';
        case 'Rain':
        case 'Drizzle':
            return 'rainy-outline';
        case 'Thunderstorm':
            return 'thunderstorm-outline';
        case 'Snow':
            return 'snow-outline';
        default:
            return 'partly-sunny-outline';
    }
};