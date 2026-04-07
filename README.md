# Salon Booking — LINE 美髮沙龍預約系統

掛載於 LINE 官方帳號的美髮預約 Web App（LIFF），透過 LINE 圖形選單進入，全程手機操作。

---

## 版本資訊

- 文件 / 專案版本：`v0.0.3`
- 本次同步內容：管理員授權顯示漏洞修正、管理員登入驗證流程穩定化、後台統計方向調整

---

## 技術架構

| 層級 | 技術 |
|---|---|
| 前端框架 | SvelteKit |
| 樣式 | Tailwind CSS |
| 後端 / Serverless | Cloudflare Pages + Workers |
| 資料庫 | Cloudflare D1 (SQLite) |
| ORM | Drizzle ORM |
| 身份驗證 | LINE LIFF（LINE Front-end Framework）|
| 部署 | Cloudflare Pages |

---

## 開發環境

```sh
# 安裝依賴
npm install

# 啟動本地開發伺服器
npm run dev

# 建置
npm run build
```

---

## 開發工作流程

### 任務完成流程

- 任務完成後，先執行必要測試與檢查
- 確認測試結果正常後，直接自動 `commit` 與 `push`
- 不需要再次詢問是否要 `commit` / `push`
- 完成後直接部署到正式環境

### 分支規則

- 新功能開發或問題修復時，先建立新分支
- 開發與測試完成後，必須合併回 `develop`
- 合併完成後，刪除這次建立的功能分支
- `develop` 作為主要整合分支

### 部署規則

- 任務完成且測試通過後，直接部署
- 正式部署固定使用：

```sh
npm run deploy:prod
```

---

## 頁面路由

| 路徑 | 說明 |
|---|---|
| `/` | 預約主頁面（三步驟：選服務 → 選日期 → 選時段） |
| `/booking-success` | 預約成功頁（✅ 已完成） |
| `/my-bookings` | 個人預約列表 + 取消功能（✅ 已完成） |
| `/admin` | 管理後台（✅ 需要 LINE 登入權限） |

---

## 🔗 重要網址與整合設定

- **顧客專屬預約網址 (綁定於 LINE 圖文選單)**:
  `https://liff.line.me/2009342816-q0rukZhq/`
- **顧客個人預約紀錄網址 (綁定於 LINE 圖文選單)**:
  `https://liff.line.me/2009342816-q0rukZhq/my-bookings`
- **管理員專屬後台 (需加入權限白名單)**:
  `https://salon-booking-a01.pages.dev/admin`

---

## 功能現況

### ✅ 已完成

- LINE LIFF 登入，取得用戶 Profile（displayName、userId）
- 三步驟預約流程（選服務、選日期、選時段）
- 即時時段衝突檢查（本地計算，不撈資料庫）
- 預約資料寫入 Cloudflare D1
- Admin 後台查看所有預約（每 30 秒自動更新）
- **預約成功頁面 `/booking-success`** ✅
  - 預約完成後立即跳轉（前端 `goto()` 導頁），不再停留在時間選擇頁
  - 顯示預約摘要（顧客、服務、日期、時段）
  - 溫馨提醒文案（告知如需更改請聯繫沙龍）
  - 「查看我的預約」按鈕（前往 `/my-bookings` 查看個人預約紀錄）
  - 「返回 LINE 聊天」按鈕（`liff.closeWindow()` 關閉 LIFF，回到官方帳號對話視窗）
- **個人預約清單與取消功能 `/my-bookings`** ✅
  - 支援 LINE 登入自動識別用戶
  - 依照時間分為「即將到來」與「歷史/取消」紀錄
  - 管理與釋出取消的預約時段
  - Admin 後台同步顯示取消狀態
  - 確認預約按鈕有 loading 動畫防止遞交重複
  - 全手機優化設計
- **Admin 後台管理介面優化 `/admin`** ✅
  - 寬螢幕保留 Table 版面，手機螢幕轉為自動切換 Card 卡片列表
  - 三大分區顯示：「即將到來」、「已完成」、「已取消」
  - 智慧排序（即將到來：最快到期排最前 / 歷史紀錄：最近操作排最前）
  - 頂端新增數據統計卡片（三區塊總數）
  - 全面 RWD 響應式設計
- **資訊安全與驗證機制 (Security & Access)** ✅
  - `/admin` 頁面強制進行 LINE 登入
  - 前端透過 LIFF 取得 LINE Access Token，後端向 LINE Profile API 驗證身份
  - 驗證成功後由伺服器建立 HttpOnly Session Cookie
  - `/admin` 會再透過 `admins` 資料表做白名單驗證
  - `/my-bookings` 與取消預約改為依據伺服器 Session 驗證，不再信任前端傳入 `userId`
  - 無權限者會清楚顯示「存取被拒」錯誤畫面，並印出開發者可用之 `ID`
  - 移除就版 HTTP Basic Auth 彈出視窗阻擋問題
  - 支援 LINE 權杖過期時的自動重新登入與重新驗證機制
