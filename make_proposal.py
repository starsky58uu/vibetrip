# VibeTrip 初賽企劃書產生器
# 執行：python make_proposal.py
# 輸出：C:\\Users\\Bee\\Desktop\\VibeTrip_企劃書.docx

from docx import Document
from docx.shared import Pt, Cm, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import copy

# ── 顏色常數 ──────────────────────────────────────────────────────────────────
BLUE_DARK  = RGBColor(0x1A, 0x3A, 0x5C)   # 深藍（標題）
BLUE_MID   = RGBColor(0x2E, 0x6D, 0xB4)   # 中藍（小標）
GRAY_TEXT  = RGBColor(0x44, 0x44, 0x44)   # 正文灰
BLACK      = RGBColor(0x1C, 0x1C, 0x1C)

def set_cell_bg(cell, hex_color: str):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    tcPr.append(shd)

def set_cell_border(cell, **kwargs):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for edge in ('top','left','bottom','right'):
        tag = OxmlElement(f'w:{edge}')
        tag.set(qn('w:val'), 'single')
        tag.set(qn('w:sz'), '4')
        tag.set(qn('w:color'), 'C0C0C0')
        tcBorders.append(tag)
    tcPr.append(tcBorders)

doc = Document()

# ── 頁面設定（A4）────────────────────────────────────────────────────────────
section = doc.sections[0]
section.page_width  = Cm(21)
section.page_height = Cm(29.7)
section.left_margin = section.right_margin = Cm(2.5)
section.top_margin  = section.bottom_margin = Cm(2.2)

# ── 全域樣式 ──────────────────────────────────────────────────────────────────
style_normal = doc.styles['Normal']
style_normal.font.name = '微軟正黑體'
style_normal.font.size = Pt(10.5)
style_normal.font.color.rgb = GRAY_TEXT
style_normal.paragraph_format.space_after = Pt(4)

def h1(text):
    """章節標題 — 純黑粗體，不加底線"""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after  = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.bold = True
    run.font.size = Pt(14)
    run.font.color.rgb = BLACK
    run.font.name = '微軟正黑體'
    return p

def h2(text):
    """段落小標 — 粗體，比章節小一階，不上色"""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after  = Pt(2)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.bold = True
    run.font.size = Pt(11.5)
    run.font.color.rgb = BLACK
    run.font.name = '微軟正黑體'
    return p

def body(text, bold=False, indent=False):
    """正文段落 — 黑字、正規行高 1.5"""
    p = doc.add_paragraph()
    if indent:
        p.paragraph_format.first_line_indent = Cm(0.85)
    p.paragraph_format.space_after  = Pt(4)
    p.paragraph_format.line_spacing = 1.5
    run = p.add_run(text)
    run.font.size = Pt(10.5)
    run.font.name = '微軟正黑體'
    run.font.color.rgb = BLACK
    run.bold = bold
    return p

def bullet(text, level=0):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.left_indent  = Cm(0.7 + level * 0.5)
    p.paragraph_format.space_after  = Pt(2)
    p.paragraph_format.line_spacing = 1.4
    run = p.add_run(text)
    run.font.size = Pt(10.5)
    run.font.name = '微軟正黑體'
    run.font.color.rgb = BLACK
    return p

def make_table(headers, rows, col_widths=None, header_bg=None):
    """簡潔表格 — 黑色細邊框、淺灰 header、無交替底色"""
    table = doc.add_table(rows=1+len(rows), cols=len(headers))
    table.style = 'Table Grid'
    # Header
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = h
        run = cell.paragraphs[0].runs[0]
        run.bold = True
        run.font.color.rgb = BLACK
        run.font.size = Pt(10)
        run.font.name = '微軟正黑體'
        set_cell_bg(cell, 'EEEEEE')
    # Rows
    for ri, row_data in enumerate(rows):
        for ci, val in enumerate(row_data):
            cell = table.rows[ri+1].cells[ci]
            cell.text = val
            run = cell.paragraphs[0].runs[0]
            run.font.size = Pt(10)
            run.font.name = '微軟正黑體'
            run.font.color.rgb = BLACK
    if col_widths:
        for i, w in enumerate(col_widths):
            for row in table.rows:
                row.cells[i].width = Cm(w)
    doc.add_paragraph()
    return table

