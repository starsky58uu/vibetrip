import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

export default function WeatherIcon({ kind = 'cloudy', size = 24, color = '#4A4540' }) {
  const props = { width: size, height: size, viewBox: '0 0 32 32', fill: 'none' };
  const sp = { stroke: color, strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' };

  if (kind === 'sunny') return (
    <Svg {...props}>
      <Circle cx="16" cy="16" r="5" {...sp} />
      <Path d="M16 4v3M16 25v3M4 16h3M25 16h3M7.5 7.5l2 2M22.5 22.5l2 2M7.5 24.5l2-2M22.5 9.5l2-2" {...sp} />
    </Svg>
  );
  if (kind === 'partly') return (
    <Svg {...props}>
      <Circle cx="11" cy="12" r="4" {...sp} />
      <Path d="M11 3v2M3 12h2M18.5 5.5l1.5 1.5" {...sp} />
      <Path d="M13 22a4 4 0 010-8 6 6 0 0111 1 3 3 0 010 7H13z" {...sp} />
    </Svg>
  );
  if (kind === 'rain') return (
    <Svg {...props}>
      <Path d="M9 18a5 5 0 010-10 7 7 0 0114 1 4 4 0 010 9H9z" {...sp} />
      <Path d="M11 22l-1 3M16 22l-1 3M21 22l-1 3" {...sp} />
    </Svg>
  );
  if (kind === 'night') return (
    <Svg {...props}>
      <Path d="M20 6a8 8 0 100 16 8 8 0 01-6-14c-.5 0-1 .2-1.5.5A8 8 0 0120 6z" {...sp} />
    </Svg>
  );
  // cloudy (default)
  return (
    <Svg {...props}>
      <Path d="M9 22a5 5 0 010-10 7 7 0 0114 1 4 4 0 010 9H9z" {...sp} />
    </Svg>
  );
}
