export const getWindDirection = (degree) => {
  const directions = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'];
  const index = Math.round(((degree %= 360) < 0 ? degree + 360 : degree) / 45) % 8;
  return directions[index] + '風';
};

export const getWeatherIcon = (main) => {
  switch (main) {
    case 'Clear': return 'weather-sunny';
    case 'Clouds': return 'weather-cloudy';
    case 'Rain': return 'weather-pouring';
    case 'Drizzle': return 'weather-partly-rainy';
    case 'Thunderstorm': return 'weather-lightning';
    case 'Snow': return 'weather-snowy';
    default: return 'weather-cloudy';
  }
};

export const formatTime = (dateString) => dateString.split(' ')[1].substring(0, 5);

export const formatUnixTime = (unixTime) => {
  const date = new Date(unixTime * 1000);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};