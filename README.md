# Salon Booking — LINE 美髮沙龍預約系統

掛載於 LINE 官方帳號的美髮預約 Web App（LIFF），透過 LINE 圖形選單進入，全程手機操作。

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
  - 預約完成後立即跳轉（server redirect 303），不再停留在時間選擇頁
  - 顯示預約摘要（顧客、服務、日期、時段）
  - 溫馨提醒文案（告知如需更改請聯繫沙龍）
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
  - 實作伺服器端白名單驗證（驗證 `lineUserId`）
  - 無權限者會看到「存取被拒」錯誤畫面，保護顧客個資
- **LINE 圖文選單無縫整合** ✅
  - 使用專屬 `liff.line.me` 網址綁定圖文選單，實現免手動登入、自動身份識別的絲滑體驗

---

### 📋 規劃中（近期）

- **用戶取消預約 `/my-bookings`**
  - 用戶登入後可查看自己的預約列表（以 LINE userId 查詢）
  - 可自行取消預約
  - 取消狀態同步更新至資料庫與 Admin 後台
  - 需要在 DB Schema 新增 `status` 欄位（`pending` / `confirmed` / `cancelled`）

### 💰 未來擴充（管理員進階功能）

- **當日預約總覽 / 業績統計**
- **當月報表分析**
- **累計營收統計**
- **預約資料 Excel/CSV 匯出**

---

### 💬 待討論後執行

- **管理員新預約通知**
  - 問題：目前管理員需主動開啟 Admin 頁面才能知道有新預約，缺乏即時通知
  - 建議方向：透過 **LINE Message API Push Message** 推送通知給管理員（最符合使用習慣）
  - 備選：Cloudflare Email Routing 發 Email 通知
  - 前置需求：LINE Bot Channel Access Token、管理員的 LINE userId
  - 狀態：**先記錄，待討論後執行**

- **加入手機日曆（.ics / Google Calendar）**
  - 預約成功頁面新增「加入行事曆」按鈕
  - 可能產生費用或需要額外設定
  - 狀態：**先記錄，暫緩執行**

- **成功頁「查看我的預約」按鈕**
  - 依賴 `/my-bookings` 頁面完成後才能加入
  - 狀態：**待 `/my-bookings` 完成後執行**

---

## 注意事項

- 所有頁面皆附掛於 LINE 官方帳號（LIFF），設計需以手機為主要裝置
- `liff.closeWindow()` → 關閉 LIFF 視窗，回到 LINE 對話視窗
- Admin 後台目前無身份驗證，不應對外公開 URL

---

## 🛡️ 如何新增管理員 (Admin 白名單)

因為 `/admin` 頁面有白名單保護，所以要讓其他店員或設計師進入後台，必須透過以下資料庫指令來新增管理員。

### 步驟 1：取得新管理員的 LINE ID
請新管理員先透過 `https://liff.line.me/...` 首頁**完成一次隨意的預約**。然後執行以下指令查看最近預約的客人的 `userId`：
```sh
npx wrangler d1 execute salon-booking-db --remote --command="SELECT line_user_id, customer_name FROM appointments ORDER BY created_at DESC LIMIT 5;"
```
*(通常為 `U` 開頭的一長串字串)*

### 步驟 2：將新管理員加入白名單
拿到他的 `userId` 後，執行以下指令將其寫入 `admins` 資料表（請替換掉指令中的 ID 跟名字）：
```sh
npx wrangler d1 execute salon-booking-db --remote --command="INSERT INTO admins (line_user_id, name, created_at) VALUES ('請換成他的ID', '請換成他的名字', strftime('%s', 'now') * 1000);"
```
加入成功後，他點擊 `/admin` 網域就能順利進入後台了！

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

#### 第 3 步：建置專案

```sh
npm run build
```

> 輸出目錄為 `.svelte-kit/cloudflare`（已設定在 `wrangler.jsonc`）

#### 第 4 步：部署到 Cloudflare Pages

```sh
wrangler pages deploy .svelte-kit/cloudflare --project-name salon-booking --branch salon-booking
```

> 首次執行會提示建立新 Pages 專案，依指示完成即可。

---

### 日常部署（更新程式碼後）

```sh
# 1. 建置
npm run build

# 2. 部署到生產環境
wrangler pages deploy .svelte-kit/cloudflare --project-name salon-booking --branch salon-booking
```

> ⚠️ **重要**：必須加 `--branch salon-booking` 才會部署到**生產環境**。
> 若省略此參數，wrangler 會偵測 git branch（如 `main`），部署到**預覽環境**，
> 正式網域 `salon-booking-a01.pages.dev` 不會更新。

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
| `wrangler pages deploy ...` | 部署至 Cloudflare Pages |
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

