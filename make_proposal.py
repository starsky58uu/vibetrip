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
    """一級標題（章節）"""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after  = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.bold = True
    run.font.size = Pt(14)
    run.font.color.rgb = BLUE_DARK
    run.font.name = '微軟正黑體'
    # 底線裝飾
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '6')
    bottom.set(qn('w:color'), '2E6DB4')
    pBdr.append(bottom)
    pPr.append(pBdr)
    return p

def h2(text):
    """二級標題"""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after  = Pt(3)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.bold = True
    run.font.size = Pt(11.5)
    run.font.color.rgb = BLUE_MID
    run.font.name = '微軟正黑體'
    return p

def body(text, bold=False, indent=False):
    """正文段落"""
    p = doc.add_paragraph()
    if indent:
        p.paragraph_format.left_indent = Cm(0.6)
    p.paragraph_format.space_after = Pt(3)
    run = p.add_run(text)
    run.font.size = Pt(10.5)
    run.font.name = '微軟正黑體'
    run.font.color.rgb = BLACK
    run.bold = bold
    return p

def bullet(text, level=0):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.left_indent  = Cm(0.5 + level * 0.5)
    p.paragraph_format.space_after  = Pt(2)
    run = p.add_run(text)
    run.font.size = Pt(10.5)
    run.font.name = '微軟正黑體'
    run.font.color.rgb = BLACK
    return p

def make_table(headers, rows, col_widths=None, header_bg='1A3A5C'):
    table = doc.add_table(rows=1+len(rows), cols=len(headers))
    table.style = 'Table Grid'
    # Header
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = h
        cell.paragraphs[0].runs[0].bold = True
        cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF,0xFF,0xFF)
        cell.paragraphs[0].runs[0].font.size = Pt(10)
        cell.paragraphs[0].runs[0].font.name = '微軟正黑體'
        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        set_cell_bg(cell, header_bg)
    # Rows
    for ri, row_data in enumerate(rows):
        for ci, val in enumerate(row_data):
            cell = table.rows[ri+1].cells[ci]
            cell.text = val
            cell.paragraphs[0].runs[0].font.size = Pt(10)
            cell.paragraphs[0].runs[0].font.name = '微軟正黑體'
            cell.paragraphs[0].runs[0].font.color.rgb = BLACK
            set_cell_bg(cell, 'F5F8FC' if ri % 2 == 0 else 'FFFFFF')
            set_cell_border(cell)
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
r.bold = True; r.font.size = Pt(36); r.font.color.rgb = BLUE_DARK; r.font.name = '微軟正黑體'

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('AI 氛圍感城市漫遊 App')
r.font.size = Pt(18); r.font.color.rgb = BLUE_MID; r.font.name = '微軟正黑體'

doc.add_paragraph()
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('說走就走　不需規劃　三小時城市漫遊')
r.bold = True; r.font.size = Pt(13); r.font.color.rgb = RGBColor(0xC8,0x5A,0x3B); r.font.name = '微軟正黑體'

doc.add_paragraph()
doc.add_paragraph()
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
for line in ['初賽企劃書', '製作日期：2026 年 5 月']:
    p.add_run(line + '\n').font.size = Pt(11)
    p.runs[-1].font.name = '微軟正黑體'
    p.runs[-1].font.color.rgb = GRAY_TEXT

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
body('VibeTrip — AI 氛圍感城市漫遊 App', bold=True)

# ══════════════════════════════════════════════════════════════════════════════
# 三、創作動機與目的
# ══════════════════════════════════════════════════════════════════════════════
h1('三、創作動機與目的')

h2('▍創作動機')
body('你是否曾在下課後、下班後、或一個週末下午突然想出門，卻不知道去哪裡？'
     '打開地圖 App 面對數百筆評論不知從何選起，打開社群媒體只會讓「不知道要去哪裡」'
     '的焦慮感加倍。規劃行程需要時間，而人的衝動往往只有五分鐘。')
