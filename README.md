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
| `/booking-success` | 預約成功頁（🚧 開發中） |
| `/my-bookings` | 個人預約列表 + 取消功能（📋 規劃中） |
| `/admin` | 管理後台（查看所有預約） |

---

## 功能現況

### ✅ 已完成

- LINE LIFF 登入，取得用戶 Profile（displayName、userId）
- 三步驟預約流程（選服務、選日期、選時段）
- 即時時段衝突檢查（本地計算，不撈資料庫）
- 預約資料寫入 Cloudflare D1
- Admin 後台查看所有預約（每 30 秒自動更新）

---

### 🚧 執行中

- **預約成功頁面 `/booking-success`**
  - 預約完成後立即跳轉（redirect from server），不再停留在時間選擇頁
  - 顯示預約摘要（服務、日期、時段）
  - 溫馨提醒文案（告知如需更改請聯繫沙龍）
  - 「返回 LINE 聊天」按鈕（呼叫 `liff.closeWindow()` 關閉 LIFF，回到官方帳號對話視窗）
  - 全手機優化設計

---

### 📋 規劃中（近期）

- **用戶取消預約 `/my-bookings`**
  - 用戶登入後可查看自己的預約列表（以 LINE userId 查詢）
  - 可自行取消預約
  - 取消狀態同步更新至資料庫與 Admin 後台
  - 需要在 DB Schema 新增 `status` 欄位（`pending` / `confirmed` / `cancelled`）

- **Admin 後台手機版優化**
  - 目前 Table 版面在手機上需橫向捲動，體驗差
  - 規劃：寬螢幕保留 Table；手機螢幕（< 768px）改為 Card 列表樣式

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

## 重新建立此專案

```sh
npx sv@0.12.5 create --template minimal --types ts \
  --add prettier eslint tailwindcss="plugins:forms" \
  sveltekit-adapter="adapter:cloudflare+cfTarget:pages" \
  drizzle="database:sqlite+sqlite:better-sqlite3" \
  --install npm salon-booking
```
