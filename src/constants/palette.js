// VibeTrip 色票系統 — 亮色 / 低明度（莫蘭迪系）

// 原本鮮豔配色（白天）
export const PAL_BRIGHT = {
  yellow: '#E2E146',
  pink:   '#FF6FA8',
  blue:   '#2E45B0',
  black:  '#000000',
  white:  '#FFFFFF',
};

// 低明度（夜間 / 護眼模式）— 參考使用者提供的莫蘭迪色票
// 對應關係：
//   bright yellow E2E146 → cream butter F5E6C8
//   bright pink   FF6FA8 → dusty rose  E5C1CD
//   bright blue   2E45B0 → muted slate AAC9CE
//   black 000000  → soft charcoal 3D3A42
//   white FFFFFF  → warm cream  FBF6F0
export const PAL_DIM = {
  yellow: '#F5E6C8',
  pink:   '#E5C1CD',
  blue:   '#AAC9CE',
  black:  '#3D3A42',
  white:  '#FBF6F0',
};