body('現有旅遊工具的問題在於：它們都在幫你「規劃」，卻沒有人幫你「決定」。'
     'Google Maps 給你地點但不給你行程；Klook 給你活動但需要預訂；社群平台給你靈感'
     '但讓你選擇困難。沒有任何工具能在三分鐘內告訴你：「現在往東走，先喝杯咖啡，'
     '再逛一間選物店，最後在河邊走走，三小時後回家。」')

h2('▍設計理念：說走就走，不需規劃')
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

h2('▍目的')
bullet('讓「說走就走」真的能走——從打開 App 到走出門，不超過一分鐘')
bullet('降低都市人的出遊門檻，把城市變成隨時可探索的遊樂場')
bullet('用 AI 取代「去哪裡好？」的糾結，把選擇的疲憊還給電腦')
bullet('讓自己住的城市也能像陌生城市一樣令人驚喜')

# ══════════════════════════════════════════════════════════════════════════════
# 四、作品構想與特色
# ══════════════════════════════════════════════════════════════════════════════
h1('四、作品構想與特色')

h2('▍核心流程：三步驟，一分鐘出門')
body('VibeTrip 把整個出遊決策壓縮到三個動作：')

make_table(
    ['步驟', '動作', '時間'],
    [
        ['① 選心情', '從七種 Vibe 中點一個最接近當下心情的', '5 秒'],
        ['② 看行程', 'AI 生成三站式漫遊路線，確認喜歡就出發', '30 秒'],
        ['③ 走出去', '開啟 AR 導航，App 帶你走到每一個地點', '即時'],
    ],
    col_widths=[2.5, 9, 2.5],
    header_bg='1A3A5C'
)

h2('▍七種情緒 Vibe')
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

h2('▍五大產品特色')

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

body('⑤ 搖一搖重骰', bold=True)
body('對推薦行程不滿意？搖動手機，AI 立刻繞過快取重新生成一份截然不同的路線。', indent=True)

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

h2('▍系統架構圖')
p = doc.add_paragraph()
r = p.add_run(
'┌───────────────────────────────────────────┐\n'
'│        React Native App (Expo SDK 54)      │\n'
'│  ┌──────┐  ┌──────┐  ┌────┐  ┌────────┐  │\n'
'│  │ Home │  │ Trip │  │ AR │  │Explore │  │\n'
'│  │Vibe  │  │AI行程│  │導航│  │地圖足跡│  │\n'
'│  └──┬───┘  └──┬───┘  └─┬──┘  └───┬────┘  │\n'
'│     └─────────┴──────────┴─────────┘       │\n'
'│              API Client (fetch + JWT)       │\n'
'└──────────────────┬────────────────────────┘\n'
'                   │ HTTPS / REST\n'
'┌──────────────────▼────────────────────────┐\n'
'│         FastAPI Backend (Python 3.10)      │\n'
'│  ┌────────────┐  ┌──────────┐  ┌────────┐ │\n'
'│  │Trip Service│  │AI Service│  │Transit │ │\n'
'│  │行程 CRUD   │  │Groq LLM  │  │Service │ │\n'
'│  └────────────┘  └────┬─────┘  └───┬────┘ │\n'
'│  ┌──────────────────────────────────▼────┐ │\n'
'│  │          External API Layer           │ │\n'
'│  │  Google Places / Directions / Maps    │ │\n'
'│  │  TDX 公車 / 捷運 / YouBike 即時資料  │ │\n'
'│  │  OpenWeatherMap 天氣                  │ │\n'
'│  └───────────────────────────────────────┘ │\n'
'│  ┌──────────────┐    ┌────────────────┐    │\n'
'│  │ PostgreSQL   │    │     Redis       │    │\n'
'│  │  + PostGIS   │    │  API 快取 TTL  │    │\n'
'│  └──────────────┘    └────────────────┘    │\n'
'└───────────────────────────────────────────┘'
)
r.font.name = 'Courier New'
r.font.size = Pt(8.5)
r.font.color.rgb = RGBColor(0x1A,0x3A,0x5C)