# ══════════════════════════════════════════════════════════════════════════════
# 封面
# ══════════════════════════════════════════════════════════════════════════════
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_before = Pt(60)
r = p.add_run('VibeTrip')
r.bold = True; r.font.size = Pt(36); r.font.color.rgb = BLACK; r.font.name = '微軟正黑體'

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('情境感知城市漫遊 App')
r.font.size = Pt(16); r.font.color.rgb = BLACK; r.font.name = '微軟正黑體'

doc.add_paragraph()
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('說走就走　不需規劃　三小時城市漫遊')
r.font.size = Pt(12); r.font.color.rgb = BLACK; r.font.name = '微軟正黑體'

doc.add_paragraph()
doc.add_paragraph()
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
for line in ['初賽企劃書', '製作日期：2026 年 5 月']:
    p.add_run(line + '\n').font.size = Pt(11)
    p.runs[-1].font.name = '微軟正黑體'
    p.runs[-1].font.color.rgb = BLACK

doc.add_page_break()

# ══════════════════════════════════════════════════════════════════════════════
# 一、隊伍名稱
# ══════════════════════════════════════════════════════════════════════════════
h1('一、隊伍名稱')
body('BeeTrip Studio')

# ══════════════════════════════════════════════════════════════════════════════
# 二、作品名稱
# ══════════════════════════════════════════════════════════════════════════════
h1('二、作品名稱')
body('VibeTrip — 情境感知城市漫遊 App', bold=True)

# ══════════════════════════════════════════════════════════════════════════════
# 三、創作動機與目的
# ══════════════════════════════════════════════════════════════════════════════
h1('三、創作動機與目的')

h2('創作動機')
body('你是否曾在下課後、下班後、或一個週末下午突然想出門，卻不知道去哪裡？'
     '打開地圖 App 面對數百筆評論不知從何選起，打開社群媒體只會讓「不知道要去哪裡」'
     '的焦慮感加倍。規劃行程需要時間，而人的衝動往往只有五分鐘。')
body('現有旅遊工具的問題在於：它們都在幫你「規劃」，卻沒有人幫你「決定」。'
     'Google Maps 給你地點但不給你行程；Klook 給你活動但需要預訂；社群平台給你靈感'
     '但讓你選擇困難。沒有任何工具能在三分鐘內告訴你：「現在往東走，先喝杯咖啡，'
     '再逛一間選物店，最後在河邊走走，三小時後回家。」')

h2('設計理念：說走就走，不需規劃')
body('VibeTrip 的核心理念只有一句話——')
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_before = Pt(4)
p.paragraph_format.space_after = Pt(4)
r = p.add_run('「不需要計畫，只需要一個心情，三小時以內，讓城市帶著你走。」')
r.bold = True; r.font.size = Pt(12); r.font.color.rgb = RGBColor(0xC8,0x5A,0x3B)
r.font.name = '微軟正黑體'

body('我們把「三小時」設計為固定時間框架，原因是：')
bullet('足夠短：不需要請假、不需要住宿、不需要大計畫，可以是今天下午的衝動決定')
bullet('足夠長：能走三個有質感的地點，有完整的城市漫遊體驗')
bullet('心理安全感：知道「三小時後我就回家了」，降低出門的心理門檻')

h2('目的')
bullet('讓「說走就走」真的能走——從打開 App 到走出門，不超過一分鐘')
bullet('降低都市人的出遊門檻，把城市變成隨時可探索的遊樂場')
bullet('用 AI 取代「去哪裡好？」的糾結，把選擇的疲憊還給電腦')
bullet('讓自己住的城市也能像陌生城市一樣令人驚喜')

# ══════════════════════════════════════════════════════════════════════════════
# 四、作品構想與特色
# ══════════════════════════════════════════════════════════════════════════════
h1('四、作品構想與特色')

h2('核心流程：三步驟，一分鐘出門')
body('VibeTrip 把整個出遊決策壓縮到三個動作：')

