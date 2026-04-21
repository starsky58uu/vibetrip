// VibeTrip design system — Japanese literary / washi paper aesthetic
export const T = {
  // Base palette
  paper:    '#F5EFE3',   // --paper
  paper2:   '#EDE1C9',  // --paper-2 (warmer)
  card:     '#FAF6EE',  // --card
  ink:      '#1C1A17',  // --ink
  ink2:     '#4A4540',  // --ink-2
  ink3:     '#8A8278',  // --ink-3
  ink4:     '#C0B9AF',  // --ink-4
  line:     '#DDD5C8',  // --line (borders)

  // Brand accents
  accent:     '#C85A3B',  // 柿橘 (persimmon orange) — --accent
  accentDeep: '#8B3A22',  // --accent-deep
  moss:       '#6E7A4B',  // 苔綠 (moss green) — --moss
  indigo:     '#3E5873',  // 藍墨 (ink blue) — --indigo
  stamp:      '#B83232',  // 印章紅 — --stamp
  tea:        '#8B7A5E',  // 茶 (tea brown)

  // Semantic aliases for legacy code
  background:  '#F5EFE3',
  textMain:    '#1C1A17',
  textSub:     '#8A8278',
  accentMain:  '#C85A3B',
  accentSub:   '#6E7A4B',
  border:      '#DDD5C8',
  cardBg:      '#FAF6EE',
};

// Typography font family names
export const Fonts = {
  serif:        'ZenOldMincho_400Regular',
  serifBold:    'ZenOldMincho_700Bold',
  latin:        'Fraunces_300Light',
  latinMed:     'Fraunces_500Medium',
  latinItalic:  'InstrumentSerif_400Regular_Italic',
  mono:         'JetBrainsMono_400Regular',
};

// Keep legacy export name for files not yet updated
export const themeColors = T;