- **LINE 圖文選單無縫整合** ✅
  - 使用專屬 `liff.line.me` 網址綁定圖文選單，實現免手動登入、自動身份識別的絲滑體驗

---

### 📋 規劃中（近期）

- **優先修正：admin 權限漏洞**
  - 非管理員使用者第一次打開 `/admin` 時，畫面會短暫進入後台後才跳成「驗證中」
  - 更嚴重的是：重新打開 `/admin` 後，右上角仍顯示「驗證中」，但頁面內容卻已能看見整個管理員後台
  - 這代表目前 `/admin` 的授權顯示與實際資料渲染流程仍有漏洞，必須優先修正，避免非管理員看見後台資料
- **管理後台統計調整**
  - 不再做金額 / 業績統計
  - 改為統計每日 / 每週 / 每月來客數
  - 改為統計各期間的預約服務項目分布
- **管理員新預約通知**
  - 目前店家需主動打開後台才知道有新預約
  - 建議優先做 LINE Push Message 通知
- **後台手動管理預約**
  - 管理員可手動新增、取消、改期預約
- **營業規則設定化**
  - 服務項目、時長、營業時間、休假日改成可設定，不要硬寫在程式裡
- **正式對外前測試流程整理**
  - LIFF 發佈狀態
  - 管理員白名單
  - 店家測試帳號驗證流程

---

### ⏳ 未完成 / 待做

- **管理員登入 / 權限顯示流程修正**
  - 必須確保非管理員在任何情況下都不能看到 `/admin` 後台資料
  - 需重新檢查 LIFF 驗證、session 同步、server load、前端畫面切換時機
- **每日 / 每週 / 每月來客數統計**
- **每日 / 每週 / 每月服務項目統計**
- **預約資料 Excel / CSV 匯出**
- **加入手機日曆（.ics / Google Calendar）**
- **操作紀錄（Audit Log）**
- **預約狀態擴充**
  - 例如 `done`、`no-show`、`pending`
- **後台搜尋 / 篩選功能**
  - 依日期、顧客、狀態搜尋
- **避免重複送單的更完整保護**
  - 例如短時間重複提交限制

---

## 注意事項

- 所有頁面皆附掛於 LINE 官方帳號（LIFF），設計需以手機為主要裝置
- `liff.closeWindow()` → 關閉 LIFF 視窗，回到 LINE 對話視窗
- LIFF App 需能取得 Access Token 與 Profile 權限
- 後端需設定 `LINE_SESSION_SECRET`

---

## 環境變數

```sh
DATABASE_URL=local.db
LINE_SESSION_SECRET=請填一組足夠長的隨機字串
```

- `LINE_SESSION_SECRET`：後端簽署 Session Cookie 用，不要和其他專案共用

Cloudflare Pages / Workers 也要同步設定以上變數。

---

## 🛡️ 如何新增管理員 (Admin 白名單)

因為 `/admin` 頁面有白名單保護，所以要讓店家本人、店員或設計師進入後台，必須先把他的 LINE `userId` 加進 `admins` 資料表。

最簡單的做法就是：

1. 先請對方用自己的 LINE 打開預約頁
2. 隨便完成一次測試預約
3. 你去資料庫查出他的 `line_user_id`
4. 把這個 `line_user_id` 寫進 `admins`
5. 他之後再用自己的 LINE 打開 `/admin`，就能進入後台

### 步驟 1：取得新管理員的 LINE ID
請新管理員先透過 LINE LIFF 預約頁，用自己的 LINE 帳號**完成一次隨意的測試預約**。

接著執行以下指令，查看最近預約名單，找出他的 `line_user_id`：

```sh
npx wrangler d1 execute salon-booking-db --remote --command="SELECT line_user_id, customer_name, appointment_date FROM appointments ORDER BY created_at DESC LIMIT 10;"
```

你會看到最近幾筆預約資料：
- `customer_name`：顧客名稱
- `appointment_date`：預約時間
- `line_user_id`：LINE 使用者 ID

找到店家本人那一筆，把 `line_user_id` 複製下來。

> `line_user_id` 通常會是 `U` 開頭的一長串字串。

### 步驟 2：將新管理員加入白名單
拿到他的 `line_user_id` 後，執行以下指令把他加入 `admins` 資料表：

```sh
npx wrangler d1 execute salon-booking-db --remote --command="INSERT INTO admins (line_user_id, name, created_at) VALUES ('請換成店家的LINE_USER_ID', '請換成店家名字', strftime('%s', 'now') * 1000);"
```