make_table(
    ['步驟', '動作', '時間'],
    [
        ['① 選心情', '從七種 Vibe 中點一個最接近當下心情的', '5 秒'],
        ['② 看行程', 'AI 生成三站式漫遊路線，確認喜歡就出發', '5–15 秒'],
        ['③ 走出去', '開啟 AR 導航，App 帶你走到每一個地點', '即時'],
    ],
    col_widths=[2.5, 9, 2.5],
    header_bg='1A3A5C'
)

h2('七種情緒 Vibe')
body('Vibe 是進入行程的唯一入口，不是「我要去信義區」，而是「我今天的狀態是這樣」：')
make_table(
    ['Vibe', '中文', '漫遊場景'],
    [
        ['☕ Café Drift',   '喝杯咖啡', '獨立咖啡廳 → 選物店 → 老巷弄'],
        ['🍜 Hungry Mood',  '肚子餓了', '在地小吃 → 甜點 → 夜市攤'],
        ['📸 Photo Hunt',   '想拍美照', '老街光影 → 網美咖啡 → 河岸夜景'],
        ['☔ Rain Shelter', '躲雨室內', '書店 → 博物館 → 室內展覽'],
        ['🌿 Slow Walk',    '散步感受', '公園 → 廣場 → 河濱步道'],
        ['🎁 Tiny Gift',    '挑個小物', '文創市集 → 手作工坊 → 老派文具店'],
        ['🎲 Surprise Me',  '隨便都好', 'AI 隨機混搭，完全驚喜'],
    ],
    col_widths=[3.5, 3, 9],
    header_bg='2E6DB4'
)

h2('五大產品特色')

body('① 時段感知推薦', bold=True)
body('App 自動偵測現在幾點，深夜（22:00–05:59）只推薦確實開著的場所'
     '（24h 便利商店、夜市、夜間公園、深夜拉麵），不會出現「去看夕陽」的荒謬建議。'
     '清晨則切換推薦早餐店與晨間公園。', indent=True)

body('② AI 防幻覺地點驗證', bold=True)
body('所有 AI 推薦地點都經過 Google Places 即時比對——如果 AI 捏造了一間不存在的店，'
     '系統自動替換為附近真實評分 3.5 以上的開放地點。推薦的每一站都是真實存在、現在開著的。', indent=True)

body('③ AR 方位導航', bold=True)
body('不是傳統地圖導航，而是透過手機相機疊加方位指示箭頭，'
     '箭頭隨羅盤即時旋轉，直覺地告訴你「往那個方向走」。', indent=True)

body('④ 即時交通整合', bold=True)
body('選擇交通方式時顯示真實資料：YouBike 站點目前可借幾台、'
     '公車還有幾分鐘到、捷運下一班時刻。不是預估，是即時數字。', indent=True)

body('⑤ 搖一搖：同 Vibe 不同行程（轉盤式重抽）', bold=True)
body('對推薦不滿意？搖動手機（觸發加速度感測），系統會繞過快取重新生成。'
     '關鍵是「同一個 Vibe 但每次抽出不同店家組合」——配合多關鍵字隨機抽樣與'
     'Groq 0.75 溫度，每搖一次都像轉盤抽到不同結果，'
     '且每次累加排除上次行程 ID，確保「永遠不會重複拿到同一份」。', indent=True)

# ══════════════════════════════════════════════════════════════════════════════
# 五、與市場現有 App 比較
# ══════════════════════════════════════════════════════════════════════════════
h1('五、與市場現有 App 比較')

make_table(
    ['功能 / 特性', 'Google Maps', 'Klook', 'TripAdvisor', 'VibeTrip'],
    [
        ['說走就走（無需預先規劃）', '✗', '✗', '✗', '✅'],
        ['依當下情緒推薦行程',       '✗', '✗', '✗', '✅'],
        ['AI 即時生成完整路線',      '✗', '✗', '✗', '✅'],
        ['三小時時間框架設計',       '✗', '✗', '✗', '✅'],
        ['時段感知（深夜模式）',     '✗', '✗', '✗', '✅'],
        ['AR 方位導航',              '部分', '✗', '✗', '✅'],
        ['YouBike 即時可借量',       '✗', '✗', '✗', '✅'],
        ['公車 / 捷運即時到站',      '✅', '✗', '✗', '✅'],
        ['防幻覺地點真實驗證',       '—', '—', '—', '✅'],
        ['台灣在地化深度整合',       '部分', '部分', '✗', '✅'],
    ],
    col_widths=[5.5, 2.5, 2.5, 3, 2.5],
    header_bg='1A3A5C'
)

