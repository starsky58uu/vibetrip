/**
 * ThemeContext — manages app-wide theme (4 palettes) + vibe button style (3 variants)
 *
 * Usage:
 *   import { useTheme } from '../context/ThemeContext';
 *   const { colors, theme, vibeStyle, setTheme, setVibeStyle } = useTheme();
 */
import React, { createContext, useContext, useState } from 'react';

// ─── Colour Palettes ───────────────────────────────────────────────────────────

const PALETTES = {
  default: {
    // 暖米白 — washi paper, persimmon accent
    paper:   '#F5EFE3',
    paper2:  '#EDE1C9',
    card:    '#FAF6EE',
    ink:     '#1C1A17',
    ink2:    '#4A4540',
    ink3:    '#8A8278',
    ink4:    '#C0B9AF',
    line:    '#DDD5C8',
    accent:  '#C85A3B',
    accentDeep: '#8B3A22',
    tea:     '#8B7A5E',
    stamp:   '#B83232',
    moss:    '#6E7A4B',
    indigo:  '#3E5873',
  },
  sakura: {
    // 櫻花粉 — blush paper, cherry blossom accent
    paper:   '#FDF0F4',
    paper2:  '#F5E0EA',
    card:    '#FEF7FA',
    ink:     '#2A1820',
    ink2:    '#5C384A',
    ink3:    '#9A7888',
    ink4:    '#C8B0BC',
    line:    '#E8D0DB',
    accent:  '#C6487A',
    accentDeep: '#8B2850',
    tea:     '#9A6B7E',
    stamp:   '#B03050',
    moss:    '#8A6B7A',
    indigo:  '#604878',
  },
  matcha: {
    // 抹茶綠 — matcha paper, moss accent
    paper:   '#EFF5E7',
    paper2:  '#DFE8D2',
    card:    '#F5FAF0',
    ink:     '#1A2018',
    ink2:    '#3A5035',
    ink3:    '#7A9070',
    ink4:    '#AABCA0',
    line:    '#C8DAB8',
    accent:  '#5C8040',
    accentDeep: '#3A5828',
    tea:     '#6B8A55',
    stamp:   '#3A6830',
    moss:    '#5C7840',
    indigo:  '#3A5848',
  },
  dusk: {
    // 暮色藍 — twilight paper, indigo accent
    paper:   '#EEF2F8',
    paper2:  '#DDE4F0',
    card:    '#F5F7FC',
    ink:     '#181E2A',
    ink2:    '#3A4560',
    ink3:    '#7A8AA0',
    ink4:    '#B0C0D8',
    line:    '#C8D4E8',
    accent:  '#4A78B0',
    accentDeep: '#2A5080',
    tea:     '#5A7A9A',
    stamp:   '#2A5090',
    moss:    '#4A7088',
    indigo:  '#3E5873',
  },
};

// ─── Theme metadata (for the picker UI) ───────────────────────────────────────

export const THEMES = [
  { key: 'default', zh: '暖米白', en: 'Washi',  swatch: '#F5EFE3', dot: '#C85A3B' },
  { key: 'sakura',  zh: '櫻花粉', en: 'Sakura', swatch: '#FDF0F4', dot: '#C6487A' },
  { key: 'matcha',  zh: '抹茶綠', en: 'Matcha', swatch: '#EFF5E7', dot: '#5C8040' },
  { key: 'dusk',    zh: '暮色藍', en: 'Dusk',   swatch: '#EEF2F8', dot: '#4A78B0' },
];

export const VIBE_STYLES = [
  { key: 'card',   zh: '卡片', en: 'Card' },
  { key: 'circle', zh: '圓形', en: 'Circle' },
  { key: 'stamp',  zh: '印章', en: 'Stamp' },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme]           = useState('default');
  const [vibeStyle, setVibeStyle]   = useState('card');

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
