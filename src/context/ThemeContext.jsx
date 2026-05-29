/**
 * ThemeContext — 6 主題（暖紙白 / 櫻花粉 / 紺青 / 苔綠 / 純黑白 / 深色）
 *                + 3 種 Vibe 按鈕樣式（卡片 / 圓形 / 印章）
 * 設計：日系雜誌編輯風，6 色跳色 palette，預設 vibeStyle = 印章。
 *
 * Usage:
 *   const { colors, theme, vibeStyle, setTheme, setVibeStyle } = useTheme();
 *   colors.cRed / cYellow / cBlue / cGreen / cPink / cCyan = 跳色
 */
import React, { createContext, useContext, useState } from 'react';

// ─── Colour Palettes ───────────────────────────────────────────────────────────

const PALETTES = {
  default: {
    // 暖紙白 — crisp paper, vermilion accent
    paper:   '#F4F1EA',
    paper2:  '#ECE7DB',
    paper3:  '#DCD4C2',
    card:    '#FBFAF6',
    ink:     '#111111',
    ink2:    '#2A2825',
    ink3:    '#6B665C',
    ink4:    '#A39E92',
    line:    'rgba(17,17,17,0.14)',
    line2:   'rgba(17,17,17,0.07)',
    accent:  '#D9352F',
    accentDeep: '#A52419',
    // 跳色
    cRed:    '#D9352F', cYellow: '#E8B341', cBlue: '#3A6BAE',
    cGreen:  '#5D7A3C', cPink:   '#D87B8E', cCyan: '#5B8FA5',
    // 舊相容
    tea: '#8B6F4E', stamp: '#D9352F', moss: '#5D7A3C', indigo: '#3A6BAE',
  },
  sakura: {
    // 櫻花粉 — pinker base, deeper rose accent
    paper:   '#F4ECEA',
    paper2:  '#EBDDDA',
    paper3:  '#DBC3BD',
    card:    '#FBF4F2',
    ink:     '#2A1418',
    ink2:    '#4A2A30',
    ink3:    '#7A5860',
    ink4:    '#B49AA0',
    line:    'rgba(42,20,24,0.14)',
    line2:   'rgba(42,20,24,0.07)',
    accent:  '#C94B6A',
    accentDeep: '#8C2E49',
    cRed:    '#C94B6A', cYellow: '#D49744', cBlue: '#4F6B8E',
    cGreen:  '#768B47', cPink:   '#DA8095', cCyan: '#6A9AAC',
    tea: '#8C6068', stamp: '#C94B6A', moss: '#768B47', indigo: '#4F6B8E',
  },
  indigo: {
    // 紺青 — cool, navy-leaning, slightly cooler palette
    paper:   '#EFEEF0',
    paper2:  '#E0DEE6',
    paper3:  '#C9C5D5',
    card:    '#FAF9FC',
    ink:     '#0E1726',
    ink2:    '#2A3548',
    ink3:    '#6A7382',
    ink4:    '#A6AAB6',
    line:    'rgba(14,23,38,0.14)',
    line2:   'rgba(14,23,38,0.07)',
    accent:  '#1B3A5B',
    accentDeep: '#0E2440',
    cRed:    '#C04A3A', cYellow: '#C49635', cBlue: '#1B3A5B',
    cGreen:  '#4F6234', cPink:   '#B66A78', cCyan: '#4A7A8A',
    tea: '#6F7280', stamp: '#C04A3A', moss: '#4F6234', indigo: '#1B3A5B',
  },
  moss: {
    // 苔綠 — matcha-toned, earthy
    paper:   '#EEEFE6',
    paper2:  '#E2E3D2',
    paper3:  '#CBCDB3',
    card:    '#F9FAF1',
    ink:     '#1A1F12',
    ink2:    '#2F3625',
    ink3:    '#6B7058',
    ink4:    '#A6AA94',
    line:    'rgba(26,31,18,0.14)',
    line2:   'rgba(26,31,18,0.07)',
    accent:  '#5D6E2E',
    accentDeep: '#3C4818',
    cRed:    '#B33D2D', cYellow: '#C99B30', cBlue: '#3D5A7A',
    cGreen:  '#5D6E2E', cPink:   '#B66A78', cCyan: '#5B8FA5',
    tea: '#7A7660', stamp: '#B33D2D', moss: '#5D6E2E', indigo: '#3D5A7A',
  },
  mono: {
    // 純黑白 — minimal, all pops collapse to ink
    paper:   '#F4F2ED',
    paper2:  '#E8E4DA',
    paper3:  '#D0CABA',
    card:    '#FFFFFF',
    ink:     '#0A0A0A',
    ink2:    '#2A2825',
    ink3:    '#6B665C',
    ink4:    '#A39E92',
    line:    'rgba(10,10,10,0.14)',
    line2:   'rgba(10,10,10,0.07)',
    accent:  '#0A0A0A',
    accentDeep: '#000000',
    cRed:    '#0A0A0A', cYellow: '#0A0A0A', cBlue: '#0A0A0A',
    cGreen:  '#0A0A0A', cPink:   '#0A0A0A', cCyan: '#0A0A0A',
    tea: '#0A0A0A', stamp: '#0A0A0A', moss: '#0A0A0A', indigo: '#0A0A0A',
  },
  dark: {
    // 深色 — warm night, pops boosted for contrast
    paper:   '#1A1815',
    paper2:  '#221F1B',
    paper3:  '#2C2924',
    card:    '#211E1A',
    ink:     '#EDE7DA',
    ink2:    '#C9C2B2',
    ink3:    '#908778',
    ink4:    '#5D5648',
    line:    'rgba(237,231,218,0.16)',
    line2:   'rgba(237,231,218,0.08)',
    accent:  '#FF6B3D',
    accentDeep: '#E04D1C',
    cRed:    '#FF6B3D', cYellow: '#F2C24D', cBlue: '#6FA0E0',
    cGreen:  '#A3C266', cPink:   '#F09EAC', cCyan: '#87BCD0',
    tea: '#A89A82', stamp: '#FF6B3D', moss: '#A3C266', indigo: '#6FA0E0',
  },
};

// ─── Theme metadata (for the picker UI) ───────────────────────────────────────

export const THEMES = [
  { key: 'default', zh: '暖紙白', en: 'Paper',  swatch: '#F4F1EA', dot: '#D9352F' },
  { key: 'sakura',  zh: '櫻花粉', en: 'Sakura', swatch: '#F4ECEA', dot: '#C94B6A' },
  { key: 'indigo',  zh: '紺青',   en: 'Indigo', swatch: '#EFEEF0', dot: '#1B3A5B' },
  { key: 'moss',    zh: '苔綠',   en: 'Moss',   swatch: '#EEEFE6', dot: '#5D6E2E' },
  { key: 'mono',    zh: '純黑白', en: 'Mono',   swatch: '#F4F2ED', dot: '#0A0A0A' },
  { key: 'dark',    zh: '深色',   en: 'Dark',   swatch: '#1A1815', dot: '#FF6B3D' },
];

export const VIBE_STYLES = [
  { key: 'card',   zh: '卡片', en: 'Card' },
  { key: 'circle', zh: '圓形', en: 'Circle' },
  { key: 'stamp',  zh: '印章', en: 'Stamp' },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme]         = useState('default');
  const [vibeStyle, setVibeStyle] = useState('stamp');   // 預設 = 印章

  const colors = PALETTES[theme] ?? PALETTES.default;

  return (
    <ThemeContext.Provider value={{ colors, theme, vibeStyle, setTheme, setVibeStyle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}