body('【定位差異】VibeTrip 不是地圖工具，也不是訂票平台，'
     '而是「衝動出門的好朋友」——當你突然想出去走走，它是唯一能在一分鐘內幫你決定去哪、'
     '怎麼去、大概玩什麼的工具。')

# ══════════════════════════════════════════════════════════════════════════════
# 六、架構設計說明
# ══════════════════════════════════════════════════════════════════════════════
h1('六、架構設計說明')

h2('系統架構')
body('VibeTrip 採三層式架構：行動端、後端服務、外部資料來源。前端以 React Native 開發，'
     '畫面切分為主頁、行程、AR、探索四個分頁，所有對外請求由統一的 API Client 模組處理；'
     'API Client 內建 JWT 認證、超時控制與錯誤重試。')
body('後端使用 FastAPI 框架，依領域切分為三個服務模組：行程服務（Trip Service）處理盲盒生成、'
     '儲存與查詢；AI 服務（AI Service）封裝對 Groq LLaMA 3.3 的呼叫與後置驗證邏輯；'
     '交通服務（Transit Service）負責即時資料整合與快取。三個模組共用一層 External API Layer，'
     '統一管理 Google Maps、TDX 與 OpenWeatherMap 的呼叫。')
body('資料儲存分為兩層：靜態與長效資料（使用者、足跡、行程記錄）寫入 PostgreSQL 15，'
     '搭配 PostGIS 空間索引以加速地理查詢；高頻變動或外部 API 結果（行程快取、打烊時間、'
     '即時到站等）寫入 Redis，依資料類型設定不同的 TTL（從 30 分鐘到 24 小時）。')

h2('行程生成資料流（多層快取 + 並行優化）')
steps = [
    '① 使用者選擇 Vibe，前端送出 { vibe_key, latitude, longitude, exclude_trip_ids }',
    '② 後端查詢 Redis 行程快取（日間 2 小時 TTL、深夜每小時更新）',
    '   非空 exclude_trip_ids（搖一搖）會跳過此層直接重新生成',
    '③ Cache miss → 把 Vibe query 拆成 6–10 個關鍵字、隨機抽 3 個並行查 Google Places',
    '   每個關鍵字 + 鄰近座標的結果在 Redis 額外快取 1 小時（跨使用者共用）',
    '④ 17:00 後加跑 Place Details 取打烊時間（結果以 place_id 快取 24h）',
    '   過濾掉「現在已關或 15 分鐘內就關」的候選地點',
    '⑤ 候選清單 + 時段限制 Prompt 送入 Groq LLaMA 3.3-70B 生成行程 JSON',
    '⑥ 三道防幻覺後處理：',
    '   ⒜ AI 編造店名 → 自動替換為清單中未使用、評分最高的真實地點',
    '   ⒝ AI 重複選同一家 → 第二次起改成別家（同名去重）',
    '   ⒞ 候選清單耗盡（極端情況）→ 寧可少一站也不重複',
    '⑦ 各站「實際到達時間 + 停留」累加計算，剔除會在打烊前才到的站',
    '⑧ Google Directions 計算真實距離（各段並行，asyncio.gather）',
    '   步行 > 10 分鐘的段落自動查大眾運輸（公車/捷運/YouBike）',
    '⑨ 結果寫入 Redis 行程快取並回傳前端，前端時間軸用當下時間重排顯示',
]
for s in steps:
    bullet(s)

# ══════════════════════════════════════════════════════════════════════════════
# 七、主要功能與技術
# ══════════════════════════════════════════════════════════════════════════════
h1('七、主要功能與技術')