h2('▍行程生成資料流')
steps = [
    '① 使用者選擇 Vibe，前端送出 { vibe_key, latitude, longitude, 時段 }',
    '② 後端查詢 Redis 快取（日間 2 小時 TTL，深夜每小時更新）',
    '③ Cache miss → 呼叫 Google Places 取周邊真實開放店家清單',
    '④ 清單 + 時段限制 Prompt 送入 Groq LLaMA 3.3-70B 生成行程 JSON',
    '⑤ 後處理：比對 AI 輸出的地點名稱與 Google 清單，捏造店名自動替換',
    '⑥ Google Directions 計算真實步行距離與交通方案',
    '⑦ 結果寫入 Redis 快取並回傳前端渲染',
]
for s in steps:
    bullet(s)

# ══════════════════════════════════════════════════════════════════════════════
# 七、主要功能與技術
# ══════════════════════════════════════════════════════════════════════════════
h1('七、主要功能與技術')

h2('▍前端技術棧')
make_table(
    ['項目', '技術 / 套件'],
    [
        ['框架',        'React Native 0.76 + Expo SDK 54'],
        ['導航路由',    'React Navigation v7（Bottom Tabs + Native Stack）'],
        ['AR 相機',     'expo-camera（CameraView 即時預覽）'],
        ['GPS + 羅盤',  'expo-location（watchPositionAsync + watchHeadingAsync）'],
        ['地圖',        'react-native-maps'],
        ['觸覺回饋',    'expo-haptics（搖一搖、到站提醒）'],
        ['媒體儲存',    'expo-media-library（足跡照片存相簿）'],
        ['動畫',        'React Native Animated API（羅盤箭頭平滑旋轉）'],
        ['字型',        'Noto Serif TC、Fraunces、JetBrains Mono（@expo-google-fonts）'],
    ],
    col_widths=[4, 12],
    header_bg='2E6DB4'
)

h2('▍後端技術棧')
make_table(
    ['項目', '技術 / 套件'],
    [
        ['框架',      'FastAPI（Python 3.10，非同步）'],
        ['資料庫',    'PostgreSQL 15 + PostGIS 3.3（地理空間索引）'],
        ['快取',      'Redis 7（API 結果快取、TTL 時段管理）'],
        ['AI 推理',   'Groq API — LLaMA 3.3-70B-Versatile（免費方案）'],
        ['認證',      'JWT（Access Token 1h + Refresh Token 30d）+ bcrypt'],
        ['容器化',    'Docker + Docker Compose（db / redis / api 三服務）'],
    ],
    col_widths=[4, 12],
    header_bg='2E6DB4'
)

h2('▍外部 API 整合')
make_table(
    ['API', '用途', '策略'],
    [
        ['Google Places API',    '查詢周邊真實開放店家', '後端呼叫，結果快取'],
        ['Google Directions API','步行 / 大眾運輸路線步驟', '前端導航時呼叫'],
        ['TDX 交通資料 API',     '公車即時到站、YouBike 可借還量、捷運時刻', '後端優先，失敗轉前端直連'],
        ['OpenWeatherMap',       '天氣（影響推薦邏輯）', '後端快取'],
    ],
    col_widths=[4, 6.5, 5.5],
    header_bg='2E6DB4'
)

h2('▍AI Prompt 設計亮點')
bullet('輸入：vibe 類型、用戶座標、天氣、時段、Google Places 真實店家清單')
bullet('輸出：結構化 JSON（標題、副標、三站行程各含時間、描述、交通、情緒標籤）')
bullet('防幻覺雙重保護：Prompt 禁止捏造店名 + 後處理比對 Google 清單自動替換')
bullet('時段約束注入：深夜自動加入「嚴禁推薦夕陽 / 日間活動」等強制限制語句')

