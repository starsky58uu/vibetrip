import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, FlatList, Image,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { T, Fonts } from '../../constants/theme';
import WeatherIcon from '../../components/WeatherIcon';
import useWeather, { owmIconToKind } from '../../hooks/useWeather';
import { useTheme, THEMES, VIBE_STYLES } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { apiGet } from '../../services/apiClient';

const Stack = createNativeStackNavigator();

export default function ProfileScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain"  component={ProfileMain} />
      <Stack.Screen name="Weather"      component={WeatherScreen} />
      <Stack.Screen name="Login"        component={LoginScreen} />
      <Stack.Screen name="MyCapsules"   component={MyCapsulesScreen} />
      <Stack.Screen name="SavedSpots"   component={SavedSpotsScreen} />
    </Stack.Navigator>
  );
}

// ─── Profile Main — 旅人手帖 ─────────────────────────────────────────────────

function ProfileMain({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors, theme, vibeStyle, setTheme, setVibeStyle } = useTheme();
  const { user, isLoggedIn } = useAuth();
  const s = makeStyles(colors);

  const [stats, setStats]               = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [tasteProfile, setTasteProfile] = useState(null);
  const [tasteLoading, setTasteLoading] = useState(false);

  // 計算加入天數（從 user.created_at）
  const joinDays = user?.created_at
    ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000)
    : null;

  const displayName = user?.display_name || user?.username || '訪客旅人';
  const handle      = user ? `@${user.username}` : '尚未登入';
  const avatarChar  = displayName[0].toUpperCase();

  // 載入使用者統計
  useEffect(() => {
    if (!isLoggedIn) { setStats(null); return; }
    setStatsLoading(true);
    apiGet('/api/v1/users/me/stats')
      .then(setStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [isLoggedIn]);

  // 載入 AI 口味分析
  const loadTaste = useCallback(async (refresh = false) => {
    if (!isLoggedIn) { setTasteProfile(null); return; }
    setTasteLoading(true);
    try {
      const data = await apiGet('/api/v1/taste/profile', refresh ? { refresh: 'true' } : {});
      setTasteProfile(data);
    } catch {
      // 沒有 token / 後端未開 → 不顯示，靜默失敗
    } finally {
      setTasteLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => { loadTaste(); }, [loadTaste]);

  const statCells = [
    { l: '足跡', v: isLoggedIn ? (stats?.spots_count ?? '…') : '—' },
    { l: '收藏', v: isLoggedIn ? (stats?.saved_count  ?? '…') : '—' },
    { l: '天',   v: joinDays != null ? joinDays : '—' },
  ];

  return (
    <ScrollView
      style={[s.container, { paddingTop: insets.top }]}
      contentContainerStyle={s.profileContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <Text style={s.issueLabel}>ISSUE · 043</Text>
      <Text style={s.pageTitle}>旅人手帖</Text>
      <Text style={s.pageSubtitle}>the wanderer's journal</Text>

      {/* ── Profile card ── */}
      <View style={s.profileCard}>
        <View style={[s.avatar, !isLoggedIn && { backgroundColor: colors.ink3 }]}>
          <Text style={s.avatarText}>{avatarChar}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.profileName}>{displayName}</Text>
          <Text style={s.profileHandle}>{handle}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={[s.editBtn, { borderColor: colors.line }]}
        >
          <Text style={[s.editBtnText, { color: colors.ink }]}>
            {isLoggedIn ? '編輯' : '登入'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── AI taste card ── */}
      <View style={s.tasteCard}>
        {/* 標題列 + 重新分析按鈕 */}
        <View style={s.tasteLabelRow}>
          <Text style={s.tasteLabel}>AI 口味分析</Text>
          {tasteProfile?.generated && !tasteLoading && (
            <TouchableOpacity onPress={() => loadTaste(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="refresh-outline" size={14} color={colors.ink3} />
            </TouchableOpacity>
          )}
        </View>

        {/* 未登入 */}
        {!isLoggedIn && (
          <Text style={s.tasteText}>「登入後，AI 解讀你的城市漫遊個性」</Text>
        )}

        {/* 載入中 */}
        {isLoggedIn && tasteLoading && (
          <View style={{ alignItems: 'center', paddingVertical: 14 }}>
            <ActivityIndicator color={colors.ink3} />
            <Text style={[s.tasteHint, { marginTop: 8 }]}>AI 分析中…</Text>
          </View>
        )}

        {/* 足跡不足（generated: false） */}
        {isLoggedIn && !tasteLoading && tasteProfile && !tasteProfile.generated && (
          <>
            <Text style={s.tasteText}>「{tasteProfile.headline}」</Text>
            <Text style={s.tasteHint}>{tasteProfile.subtitle}</Text>
          </>
        )}

        {/* AI 完整分析 */}
        {isLoggedIn && !tasteLoading && tasteProfile?.generated && (
          <>
            <Text style={s.tasteText}>
              「{tasteProfile.headline}，{'\n'}
              {tasteProfile.subtitle}」
            </Text>

            {/* 漫遊人格標籤 */}
            {tasteProfile.roaming_style ? (
              <View style={s.tasteStyleBadge}>
                <Text style={s.tasteStyleText}>{tasteProfile.roaming_style}</Text>
              </View>
            ) : null}

            {/* 標籤群 */}
            {tasteProfile.tags?.length > 0 && (
              <View style={s.tasteTagsRow}>
                {tasteProfile.tags.map((tag, i) => (
                  <Text key={i} style={s.tasteTag}>#{tag}</Text>
                ))}
              </View>
            )}

            {/* Vibe 偏好 */}
            {tasteProfile.top_vibes?.length > 0 && (
              <Text style={s.tasteVibes}>
                偏好 Vibe · {tasteProfile.top_vibes.join(' / ')}
              </Text>
            )}
          </>
        )}
      </View>

      {/* ── Stats grid ── */}
      <View style={s.statsGrid}>
        {statCells.map((x, i) => (
          <View key={i} style={s.statCell}>
            {statsLoading && i < 2
              ? <ActivityIndicator size="small" color={colors.ink3} style={{ height: 28 }} />
              : <Text style={s.statVal}>{x.v}</Text>
            }
            <Text style={s.statLab}>{x.l}</Text>
          </View>
        ))}
      </View>

      {/* ── Menu ── */}
      <View style={s.menuCard}>
        {[
          {
            label: '我的膠囊',
            badge: isLoggedIn ? (stats?.spots_count != null ? String(stats.spots_count) : '…') : '—',
            onPress: isLoggedIn ? () => navigation.navigate('MyCapsules') : () => navigation.navigate('Login'),
          },
          {
            label: '收藏的地標',
            badge: isLoggedIn ? (stats?.saved_count != null ? String(stats.saved_count) : '…') : '—',
            onPress: isLoggedIn ? () => navigation.navigate('SavedSpots') : () => navigation.navigate('Login'),
          },
          { label: '天氣通知',  badge: '開', onPress: () => navigation.navigate('Weather') },
          { label: '帳號與登入', badge: '→', onPress: () => navigation.navigate('Login') },
        ].map((item, i, arr) => (
          <TouchableOpacity
            key={i}
            style={[s.menuRow, i < arr.length - 1 && s.menuRowBorder]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <Text style={s.menuLabel}>{item.label}</Text>
            <Text style={s.menuBadge}>{item.badge}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Appearance settings ── */}
      <Text style={s.sectionTitle}>外觀設定</Text>

      {/* Theme picker */}
      <View style={s.settingCard}>
        <Text style={s.settingLabel}>主題色調</Text>
        <View style={s.themeRow}>
          {THEMES.map(t => {
            const isActive = theme === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTheme(t.key)}
                activeOpacity={0.7}
                style={[
                  s.themeChip,
                  {
                    backgroundColor: t.swatch,
                    borderColor: isActive ? t.dot : colors.line,
                    borderWidth: isActive ? 2 : 1,
                  },
                ]}
              >
                <View style={[s.themeDot, { backgroundColor: t.dot }]} />
                <Text style={[s.themeChipText, { color: isActive ? t.dot : colors.ink2 }]}>
                  {t.zh}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Vibe style picker */}
      <View style={[s.settingCard, { marginTop: 10 }]}>
        <Text style={s.settingLabel}>Vibe 按鈕樣式</Text>
        <View style={s.vibeStyleRow}>
          {VIBE_STYLES.map(v => {
            const isActive = vibeStyle === v.key;
            return (
              <TouchableOpacity
                key={v.key}
                onPress={() => setVibeStyle(v.key)}
                activeOpacity={0.7}
                style={[
                  s.vibeStyleBtn,
                  {
                    backgroundColor: isActive ? colors.ink : 'transparent',
                    borderColor: isActive ? colors.ink : colors.line,
                  },
                ]}
              >
                <Text style={[s.vibeStyleText, { color: isActive ? colors.paper : colors.ink2 }]}>
                  {v.zh}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[s.settingHint, { color: colors.ink3 }]}>
          設定後主頁的 Vibe 選擇器會切換樣式
        </Text>
      </View>

      <Text style={s.footer}>VibeTrip · NO.247 · 信義區漫遊</Text>
    </ScrollView>
  );
}

// ─── My Capsules Screen ───────────────────────────────────────────────────────

function MyCapsulesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const ws = makeWsStyles(colors);
  const cs = makeCsStyles(colors);

  const [spots, setSpots]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/v1/spots/personal')
      .then(setSpots)
      .catch(() => setSpots([]))
      .finally(() => setLoading(false));
  }, []);

  const renderItem = useCallback(({ item }) => (
    <View style={cs.card}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={cs.cardImage} />
      ) : (
        <View style={[cs.cardImagePlaceholder, { backgroundColor: colors.paper2 }]}>
          <Ionicons name="camera-outline" size={28} color={colors.ink3} />
        </View>
      )}
      <View style={cs.cardBody}>
        <Text style={[cs.cardNote, { color: colors.ink2 }]} numberOfLines={4}>
          {item.note || '（無備註）'}
        </Text>
        <View style={cs.cardMeta}>
          <Ionicons name={item.is_public ? 'earth-outline' : 'lock-closed-outline'} size={12} color={colors.ink3} />
          <Text style={[cs.cardMetaText, { color: colors.ink3 }]}>
            {item.is_public ? '已公開' : '私人'} · {new Date(item.created_at).toLocaleDateString('zh-TW')}
          </Text>
        </View>
      </View>
    </View>
  ), [colors]);

  return (
    <View style={[ws.container, { paddingTop: insets.top }]}>
      <View style={ws.navRow}>
        <TouchableOpacity style={ws.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={ws.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={ws.navLabel}>MY CAPSULES</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={cs.center}>
          <ActivityIndicator size="large" color={colors.ink3} />
        </View>
      ) : spots.length === 0 ? (
        <View style={cs.center}>
          <Ionicons name="camera-outline" size={48} color={colors.ink4} />
          <Text style={[cs.emptyText, { color: colors.ink3 }]}>還沒有足跡膠囊</Text>
          <Text style={[cs.emptyHint, { color: colors.ink4 }]}>到地圖長按新增你的第一個足跡</Text>
        </View>
      ) : (
        <FlatList
          data={spots}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ─── Saved Spots Screen ───────────────────────────────────────────────────────

function SavedSpotsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const ws = makeWsStyles(colors);
  const cs = makeCsStyles(colors);

  const [spots, setSpots]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/v1/spots/saved')
      .then(setSpots)
      .catch(() => setSpots([]))
      .finally(() => setLoading(false));
  }, []);

  function timeAgo(isoStr) {
    const diff = Date.now() - new Date(isoStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return '剛剛';
    if (m < 60) return `${m} 分鐘前`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} 小時前`;
    const d = Math.floor(h / 24);
    return d === 1 ? '昨天' : `${d} 天前`;
  }

  const renderItem = useCallback(({ item }) => {
    const author = item.author;
    return (
      <View style={cs.card}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={cs.cardImage} />
        ) : null}
        <View style={cs.cardBody}>
          {/* 作者列 */}
          <View style={cs.authorRow}>
            <View style={[cs.avatar, { backgroundColor: colors.accent }]}>
              <Text style={[cs.avatarText, { color: colors.paper }]}>
                {(author.display_name || author.username || '?')[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[cs.authorName, { color: colors.ink }]}>{author.display_name || author.username}</Text>
              <Text style={[cs.authorTime, { color: colors.ink3 }]}>@{author.username} · {timeAgo(item.created_at)}</Text>
            </View>
            <Ionicons name="bookmark" size={16} color={colors.accent} />
          </View>
          <Text style={[cs.cardNote, { color: colors.ink2 }]} numberOfLines={3}>{item.content}</Text>
          <View style={cs.cardMeta}>
            <Ionicons name="heart-outline" size={12} color={colors.ink3} />
            <Text style={[cs.cardMetaText, { color: colors.ink3 }]}>{item.likes_count}</Text>
            <Ionicons name="bookmark-outline" size={12} color={colors.ink3} style={{ marginLeft: 10 }} />
            <Text style={[cs.cardMetaText, { color: colors.ink3 }]}>{item.saves_count}</Text>
          </View>
        </View>
      </View>
    );
  }, [colors]);

  return (
    <View style={[ws.container, { paddingTop: insets.top }]}>
      <View style={ws.navRow}>
        <TouchableOpacity style={ws.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={ws.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={ws.navLabel}>SAVED SPOTS</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={cs.center}>
          <ActivityIndicator size="large" color={colors.ink3} />
        </View>
      ) : spots.length === 0 ? (
        <View style={cs.center}>
          <Ionicons name="bookmark-outline" size={48} color={colors.ink4} />
          <Text style={[cs.emptyText, { color: colors.ink3 }]}>還沒有收藏的地標</Text>
          <Text style={[cs.emptyHint, { color: colors.ink4 }]}>到探索頁點收藏來蒐集喜歡的地方</Text>
        </View>
      ) : (
        <FlatList
          data={spots}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ─── Weather Screen ───────────────────────────────────────────────────────────

function formatHour(timeStr, isFirst) {
  if (isFirst) return '現在';
  const d = new Date(timeStr);
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}

function formatDay(dateStr) {
  const today    = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (dateStr === today)    return '今日';
  if (dateStr === tomorrow) return '明日';
  const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  return days[new Date(dateStr).getDay()];
}

function WeatherScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const ws = makeWsStyles(colors);
  const { current, forecast, loading } = useWeather();

  const dailyRain = useMemo(() => {
    if (!forecast) return {};
    const map = {};
    forecast.hourly.forEach(h => {
      const date = new Date(h.time).toISOString().slice(0, 10);
      if (map[date] === undefined || h.precipitation_prob > map[date]) {
        map[date] = h.precipitation_prob;
      }
    });
    return map;
  }, [forecast]);

  const now       = new Date();
  const dateLabel = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toUpperCase();
  const timeLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const heroKind  = current ? owmIconToKind(current.icon) : 'partly';
  const hours     = forecast ? forecast.hourly.slice(0, 8) : [];
  const days      = forecast ? forecast.daily : [];

  return (
    <View style={[ws.container, { paddingTop: insets.top }]}>
      <View style={ws.navRow}>
        <TouchableOpacity style={ws.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={ws.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={ws.navLabel}>WEATHER · {current?.district?.toUpperCase() ?? '—'}</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading && !current ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={{ fontFamily: Fonts.serif, fontSize: 14, color: colors.ink2 }}>讀取天氣中…</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {/* hero */}
          <Text style={ws.weatherDate}>{timeLabel} · {dateLabel}</Text>
          <View style={ws.weatherHero}>
            <View>
              <Text style={ws.weatherTemp}>{current ? Math.round(current.temperature) : '--'}°</Text>
              <Text style={ws.weatherCond}>
                {current ? `${current.description} · 體感 ${Math.round(current.feels_like)}°` : '—'}
              </Text>
            </View>
            <WeatherIcon kind={heroKind} size={80} color="#C4A881" />
          </View>
          {current?.greeting ? (
            <Text style={ws.weatherQuote}>「{current.greeting}」</Text>
          ) : null}

          {/* hourly */}
          <View style={ws.card}>
            <Text style={ws.cardLabel}>HOURLY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={ws.hourlyRow}>
                {hours.map((h, i) => (
                  <View key={i} style={ws.hourItem}>
                    <Text style={ws.hourTime}>{formatHour(h.time, i === 0)}</Text>
                    <WeatherIcon kind={owmIconToKind(h.icon)} size={22} color={colors.ink2} />
                    <Text style={ws.hourTemp}>{Math.round(h.temperature)}°</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* daily */}
          <View style={[ws.card, { marginTop: 12 }]}>
            <Text style={ws.cardLabel}>{days.length}-DAY FORECAST</Text>
            {days.map((d, i) => {
              const rainPct = Math.round((dailyRain[d.date] ?? 0) * 100);
              return (
                <View key={i} style={[ws.dayRow, i > 0 && ws.dayRowBorder]}>
                  <Text style={ws.dayName}>{formatDay(d.date)}</Text>
                  <WeatherIcon kind={owmIconToKind(d.icon)} size={20} color={colors.ink2} />
                  <Text style={ws.dayRain}>💧{rainPct}%</Text>
                  <Text style={ws.dayLow}>{Math.round(d.temp_min)}°</Text>
                  <View style={ws.dayBar}>
                    <View style={[ws.dayBarFill, {
                      left: `${Math.max(0, (d.temp_min - 15) * 8)}%`,
                      width: `${Math.min(100, (d.temp_max - d.temp_min) * 8)}%`,
                    }]} />
                  </View>
                  <Text style={ws.dayHigh}>{Math.round(d.temp_max)}°</Text>
                </View>
              );
            })}
          </View>

          {/* detail grid */}
          {current && (
            <View style={ws.detailGrid}>
              {[
                { l: '濕度',  v: current.humidity,               u: '%',   hint: current.humidity > 70 ? '偏濕' : '舒適' },
                { l: '風速',  v: current.wind_speed.toFixed(1),  u: 'm/s', hint: '風速' },
                { l: '氣壓',  v: current.pressure,               u: 'hPa', hint: current.pressure > 1013 ? '高壓' : '低壓' },
                { l: '體感',  v: Math.round(current.feels_like), u: '°',   hint: current.feels_like > current.temperature ? '偏熱' : '偏涼' },
              ].map((x, i) => (
                <View key={i} style={[ws.card, ws.detailCard]}>
                  <Text style={ws.cardLabel}>{x.l.toUpperCase()}</Text>
                  <View style={ws.detailValRow}>
                    <Text style={ws.detailVal}>{x.v}</Text>
                    <Text style={ws.detailUnit}>{x.u}</Text>
                  </View>
                  <Text style={ws.detailHint}>{x.hint}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={ws.credit}>— Powered by OpenWeatherMap —</Text>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const ws = makeWsStyles(colors);
  const ls = makeLsStyles(colors);
  const { login, register, isLoggedIn, user, logout } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername]     = useState('');
  const [email, setEmail]           = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword]     = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (!username || !password) { setError('請填寫帳號與密碼'); return; }
    if (isRegister) {
      if (!email) { setError('請填寫 Email'); return; }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setError('帳號只能使用英文字母、數字和底線（_）'); return;
      }
      if (username.length < 3) { setError('帳號至少需要 3 個字元'); return; }
      if (password.length < 8) { setError('密碼至少需要 8 個字元'); return; }
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register(username, email, password, displayName);
      } else {
        await login(username, password);
      }
      navigation.goBack();
    } catch (e) {
      if (!isRegister) {
        setError('帳號或密碼錯誤');
        return;
      }
      if (e.status === 422 && e.detail?.detail) {
        const issues = Array.isArray(e.detail.detail) ? e.detail.detail : [];
        const msgs = issues.map(i => {
          const field = i.loc?.[i.loc.length - 1] ?? '';
          if (field === 'username') return '帳號只能使用英文字母、數字和底線，且長度 3–32';
          if (field === 'password') return '密碼至少需要 8 個字元';
          if (field === 'email')    return 'Email 格式不正確';
          return i.msg ?? '輸入格式有誤';
        });
        setError(msgs.join('\n') || '輸入格式有誤，請重新確認');
      } else if (e.status === 409) {
        setError('此帳號或 Email 已被使用');
      } else {
        setError('註冊失敗，請稍後再試');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── 已登入狀態 ───────────────────────────────────────────────────────────
  if (isLoggedIn) {
    return (
      <View style={[ws.container, { paddingTop: insets.top }]}>
        <View style={ws.navRow}>
          <TouchableOpacity style={ws.iconBtn} onPress={() => navigation.goBack()}>
            <Text style={ws.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={ws.navLabel}>ACCOUNT</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={ls.loggedInWrap}>
          <View style={ls.loggedInAvatar}>
            <Text style={ls.loggedInAvatarText}>
              {(user?.display_name || user?.username || '?')[0].toUpperCase()}
            </Text>
          </View>
          <Text style={ls.loggedInName}>{user?.display_name || user?.username}</Text>
          <Text style={ls.loggedInSub}>@{user?.username}</Text>
          <TouchableOpacity style={ls.logoutBtn} onPress={logout} activeOpacity={0.8}>
            <Text style={ls.logoutText}>登出</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[ws.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={ws.navRow}>
        <TouchableOpacity style={ws.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={ws.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={ws.navLabel}>{isRegister ? 'SIGN UP' : 'SIGN IN'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={ls.loginContent}>
        {/* toggle */}
        <View style={ls.loginToggle}>
          {[{ l: '登入', v: false }, { l: '註冊', v: true }].map(btn => (
            <TouchableOpacity
              key={String(btn.v)}
              style={[ls.toggleBtn, isRegister === btn.v && ls.toggleBtnActive]}
              onPress={() => { setIsRegister(btn.v); setError(''); }}
            >
              <Text style={[ls.toggleText, isRegister === btn.v && ls.toggleTextActive]}>
                {btn.l}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={ls.loginTitle}>{isRegister ? '建立帳號' : '歡迎回來'}</Text>
        <Text style={ls.loginSub}>
          {isRegister ? '開始記錄你的漫遊足跡' : '繼續探索台灣的角落'}
        </Text>

        {isRegister && (
          <>
            <View style={ls.field}>
              <Text style={ls.fieldLabel}>DISPLAY NAME</Text>
              <TextInput
                style={ls.fieldInput}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="你的漫遊代號"
                placeholderTextColor={T.ink4}
              />
            </View>
            <View style={ls.field}>
              <Text style={ls.fieldLabel}>EMAIL</Text>
              <TextInput
                style={ls.fieldInput}
                value={email}
                onChangeText={setEmail}
                placeholder="hello@vibetrip.app"
                placeholderTextColor={T.ink4}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </>
        )}

        <View style={ls.field}>
          <Text style={ls.fieldLabel}>USERNAME</Text>
          <TextInput
            style={ls.fieldInput}
            value={username}
            onChangeText={setUsername}
            placeholder="user_0808"
            placeholderTextColor={T.ink4}
            autoCapitalize="none"
          />
          {isRegister && (
            <Text style={ls.fieldHint}>僅限英文字母、數字、底線（_），3–32 字元</Text>
          )}
        </View>

        <View style={ls.field}>
          <Text style={ls.fieldLabel}>PASSWORD</Text>
          <TextInput
            style={ls.fieldInput}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={T.ink4}
            secureTextEntry
          />
          {isRegister && (
            <Text style={ls.fieldHint}>至少 8 個字元</Text>
          )}
        </View>

        {!!error && <Text style={ls.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[ls.submitBtn, loading && { opacity: 0.6 }]}
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={T.paper} />
            : <Text style={ls.submitText}>{isRegister ? '建立帳號 →' : '登入 →'}</Text>
          }
        </TouchableOpacity>

        <View style={ls.dividerRow}>
          <View style={ls.dividerLine} />
          <Text style={ls.dividerText}>或</Text>
          <View style={ls.dividerLine} />
        </View>

        <TouchableOpacity style={ls.socialBtn} activeOpacity={0.7}
          onPress={() => navigation.goBack()}>
          <Text style={ls.socialBtnIcon}>○</Text>
          <Text style={ls.socialBtnText}>訪客模式（不登入）</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Dynamic styles (profile main) ───────────────────────────────────────────

function makeStyles(C) {
  return StyleSheet.create({
    container:      { flex: 1, backgroundColor: C.paper },
    profileContent: { padding: 20, paddingBottom: 50 },

    issueLabel:  { fontFamily: Fonts.mono,   fontSize: 9,  color: C.ink3, letterSpacing: 5, marginBottom: 4 },
    pageTitle:   { fontFamily: Fonts.serifBold, fontSize: 32, color: C.ink, lineHeight: 38, letterSpacing: 0.5 },
    pageSubtitle:{ fontFamily: Fonts.latinItalic, fontSize: 14, color: C.tea, marginTop: 2, marginBottom: 20 },

    profileCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
      borderRadius: 18, padding: 16, marginBottom: 12,
    },
    avatar: {
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: C.accent,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText:   { fontFamily: Fonts.serifBold, fontSize: 20, color: '#fff' },
    profileName:  { fontFamily: Fonts.serifBold, fontSize: 16, color: C.ink },
    profileHandle:{ fontFamily: Fonts.mono,      fontSize: 10, color: C.ink3, marginTop: 3, letterSpacing: 1 },
    editBtn:      { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 100, borderWidth: 1 },
    editBtnText:  { fontFamily: Fonts.serif, fontSize: 11 },

    tasteCard:  {
      backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
      borderRadius: 18, padding: 16, marginBottom: 12,
    },
    tasteLabelRow: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: 6,
    },
    tasteLabel:    { fontFamily: Fonts.mono, fontSize: 9, color: C.ink3, letterSpacing: 4 },
    tasteText:     { fontFamily: Fonts.serifBold, fontSize: 16, color: C.ink, lineHeight: 26 },
    tasteHint:     { fontFamily: Fonts.serif, fontSize: 12, color: C.ink3, marginTop: 4 },
    tasteStyleBadge: {
      alignSelf: 'flex-start', marginTop: 12,
      backgroundColor: C.accent, borderRadius: 100,
      paddingVertical: 4, paddingHorizontal: 12,
    },
    tasteStyleText: { fontFamily: Fonts.serifBold, fontSize: 11, color: C.paper, letterSpacing: 0.5 },
    tasteTagsRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
    tasteTag:      { fontFamily: Fonts.mono, fontSize: 10, color: C.ink3, letterSpacing: 1 },
    tasteVibes:    { fontFamily: Fonts.serif, fontSize: 11, color: C.ink3, marginTop: 8 },

    statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    statCell: {
      flex: 1,
      backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
      borderRadius: 14, paddingVertical: 12, alignItems: 'center',
    },
    statVal:  { fontFamily: Fonts.latin,  fontSize: 22, fontWeight: '500', color: C.ink, minHeight: 28, textAlignVertical: 'center' },
    statLab:  { fontFamily: Fonts.mono,   fontSize: 9,  color: C.ink3, marginTop: 3, letterSpacing: 2 },

    menuCard: {
      backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
      borderRadius: 18, overflow: 'hidden', marginBottom: 24,
    },
    menuRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
    menuRowBorder: { borderBottomWidth: 1, borderBottomColor: C.line, borderStyle: 'dashed' },
    menuLabel:     { flex: 1, fontFamily: Fonts.serif, fontSize: 14, color: C.ink },
    menuBadge:     { fontFamily: Fonts.mono, fontSize: 10, color: C.ink3 },

    sectionTitle: {
      fontFamily: Fonts.mono, fontSize: 9, color: C.ink3,
      letterSpacing: 4, marginBottom: 10,
    },
    settingCard: {
      backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
      borderRadius: 18, padding: 16, marginBottom: 0,
    },
    settingLabel: { fontFamily: Fonts.mono, fontSize: 9, color: C.ink3, letterSpacing: 3, marginBottom: 12 },
    settingHint:  { fontFamily: Fonts.serif, fontSize: 11, marginTop: 10 },

    themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    themeChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingVertical: 8, paddingHorizontal: 12, borderRadius: 100,
    },
    themeDot:      { width: 10, height: 10, borderRadius: 5 },
    themeChipText: { fontFamily: Fonts.serif, fontSize: 12 },

    vibeStyleRow: { flexDirection: 'row', gap: 8 },
    vibeStyleBtn: {
      flex: 1, paddingVertical: 10, borderRadius: 100, borderWidth: 1,
      alignItems: 'center',
    },
    vibeStyleText: { fontFamily: Fonts.serif, fontSize: 13 },

    footer: {
      fontFamily: Fonts.mono, fontSize: 9, color: C.ink4,
      letterSpacing: 3, textAlign: 'center', marginTop: 28,
    },
  });
}

// ─── Dynamic styles for Weather sub-screen ────────────────────────────────────

function makeWsStyles(C) {
  return StyleSheet.create({
    container:   { flex: 1, backgroundColor: C.paper },
    navRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8 },
    navLabel:    { fontFamily: Fonts.mono, fontSize: 9, color: C.ink3, letterSpacing: 4 },
    iconBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: C.paper2, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
    backArrow:   { fontSize: 24, color: C.ink2, marginTop: -2 },

    weatherDate: { fontFamily: Fonts.mono, fontSize: 10, color: C.ink3, letterSpacing: 3 },
    weatherHero: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginTop: 6, marginBottom: 14 },
    weatherTemp: { fontFamily: Fonts.latin, fontSize: 80, fontWeight: '300', color: C.ink, lineHeight: 80 },
    weatherCond: { fontFamily: Fonts.serif, fontSize: 14, color: C.ink2, marginTop: 4 },
    weatherQuote:{ fontFamily: Fonts.latinItalic, fontSize: 15, color: C.tea, lineHeight: 22, marginBottom: 16 },

    card:        { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 14 },
    cardLabel:   { fontFamily: Fonts.mono, fontSize: 9, color: C.ink3, letterSpacing: 3, marginBottom: 10 },
    hourlyRow:   { flexDirection: 'row', gap: 18 },
    hourItem:    { alignItems: 'center', minWidth: 44 },
    hourTime:    { fontFamily: Fonts.mono, fontSize: 10, color: C.ink3, marginBottom: 6 },
    hourTemp:    { fontFamily: Fonts.latin, fontSize: 15, fontWeight: '500', color: C.ink, marginTop: 4 },

    dayRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    dayRowBorder:{ borderTopWidth: 1, borderTopColor: C.line, borderStyle: 'dashed' },
    dayName:     { fontFamily: Fonts.serif, fontSize: 13, color: C.ink, width: 42 },
    dayRain:     { fontFamily: Fonts.mono, fontSize: 10, color: C.indigo, width: 46 },
    dayLow:      { fontFamily: Fonts.latin, fontSize: 13, color: C.ink3 },
    dayBar:      { flex: 1, height: 4, backgroundColor: C.paper2, borderRadius: 4, overflow: 'hidden', position: 'relative' },
    dayBarFill:  { position: 'absolute', top: 0, bottom: 0, backgroundColor: C.accent, borderRadius: 4 },
    dayHigh:     { fontFamily: Fonts.latin, fontSize: 13, color: C.ink, fontWeight: '500', width: 26, textAlign: 'right' },

    detailGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
    detailCard:  { width: '47.5%', padding: 12 },
    detailValRow:{ flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 4 },
    detailVal:   { fontFamily: Fonts.latin, fontSize: 24, fontWeight: '500', color: C.ink },
    detailUnit:  { fontFamily: Fonts.mono, fontSize: 10, color: C.ink3 },
    detailHint:  { fontFamily: Fonts.serif, fontSize: 11, color: C.ink2, marginTop: 2 },
    credit:      { fontFamily: Fonts.latinItalic, fontSize: 11, color: C.ink4, textAlign: 'center', marginTop: 14 },
  });
}

// ─── Dynamic styles for MyCapsules / SavedSpots ───────────────────────────────

function makeCsStyles(C) {
  return StyleSheet.create({
    center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 60 },
    emptyText:   { fontFamily: Fonts.serifBold, fontSize: 16, marginTop: 8 },
    emptyHint:   { fontFamily: Fonts.serif, fontSize: 13, textAlign: 'center', maxWidth: 240 },

    card:        { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 18, overflow: 'hidden', marginBottom: 14 },
    cardImage:   { width: '100%', height: 180, resizeMode: 'cover' },
    cardImagePlaceholder: { width: '100%', height: 120, alignItems: 'center', justifyContent: 'center' },
    cardBody:    { padding: 14 },
    cardNote:    { fontFamily: Fonts.serif, fontSize: 14, lineHeight: 21, marginBottom: 10 },
    cardMeta:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
    cardMetaText:{ fontFamily: Fonts.mono, fontSize: 10 },

    authorRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    avatar:      { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    avatarText:  { fontFamily: Fonts.serifBold, fontSize: 14 },
    authorName:  { fontFamily: Fonts.serifBold, fontSize: 13 },
    authorTime:  { fontFamily: Fonts.mono, fontSize: 10, marginTop: 1 },
  });
}

// ─── Dynamic styles for Login sub-screen ─────────────────────────────────────

function makeLsStyles(C) {
  return StyleSheet.create({
    loginContent: { padding: 20, paddingBottom: 40 },
    loginToggle:  { flexDirection: 'row', backgroundColor: C.paper2, borderRadius: 100, padding: 4, marginBottom: 28 },
    toggleBtn:    { flex: 1, paddingVertical: 9, borderRadius: 100, alignItems: 'center' },
    toggleBtnActive: { backgroundColor: C.ink },
    toggleText:      { fontFamily: Fonts.serif, fontSize: 13, color: C.ink2 },
    toggleTextActive:{ color: C.paper },
    loginTitle:   { fontFamily: Fonts.serifBold, fontSize: 24, color: C.ink, marginBottom: 6 },
    loginSub:     { fontFamily: Fonts.serif, fontSize: 13, color: C.ink2, marginBottom: 28, lineHeight: 20 },

    field:        { marginBottom: 16 },
    fieldLabel:   { fontFamily: Fonts.mono, fontSize: 9, color: C.ink3, letterSpacing: 3, marginBottom: 7 },
    fieldInput:   { borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontFamily: Fonts.serif, fontSize: 14, color: C.ink, backgroundColor: C.card },
    fieldHint:    { fontFamily: Fonts.mono, fontSize: 9, color: C.ink4, marginTop: 5, letterSpacing: 0.5 },

    submitBtn:    { backgroundColor: C.ink, borderRadius: 100, paddingVertical: 15, alignItems: 'center', marginTop: 4, marginBottom: 24 },
    submitText:   { fontFamily: Fonts.serifBold, fontSize: 15, color: C.paper, letterSpacing: 1 },

    dividerRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    dividerLine:  { flex: 1, height: 1, backgroundColor: C.line },
    dividerText:  { fontFamily: Fonts.serif, fontSize: 12, color: C.ink3 },

    socialBtn:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 10, backgroundColor: C.card },
    socialBtnIcon:{ fontFamily: Fonts.serif, fontSize: 16, width: 22, textAlign: 'center', color: C.ink },
    socialBtnText:{ fontFamily: Fonts.serif, fontSize: 14, color: C.ink },

    errorText:    { fontFamily: Fonts.serif, fontSize: 13, color: C.stamp, marginBottom: 12, textAlign: 'center' },

    loggedInWrap:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
    loggedInAvatar:    { width: 80, height: 80, borderRadius: 40, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    loggedInAvatarText:{ fontFamily: Fonts.serifBold, fontSize: 30, color: C.paper },
    loggedInName:      { fontFamily: Fonts.serifBold, fontSize: 20, color: C.ink, marginBottom: 4 },
    loggedInSub:       { fontFamily: Fonts.mono, fontSize: 12, color: C.ink3, letterSpacing: 2, marginBottom: 32 },
    logoutBtn:         { borderWidth: 1, borderColor: C.line, borderRadius: 100, paddingVertical: 10, paddingHorizontal: 28 },
    logoutText:        { fontFamily: Fonts.serif, fontSize: 14, color: C.ink2 },
  });
}