h2('前端技術棧')
make_table(
    ['項目', '技術 / 套件'],
    [
        ['框架',        'React Native 0.81.5 + Expo SDK 54 + React 19'],
        ['套件管理',    'pnpm（only-allow 鎖定，避免 npm/yarn 混用）'],
        ['導航路由',    'React Navigation v7（Bottom Tabs + Native Stack + Material Top Tabs）'],
        ['AR 相機',     'expo-camera（CameraView 即時預覽）'],
        ['GPS + 羅盤',  'expo-location（watchPositionAsync + watchHeadingAsync）'],
        ['加速度感測',  'expo-sensors（Accelerometer 偵測搖一搖）'],
        ['地圖',        'react-native-maps（Google Maps Provider）'],
        ['觸覺回饋',    'expo-haptics（搖一搖、到站提醒）'],
        ['媒體儲存',    'expo-media-library（足跡照片存相簿）'],
        ['安全儲存',    'expo-secure-store（JWT token 加密存於 Keychain / Keystore）'],
        ['動畫',        'React Native Animated API（羅盤箭頭、UI 過場、脈動效果）'],
        ['SVG 繪圖',    'react-native-svg（編號裝飾、圖示）'],
        ['字型',        'Noto Sans TC（黑體 4 weights）、Noto Serif TC、Fraunces、JetBrains Mono'],
    ],
    col_widths=[4, 12],
    header_bg='2E6DB4'
)

h2('後端技術棧')
make_table(
    ['項目', '技術 / 套件'],
    [
        ['框架',      'FastAPI（Python 3.10，全程 async / await）'],
        ['ORM',       'SQLAlchemy 2.0 async + asyncpg + geoalchemy2'],
        ['資料庫',    'PostgreSQL 15 + PostGIS 3.3（地理空間索引）'],
        ['快取',      'Redis 7（多層 TTL：行程 30 分／搜尋 1h／打烊時間 24h）'],
        ['AI 推理',   'Groq API — LLaMA 3.3-70B-Versatile（temperature 0.75，免費方案）'],
        ['HTTP 客戶端','httpx async（外部 API 並行請求）'],
        ['天氣 API',  'OpenWeatherMap（即時天氣 + 7 日預報，影響推薦邏輯）'],
        ['地理 API',  'Google Places（含 Place Details 打烊時間）+ Google Directions'],
        ['交通 API',  'TDX 運輸資料流通服務（公車 / 捷運 / YouBike 即時）'],
        ['認證',      'JWT（Access Token 1h + Refresh Token 30d）+ bcrypt 密碼雜湊'],
        ['容器化',    'Docker + Docker Compose（api / db / redis 三服務）'],
    ],
    col_widths=[4, 12],
    header_bg='2E6DB4'
)

h2('外部 API 整合')
make_table(
    ['API', '用途', '策略'],
    [
        ['Google Places API',     '查詢周邊真實開放店家、Place Details 打烊時間', '後端呼叫，多層 Redis 快取'],
        ['Google Directions API', '步行 / 大眾運輸路線、AR 逐步導航',          '後端代理（前端不持金鑰）'],
        ['TDX 交通資料 API',      '公車即時到站、YouBike 可借還量、捷運時刻',   '後端統一呼叫（前端不再持有 secret）'],
        ['OpenWeatherMap',        '即時天氣 + 7 日預報（影響推薦邏輯與顯示）',   '後端 + 快取'],
        ['Groq Cloud',            'LLaMA 3.3-70B 語言推理',                     '後端呼叫'],
    ],
    col_widths=[4, 6.5, 5.5],
    header_bg='2E6DB4'
)

h2('AI Prompt 設計亮點')
bullet('輸入：vibe 類型、使用者座標、天氣、時段、Google Places 真實店家清單'
       '（包含打烊時間、評分、地址、place_id），以及上次行程的排除清單')
bullet('輸出：結構化 JSON（標題、副標、三站行程各含時間、描述、距離、tag、預估到達時間）')
bullet('時段約束注入：深夜自動加入「嚴禁推薦夕陽 / 日間活動」等強制限制語句；'
       '傍晚 17:00 後加入「確認 arrival_time + dur ≤ 打烊時間；快打烊的排前面」')
bullet('多關鍵字隨機抽樣：vibe 對應的關鍵字字串（如 cafe = "咖啡廳 獨立咖啡 書店 文創小店 公園 文創市集"）'
       '隨機抽 3 個獨立並行打 Google Places，每搖一次組合都不一樣')
