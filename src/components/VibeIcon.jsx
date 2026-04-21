import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

// Hand-drawn feel vibe icons — mirrors the HTML prototype's SVG paths exactly
export default function VibeIcon({ kind, size = 36, stroke = 1.6, color = '#1C1A17' }) {
  const props = {
    width: size, height: size,
    viewBox: '0 0 48 48',
    fill: 'none',
  };
  const sp = { stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };

  switch (kind) {
    case 'cafe': return (
      <Svg {...props}>
        <Path d="M12 18h22v10a10 10 0 01-10 10h-2a10 10 0 01-10-10V18z" {...sp} />
        <Path d="M34 22h4a4 4 0 010 8h-4" {...sp} />
        <Path d="M18 10c0 3-2 3-2 5M24 10c0 3-2 3-2 5M30 10c0 3-2 3-2 5" {...sp} />
      </Svg>
    );
    case 'food': return (
      <Svg {...props}>
        <Path d="M8 26c0-8 7-14 16-14s16 6 16 14" {...sp} />
        <Path d="M6 26h36" {...sp} />
        <Path d="M10 30h28l-2 6a4 4 0 01-4 3H16a4 4 0 01-4-3l-2-6z" {...sp} />
        <Circle cx="24" cy="20" r="1.2" fill={color} />
      </Svg>
    );
    case 'photo': return (
      <Svg {...props}>
        <Rect x="7" y="14" width="34" height="24" rx="3" {...sp} />
        <Path d="M16 14l3-4h10l3 4" {...sp} />
        <Circle cx="24" cy="26" r="6" {...sp} />
        <Circle cx="34" cy="20" r="0.8" fill={color} />
      </Svg>
    );
    case 'rain': return (
      <Svg {...props}>
        <Path d="M14 22a8 8 0 0116-1 6 6 0 01-1 12H15a6 6 0 01-1-11z" {...sp} />
        <Path d="M16 36l-2 4M24 36l-2 4M32 36l-2 4" {...sp} />
      </Svg>
    );
    case 'walk': return (
      <Svg {...props}>
        <Circle cx="27" cy="8" r="3" {...sp} />
        <Path d="M24 14l-5 10 5 3v13" {...sp} />
        <Path d="M24 24l6-3 4 6 5-1" {...sp} />
        <Path d="M19 40l-4-6" {...sp} />
      </Svg>
    );
    case 'gift': return (
      <Svg {...props}>
        <Rect x="8" y="18" width="32" height="22" rx="2" {...sp} />
        <Path d="M6 18h36v6H6z" {...sp} />
        <Path d="M24 18v22" {...sp} />
        <Path d="M17 18c-2-6 2-8 4-6s3 6 3 6M31 18c2-6-2-8-4-6s-3 6-3 6" {...sp} />
      </Svg>
    );
    case 'random': return (
      <Svg {...props}>
        <Rect x="10" y="10" width="28" height="28" rx="4" {...sp} />
        <Circle cx="17" cy="17" r="1.4" fill={color} />
        <Circle cx="31" cy="17" r="1.4" fill={color} />
        <Circle cx="24" cy="24" r="1.4" fill={color} />
        <Circle cx="17" cy="31" r="1.4" fill={color} />
        <Circle cx="31" cy="31" r="1.4" fill={color} />
      </Svg>
    );
    default: return null;
  }
}
