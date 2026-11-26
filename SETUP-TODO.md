# 待你申請／設定的項目

> 程式骨架會先做好；下列金鑰與外部設定需要你回來後申請／填入。  
> 填好後再問我，我會告訴你要設在哪裡、怎麼驗證。

---

## 必做（第一階段上線網頁預約＋通知）

### 1. Google 登入（OAuth）

- **用途**：網頁預約主登入；跨裝置查／取消預約
- **到哪申請**：Google Cloud Console → 建立專案 → OAuth 用戶端 ID（類型選「網頁應用程式」）
- **會拿到**：Client ID（形如 `xxxxx.apps.googleusercontent.com`）
- **授權的 JavaScript 來源／重新導向 URI** 先填：
  - `https://salon-booking-a01.pages.dev`
  - 本機測試可再加 `https://localhost:5173`（若用 HTTPS dev）
  - 之後若有自訂網域再補
- **填入變數**：
  - `GOOGLE_CLIENT_ID`
  - `PUBLIC_GOOGLE_CLIENT_ID`（同一組 Client ID）

### 2. Telegram Bot（管理員新預約通知）

- **用途**：不受 LINE 200 則限制的店家通知（建議拉一個店家群）
- **怎麼申請**：
  1. Telegram 找 `@BotFather` → `/newbot` → 取得 **Bot Token**
  2. 把 Bot 加進店家群（或先對 Bot 私聊一則訊息）
  3. 取得 Chat ID：對 Bot 傳訊息後開  
     `https://api.telegram.org/bot<TOKEN>/getUpdates`  
     從 JSON 裡的 `chat.id` 複製（群組通常是負數）
- **填入變數**：
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_CHAT_ID`

### 3. Web Push VAPID 金鑰（後台手機主畫面推播）

- **用途**：管理員把後台「加入主畫面」後收推播
- **怎麼產生**（你回來後跟我說一聲，我可以幫你在專案裡產生一組）：
  - 或本機執行：`npx web-push generate-vapid-keys`
- **會拿到**：Public Key、Private Key
- **填入變數**：
  - `WEB_PUSH_VAPID_PUBLIC_KEY`
  - `WEB_PUSH_VAPID_PRIVATE_KEY`
  - `WEB_PUSH_VAPID_SUBJECT`（可用 `mailto:你的信箱`）

### 4. Cloudflare Turnstile（訪客防機器人）

- **用途**：訪客（手機號碼）預約防濫用
- **到哪申請**：Cloudflare Dashboard → Turnstile → 新增網站
- **會拿到**：Site Key、Secret Key
- **填入變數**：
  - `PUBLIC_TURNSTILE_SITE_KEY`
  - `TURNSTILE_SECRET_KEY`

### 5. 遠端 D1 Migration（上線前必做）

- **用途**：多身份欄位、推播訂閱表等 schema
- **指令**（你確認後我再執行，或你自己跑）：
  ```sh
  npx wrangler d1 migrations apply salon-booking-db --remote
  ```
- **注意**：只打預覽／確認過的環境；正式套用前先講一聲

---

## 選做（建議，但不擋開發）

### 6. 自訂網域

- **用途**：Google 商家、品牌信任、SEO
- **之後要做**：Cloudflare Pages 綁網域；Google OAuth／商家連結一併更新

### 7. Google 商家檔案

- **用途**：對外找得到店、連到官網／預約
- **你要填的連結**（官網頁好了以後）：
  - 網站：官網首頁 URL
  - 預約：同一套預約頁 URL（非第二套系統）

### 8. LINE 通知策略（不必新申請）

- 現有 `LINE_CHANNEL_ACCESS_TOKEN` 可暫時保留
- 等 Telegram／Web Push 穩定後，可改成「額滿停用」或關閉自動 LINE 推播
- 圖文選單本身**不必改**也能繼續給熟客用

---

## 變數總表（方便一次對）

| 變數 | 必要？ | 用途 |
|------|--------|------|
| `GOOGLE_CLIENT_ID` | 網頁 Google 登入要 | Google OAuth |
| `PUBLIC_GOOGLE_CLIENT_ID` | 同上 | 前端 Google 按鈕 |
| `TELEGRAM_BOT_TOKEN` | 通知要 | Telegram Bot |
| `TELEGRAM_CHAT_ID` | 通知要 | 接收群／私聊 |
| `WEB_PUSH_VAPID_PUBLIC_KEY` | 主畫面推播要 | Web Push |
| `WEB_PUSH_VAPID_PRIVATE_KEY` | 同上 | Web Push |
| `WEB_PUSH_VAPID_SUBJECT` | 同上 | 如 `mailto:...` |
| `PUBLIC_TURNSTILE_SITE_KEY` | 訪客防機器人要 | Turnstile |
| `TURNSTILE_SECRET_KEY` | 同上 | Turnstile |
| `LINE_SESSION_SECRET` | 已有 | Session |
| `LINE_CHANNEL_ACCESS_TOKEN` | 已有（可過渡） | LINE 管理員通知 |

設定位置：本機 `.env`；正式環境用 Cloudflare Pages → Settings → Environment variables／Secrets（敏感用 Secret）。

---

## 你回來後怎麼跟我說

直接問其中一句即可，例如：

- 「Google Client ID 申請好了」
- 「Telegram token 跟 chat id 好了」
- 「VAPID 金鑰怎麼產生」
- 「Turnstile 好了」
- 「可以套遠端 migration 了嗎」

我會依你拿到的東西，告訴你要貼哪裡、以及怎麼測。