bullet('搜尋結果快取：每個關鍵字 + 鄰近座標的結果在 Redis 共用 1 小時，'
       '同地區重複測試成本趨近於零，跨使用者也共用')
bullet('三道防幻覺後置驗證機制：')
bullet('  ⒜ AI 編造店名 → 後處理比對 Google 清單，自動替換為清單中未使用、評分最高的真實地點', level=1)
bullet('  ⒝ AI 把同一家店連寫 3 次 → 同名重複偵測，第二次起改成別家（避免「3 站都同一家」）', level=1)
bullet('  ⒞ 候選清單耗盡 → 寧可少一站也不重複（drop 而非 fallback）', level=1)
bullet('打烊時間後置驗證：累加各站「到達時間 + 停留」與打烊時間比對，剔除會關門的站')

# ══════════════════════════════════════════════════════════════════════════════
# 八、作品操作說明畫面
# ══════════════════════════════════════════════════════════════════════════════
h1('八、作品操作說明畫面')

h2('主要操作流程')

body('流程 A：AI 行程生成（核心功能）', bold=True)
for step in [
    '開啟 App → 主畫面顯示七種 Vibe 卡片（印章 / 圓形 / 卡片三種樣式可切換）',
    '點選「☕ 喝杯咖啡」→ 系統顯示輪播載入文案：',
    '   「正在取得你的位置… → 搜尋附近真實店家… → 為你安排行程中… → 確認路線距離…」',
    'AI 根據 GPS 位置 + 時段 + 天氣 + 打烊時間生成三站行程卡片（約 5–15 秒）',
    '每站顯示：地點名稱、預計抵達時間、停留時間、特色描述、距離與交通方式',
    '不滿意？進搖一搖頁，搖動手機 → 同 Vibe 但每次抽出不同店家組合（累積排除清單）',
    '滿意 → 點「開始導覽」進入 AR 導航模式',
]:
    bullet(step, level=0)

doc.add_paragraph()
body('流程 B：AR 導航', bold=True)
for step in [
    'AR 畫面開啟相機即時預覽（後景為真實街道）',
    '畫面中央顯示方位指示箭頭，隨手機羅盤即時旋轉',
    '下方面板選擇交通方式：步行 / 公車（顯示到站秒數）/ YouBike（顯示可借台數）',
    '確認後顯示逐步導航指示（「往前走 200m 後左轉」等）',
    '抵達下一站自動推進，完成全程後返回行程列表',
]:
    bullet(step, level=0)

doc.add_paragraph()
body('流程 C：行程模式連接 AR（Trip → AR 無縫切換）', bold=True)
for step in [
    '行程景點列表顯示所有站點',
    '點選任一站點右側箭頭 → 自動搜尋並定位目的地',
    '選擇交通方案後進入 AR 逐步導航',
    '結束後可返回行程列表繼續下一站',
]:
    bullet(step, level=0)

# ══════════════════════════════════════════════════════════════════════════════
# 九、預計實作平台
# ══════════════════════════════════════════════════════════════════════════════
h1('九、預計實作平台')

make_table(
    ['項目', '說明'],
    [
        ['目標平台',    'Android（主要）、iOS（相容）'],
        ['後端部署',    'Google Cloud VM / Railway（免費方案示範用）'],
        ['打包方式',    'EAS Build（Expo Application Services）→ 輸出 .apk'],
        ['最低系統需求','Android 10 以上，需 GPS、相機、網路權限'],
        ['實測裝置',    'Android 14 中階手機'],
        ['離線支援',    '基本 UI 可離線瀏覽，行程生成與導航需網路'],
    ],
    col_widths=[4, 12],
    header_bg='1A3A5C'
)

# ══════════════════════════════════════════════════════════════════════════════
# 十、隊員介紹與分工
# ══════════════════════════════════════════════════════════════════════════════
h1('十、隊員介紹與個人開發說明')

body('本專案為個人開發，由一人獨立負責下方所有技術領域：', bold=True)