例如：

```sh
npx wrangler d1 execute salon-booking-db --remote --command="INSERT INTO admins (line_user_id, name, created_at) VALUES ('Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', '王小姐', strftime('%s', 'now') * 1000);"
```

### 步驟 3：確認有沒有加入成功

你可以再查一次目前管理員名單：

```sh
npx wrangler d1 execute salon-booking-db --remote --command="SELECT line_user_id, name, created_at FROM admins ORDER BY created_at DESC;"
```

如果店家的 `line_user_id` 已經在裡面，就代表白名單加入成功。

### 步驟 4：請店家重新打開 `/admin`

加入成功後，請店家：

1. 用自己的 LINE 帳號
2. 重新打開 LIFF 或 `/admin`
3. 系統就會自動辨識他是管理員並讓他進入後台

如果還是進不去，優先檢查：
- 他是不是用同一個 LINE 帳號在測試
- 你加入的 `line_user_id` 有沒有貼錯
- 是否有多個測試帳號混在一起

---

## 部署到 Cloudflare

### 前置需求

- Cloudflare 帳號（免費方案即可）
- 安裝並登入 Wrangler CLI：

```sh
# 全域安裝（若尚未安裝）
npm install -g wrangler

# 登入 Cloudflare 帳號
wrangler login
```

---

### 首次部署流程

#### 第 1 步：建立 D1 資料庫

```sh
# 在 Cloudflare 建立 D1 資料庫
wrangler d1 create salon-booking-db
```

> 執行後會輸出 `database_id`，複製貼到 `wrangler.jsonc` 的 `database_id` 欄位。

#### 第 2 步：初始化遠端資料庫結構（Migrate）

```sh
# 產生 migration 檔案（若尚未產生）
npm run db:generate

# 推送 schema 到本地測試資料庫
npm run db:push

# 套用到 Cloudflare D1 遠端資料庫
wrangler d1 migrations apply salon-booking-db --remote
```

#### 第 2.5 步：設定 Cloudflare 環境變數

```sh
wrangler pages secret put LINE_SESSION_SECRET
```

> `LINE_SESSION_SECRET` 請填一組高強度隨機字串。

#### 第 3 步：建置專案

```sh
npm run build
```

> 輸出目錄為 `.svelte-kit/cloudflare`（已設定在 `wrangler.jsonc`）

#### 第 4 步：部署到 Cloudflare Pages

```sh
npm run deploy:prod
```

> 這個指令會先執行 build，然後以 `--branch salon-booking` 直接部署到正式環境。  
> 首次執行若尚未建立 Pages 專案，Wrangler 會提示你完成設定。

---

### 日常部署（更新程式碼後）

```sh
npm run deploy:prod
```

> ⚠️ `deploy:prod` 內部固定使用 `--branch salon-booking`。  
> 若你改用其他 `wrangler pages deploy` 指令且省略這個參數，很可能只會部署到預覽環境，正式網域 `salon-booking-a01.pages.dev` 不會更新。

---

### 本地預覽 Cloudflare 環境（含 D1 綁定）

```sh
# 先建置，再用 wrangler 模擬 Cloudflare 執行環境
npm run build
npm run preview
# 等同於：wrangler pages dev .svelte-kit/cloudflare --port 4173
```

> `npm run dev` 是一般 Vite 開發伺服器，不包含 D1 綁定，適合 UI 開發。  
> `npm run preview` 才會綁定 D1，用於完整功能測試。

---

### DB Schema 有異動時

```sh
# 產生新的 migration 檔案
npm run db:generate

# 套用到遠端 Cloudflare D1
wrangler d1 migrations apply salon-booking-db --remote
```

---

### 環境說明

| 指令 | 用途 |
|---|---|
| `npm run dev` | 本地開發（Vite，無 D1 綁定）|
| `npm run build` | 建置 Cloudflare Pages 產物 |
| `npm run preview` | 本地模擬 Cloudflare 環境（含 D1）|
| `npm run deploy:prod` | 直接部署到正式 Cloudflare Pages |
| `npm run db:generate` | 產生 Drizzle migration 檔案 |
| `npm run db:push` | 推送 schema 到本地 SQLite |
| `wrangler d1 migrations apply ... --remote` | 套用 migration 到遠端 D1 |

---

## 重新建立此專案

```sh
npx sv@0.12.5 create --template minimal --types ts \
  --add prettier eslint tailwindcss="plugins:forms" \
  sveltekit-adapter="adapter:cloudflare+cfTarget:pages" \
  drizzle="database:sqlite+sqlite:better-sqlite3" \
  --install npm salon-booking
```
