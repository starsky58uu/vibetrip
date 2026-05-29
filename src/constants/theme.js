// VibeTrip design system — Editorial / 日系雜誌 (Popeye / Brutus 風)
// 暖紙白底 + 純黑字 + 6 色跳色 palette（朱 / 山吹 / 紺 / 抹茶 / 桜 / 浅葱）
export const T = {
  // Base palette — crisp paper
  paper:    '#F4F1EA',
  paper2:   '#ECE7DB',
  paper3:   '#DCD4C2',
  card:     '#FBFAF6',
  ink:      '#111111',
  ink2:     '#2A2825',
  ink3:     '#6B665C',
  ink4:     '#A39E92',
  line:     'rgba(17,17,17,0.14)',
  line2:    'rgba(17,17,17,0.07)',

  // The single accent — 朱 vermilion
  accent:     '#D9352F',
  accentDeep: '#A52419',

  // 跳色 palette — 各區塊輪流使用，做出編輯感
  cRed:    '#D9352F',  // 朱
  cYellow: '#E8B341',  // 山吹
  cBlue:   '#3A6BAE',  // 紺
  cGreen:  '#5D7A3C',  // 抹茶
  cPink:   '#D87B8E',  // 桜
  cCyan:   '#5B8FA5',  // 浅葱

  // 舊版相容
  moss:       '#5D7A3C',
  indigo:     '#3A6BAE',
  stamp:      '#D9352F',
  tea:        '#8B6F4E',

  // Semantic aliases for legacy code
  background:  '#F4F1EA',
  textMain:    '#111111',
  textSub:     '#6B665C',
  accentMain:  '#D9352F',
  accentSub:   '#5D7A3C',
  border:      'rgba(17,17,17,0.14)',
  cardBg:      '#FBFAF6',
};

// Typography
// 字體角色（搭配設計）：
//   sans / sansMed / sansBold / sansBlack → 黑體（Noto Sans TC）— 中文骨幹
//   serif / serifBold → 明朝體（Noto Serif TC）— 編輯感大標、引言
//   mono              → 等寬（JetBrains Mono）— NO.247、kicker、編號標籤
//   latin / latinMed  → Fraunces — 大數字 / 時間顯示（替代設計中的 Inter）
export const Fonts = {
  // 黑體（中文主體）
  sans:         'NotoSansTC_400Regular',
  sansMed:      'NotoSansTC_500Medium',
  sansBold:     'NotoSansTC_700Bold',
  sansBlack:    'NotoSansTC_900Black',
  // 明朝體
  serif:        'NotoSerifTC_400Regular',
  serifBold:    'NotoSerifTC_700Bold',
  // 拉丁字
  latin:        'Fraunces_300Light',
  latinMed:     'Fraunces_500Medium',
  latinItalic:  'InstrumentSerif_400Regular_Italic',  // 舊組件相容（新設計不再用斜體大標）
  // 等寬
  mono:         'JetBrainsMono_400Regular',
};

// Keep legacy export name for files not yet updated
export const themeColors = T;