make_table(
    ['姓名', '學號', '負責項目'],
    [
        ['（請填入）', 's111319019',
         '個人全端開發（React Native 前端 + FastAPI 後端）\n'
         'AI Prompt 設計、防幻覺後處理、UI/UX 視覺規範'],
    ],
    col_widths=[3, 4, 9],
    header_bg='1A3A5C'
)

h2('個人涵蓋之技術領域')
make_table(
    ['領域', '工作內容'],
    [
        ['前端開發',  'React Native 畫面、AR 相機整合、羅盤感測器、動畫系統、Vibe 樣式切換'],
        ['後端開發',  'FastAPI 路由、SQLAlchemy 2.0 async、Redis 多層快取、JWT 認證'],
        ['AI 工程',   'Groq LLM 串接、Prompt Engineering、三道防幻覺後處理邏輯'],
        ['API 整合',  'Google Maps（Places / Place Details / Directions）+ TDX + OpenWeatherMap'],
        ['資安設計',  '金鑰前後端分離、TDX/Groq secret 留後端、Google Cloud 金鑰限制（App + SHA-1）'],
        ['設計系統',  '編輯雜誌風（Popeye / Brutus 系）+ 6 色跳色 palette + 6 主題切換 + 3 Vibe 樣式'],
        ['DevOps',    'Docker Compose 多服務編排、pnpm 套件管理、Expo Dev Build'],
    ],
    col_widths=[4, 12],
    header_bg='2E6DB4'
)

# ══════════════════════════════════════════════════════════════════════════════
# 十一、其他
# ══════════════════════════════════════════════════════════════════════════════
h1('十一、其他')

h2('技術創新摘要')
make_table(
    ['創新點', '說明'],
    [
        ['三道防幻覺機制',
         '⒜ Prompt 嚴格規範 + Google Places 比對替換捏造店名；'
         '⒝ 同名重複偵測（AI 連寫 3 個一樣的會被自動換掉）；'
         '⒞ 候選清單耗盡時 drop 而非重複，寧可少一站也不重複'],
        ['時段感知行程引擎',
         '依深夜（22–06）/ 清晨（6–9）/ 日間自動調整 Places 過濾條件、補搜清單、AI 規則；'
         '17:00 後加跑 Place Details 取打烊時間，後置驗證 arrival_time'],
        ['多關鍵字隨機抽樣 + Redis 快取',
         'Vibe query 拆 6–10 個關鍵字隨機抽 3 個並行查，每個 (query, 鄰近座標) 結果共用 1h 快取。'
         '解決「搖一搖永遠那幾家」+ 同地區重複生成成本趨近於零'],
        ['並行距離計算',
         '原本 4 站行程需 4 次串行 Google Directions，改用 asyncio.gather 並行查，省下幾秒等待'],
        ['Place Details 共用快取',
         '同一間店的打烊時間在 Redis 共用 24h（place_id + 星期為 key），'
         '跨使用者、跨行程都不重複扣費'],
        ['全外部 API 後端代理',
         '前端不直連任何外部 API；TDX / Groq 等 secret 全留後端，'
         '前端只持 Maps SDK key（Google Cloud 用 App 套件名 + SHA-1 雙重限制）'],
        ['AR 最短路徑旋轉',
         '羅盤箭頭採累積角度計算，過 0°/360° 邊界時走最短路徑，避免亂轉'],
        ['搖一搖累積排除清單',
         '前端記錄已生成過的 trip_id，每次搖都 push 進 exclude_trip_ids，'
         '後端拿到非空清單即跳過快取，確保「永遠不會重複拿到同一份」'],
        ['三小時時間框架',
         '固定時間邊界設計，降低出門決策心理門檻；'
         '前端每次顯示時用當下時間重新累加，與後端生成時的時間解耦'],
    ],
    col_widths=[4, 12],
    header_bg='1A3A5C'
)

h2('資料來源')
make_table(
    ['資料類型', '來源平台'],
    [
        ['店家資訊、開放狀態', 'Google Places API'],
        ['步行 / 大眾運輸路線', 'Google Directions API'],
        ['公車到站、YouBike 即時', 'TDX 交通資料流通服務平臺（交通部）'],
        ['天氣資訊', 'OpenWeatherMap API'],
        ['AI 語言推理', 'Groq Cloud（LLaMA 3.3-70B，免費方案）'],
    ],
    col_widths=[5, 11],
    header_bg='2E6DB4'
)