# ══════════════════════════════════════════════════════════════════════════════
# 八、作品操作說明畫面
# ══════════════════════════════════════════════════════════════════════════════
h1('八、作品操作說明畫面')

h2('▍主要操作流程')

body('流程 A：AI 行程生成（核心功能）', bold=True)
for step in [
    '開啟 App → 主畫面顯示七種 Vibe 卡片',
    '點選「☕ 喝杯咖啡」→ 系統顯示「正在生成你的專屬行程…」',
    'AI 根據 GPS 位置 + 時段 + 天氣生成三站行程卡片',
    '每站顯示：地點名稱、預計抵達時間、停留時間、特色描述、交通方式',
    '不滿意？搖動手機 → 重新生成截然不同的路線',
    '滿意 → 點「開啟 AR 導航」進入導航模式',
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
h1('十、隊員介紹與團隊分工方式')

make_table(
    ['姓名', '學號', '負責項目'],
    [
        ['（請填入）', 's111319019',
         '全端開發（React Native 前端 + FastAPI 後端）\nAI Prompt 設計、UI/UX 視覺規範'],
    ],
    col_widths=[3, 4, 9],
    header_bg='1A3A5C'
)

h2('▍分工說明')
make_table(
    ['領域', '工作內容'],
    [
        ['前端開發',  'React Native 畫面、AR 相機整合、羅盤感測器、動畫系統'],
        ['後端開發',  'FastAPI 路由、資料庫 Schema、Redis 快取策略、JWT 認證'],
        ['AI 工程',   'Groq LLM 串接、Prompt Engineering、防幻覺後處理邏輯'],
        ['API 整合',  'Google Maps 系列、TDX 交通資料（公車 / 捷運 / YouBike）'],
        ['設計系統',  '和紙視覺風格、字型選型（Noto Serif TC）、配色規範'],
    ],
    col_widths=[4, 12],
    header_bg='2E6DB4'
)

# ══════════════════════════════════════════════════════════════════════════════
# 十一、其他
# ══════════════════════════════════════════════════════════════════════════════
h1('十一、其他')

h2('▍技術創新摘要')
make_table(
    ['創新點', '說明'],
    [
        ['兩段式防幻覺機制',
         'Prompt 層嚴格規範店名 + 後處理 Google Places 比對，雙重確保推薦地點真實存在'],
        ['時段感知行程引擎',
         '依深夜 / 清晨 / 日間自動調整 Google Places 過濾條件與 AI 生成規則'],
        ['後端優先 TDX 整合',
         '交通資料優先走後端（PostGIS + Redis），後端失敗自動 Fallback 前端直連 TDX'],
        ['AR 最短路徑旋轉',
         '羅盤箭頭採累積角度計算，過 0°/360° 邊界時走最短路徑，避免亂轉'],
        ['三小時時間框架',
         '固定時間邊界設計，降低出門決策心理門檻，每站時間自動從當前時刻重新計算'],
    ],
    col_widths=[4, 12],
    header_bg='1A3A5C'
)

h2('▍資料來源')
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

h2('▍未來發展規劃')
bullet('足跡膠囊系統：AR 拍照 → 儲存地理標記記憶，可在個人地圖回看每次漫遊軌跡')
bullet('AI 城市口味報告：分析歷史足跡標籤，生成「你的城市漫遊個性報告」')
bullet('社群地圖：探索並收藏他人公開的足跡與推薦地點')
bullet('多城市擴展：目前以台北為核心，未來擴展台中、高雄等城市 TDX 資料')

# ── 儲存 ────────────────────────────────────────────────────────────────────
import os
desktop = os.path.join(os.path.expanduser('~'), 'OneDrive', 'Desktop')
output = os.path.join(desktop, 'VibeTrip_qihuashu.docx')
doc.save(output)
print('✅ 已儲存至：' + output)
