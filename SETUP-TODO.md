# 待你申請／設定的項目（簡化版）

> 定案：**LINE 熟客不變**＋**訪客（名稱＋手機）**＋**LINE／PWA 雙通道通知**。  
> **不做** Google 登入、**不做** Telegram。  
> 金鑰填好後跟我說，我告訴你貼哪裡、怎麼測。

---

## 必做

### 1. Web Push VAPID 金鑰（後台手機推播）

- **用途**：管理員加入主畫面後收新預約推播（不吃 LINE 200 則）
- **產生**：回來跟我說，或本機 `npx web-push generate-vapid-keys`
- **變數**：
  - `WEB_PUSH_VAPID_PUBLIC_KEY`
  - `WEB_PUSH_VAPID_PRIVATE_KEY`
  - `WEB_PUSH_VAPID_SUBJECT`（如 `mailto:你的信箱`）

### 2. Cloudflare Turnstile（訪客防機器人）

- **用途**：網頁訪客預約防濫用
- **申請**：Cloudflare Dashboard → Turnstile
- **變數**：
  - `PUBLIC_TURNSTILE_SITE_KEY`
  - `TURNSTILE_SECRET_KEY`

### 3. 遠端 D1 Migration（上線前）

```sh
npx wrangler d1 migrations apply salon-booking-db --remote
```

正式套用前先跟我確認。

---

## 選做

### 4. 自訂網域

提升 Google 商家與品牌信任；之後再綁 Cloudflare Pages。

### 5. Google 商家檔案連結

- 網站：`https://salon-booking-1uu.pages.dev/home`（已遷至 jianyinlyu 帳號；可再綁自訂網域）
- 預約：`https://salon-booking-1uu.pages.dev/`（與 LINE 同一套；切換前需改 LIFF／圖文選單網址）

### 6. LINE 通知

- 現有 `LINE_CHANNEL_ACCESS_TOKEN` 可繼續用（有額度就推）
- 圖文選單**不必改**
- PWA 穩定後可再決定是否減少 LINE 自動通知

---

## 變數總表

| 變數 | 必要？ | 用途 |
|------|--------|------|
| `WEB_PUSH_VAPID_PUBLIC_KEY` | 推播要 | Web Push |
| `WEB_PUSH_VAPID_PRIVATE_KEY` | 推播要 | Web Push |
| `WEB_PUSH_VAPID_SUBJECT` | 推播要 | 如 mailto |
| `PUBLIC_TURNSTILE_SITE_KEY` | 訪客防機器人要 | Turnstile |
| `TURNSTILE_SECRET_KEY` | 同上 | Turnstile |
| `LINE_SESSION_SECRET` | 已有 | Session |
| `LINE_CHANNEL_ACCESS_TOKEN` | 已有 | LINE 管理員通知（過渡） |

~~已取消申請：Google OAuth、Telegram Bot~~

設定位置：本機 `.env`；正式用 Cloudflare Pages Environment variables／Secrets。

---

## 你回來後可以這樣問

- 「VAPID 金鑰怎麼產生」
- 「Turnstile 好了」
- 「可以套遠端 migration 了嗎」