h2('已實作的進階功能（超出基本需求）')
bullet('足跡膠囊系統：AR 拍照 → 自動存地理標記，個人地圖回看軌跡，可選擇分享至社群')
bullet('社群地圖 + 動態 Feed：探索並按讚收藏他人公開的足跡，三種排序（最新／熱門／附近）')
bullet('漫遊品味報告：AI 分析使用者近 30 天的足跡標籤，'
       '生成編輯雜誌風 pull quote（含人格定位、偏好 Vibe、熱門 tag）')
bullet('六主題切換系統：暖紙白 / 櫻花粉 / 紺青 / 苔綠 / 純黑白 / 深色，全主題即時切換')
bullet('七日天氣詳情頁：含逐時、機率、體感、紫外線等多維度資料')

h2('未來發展規劃')
bullet('多人同步行程：朋友間共享同一份 Vibe 抽到的行程，可即時看見彼此位置')
bullet('離線足跡導出：把個人膠囊整理成可分享的旅行手帖（PDF / 圖片）')
bullet('多城市擴展：目前以台北為核心，擴展台中、高雄、台南的 TDX 與 Places 覆蓋')
bullet('情境模板進化：周末半日／晚餐約會／親子半小時等變形時間框架')
bullet('AR 視覺化升級：AR 預覽下一站照片浮窗、實境地名標籤，提升「在城市裡漫遊」的儀式感')

h2('資安設計')

body('行動應用程式的金鑰外洩是常見資安風險，任何寫進 App bundle 的字串都可被反編譯挖出。'
     '本專案在開發初期就把資安納入架構設計，下方說明採取的分離與限制策略。')

h2('金鑰前後端分離原則')
make_table(
    ['金鑰類型', '存放位置', '保護策略'],
    [
        ['Maps SDK Key（前端地圖渲染必需）',
         '前端 .env（EXPO_PUBLIC_GOOGLE_API_KEY）',
         'Google Cloud Console 限制：應用程式（套件名 + SHA-1）+ API（只允許 Maps SDK），'
         '即使被挖出在其他 App 也無法使用'],
        ['Google Places / Directions Key',
         '後端 .env（GOOGLE_MAPS_API_KEY）',
         '伺服器端使用，正式部署時加 IP 限制'],
        ['Groq API Key',
         '後端 .env（GROQ_API_KEY）',
         '伺服器端使用，前端完全不知道存在'],
        ['TDX Client ID / Secret',
         '後端 .env',
         '初期版本曾放前端後改為純後端代理；secret 不再進 App bundle'],
        ['OpenWeatherMap Key',
         '後端 .env',
         '伺服器端使用，前端透過 /api/v1/weather/* 取得結果'],
        ['JWT Signing Key',
         '後端 .env（JWT_SECRET_KEY）',
         '正式環境使用 openssl rand -hex 32 產生長隨機字串'],
    ],
    col_widths=[5, 5, 6],
    header_bg='1A3A5C'
)

h2('其他資安實作')
bullet('JWT 認證：Access Token 1 小時 + Refresh Token 30 天，token 以 '
       'expo-secure-store 加密存放於 iOS Keychain / Android Keystore（非明文）')
bullet('密碼雜湊：使用 bcrypt 加鹽雜湊，不存明文密碼')
bullet('圖片上傳：multipart/form-data 經後端中轉，檔案大小與類型驗證')
bullet('CORS 策略：開發階段允許所有來源，正式環境限制為 App 實際網域')
bullet('全外部 API 代理：前端不直連 Google / TDX，不再需要在 bundle 內持有對應 secret，'
       '減少攻擊面')

# ── 儲存 ────────────────────────────────────────────────────────────────────
import os
desktop = os.path.join(os.path.expanduser('~'), 'OneDrive', 'Desktop')
output = os.path.join(desktop, 'VibeTrip_qihuashu.docx')
doc.save(output)
print('[OK] saved to: ' + output)
