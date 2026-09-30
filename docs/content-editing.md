# 用 Google 試算表編輯網站內容

網站上的文字、按鈕連結與圖片網址都可以在 Google 試算表中修改，不需要改程式或重新部署。存檔後約 5–10 分鐘會出現在網站上（Cloudflare 快取 5 分鐘，Google 發佈的 CSV 本身也有幾分鐘延遲）。

## 試算表格式

第一列是標題列，必須有 `key` 與 `value` 兩欄；`note` 欄只是說明，網站不會讀取。

| key | value | note |
|---|---|---|
| hero.title | Games Built<br>With Care（儲存格內換行） | |
| hero.button1.link | /contact | 連結網址 |

- **key 不要改**：它對應到網頁上的位置。完整清單見 `content/site-content.csv`。
- **換行**：在儲存格內按 `Ctrl+Enter`（Mac：`⌘+Enter`）。
- **刪掉一列**＝該位置回到網頁原本的預設文字。
- **value 留空**＝
  - `*.label`（按鈕、頁尾連結）：隱藏該按鈕或連結
  - `services.N.title`、`featured.N.title`、`contact.topic.N.title`：隱藏那一格／那一段
  - `portfolio.N.tab`：隱藏整個作品（首頁與 Portfolios 頁同時隱藏）
  - 其他文字：顯示為空白
- **填了才出現的位置**：以下位置預設隱藏，value 有填才會出現：
  - `portfolio.4` 到 `portfolio.9`（填 `portfolio.N.tab`；首頁只顯示 1–3）
  - `portfolio.N.category`（分類標籤）、`portfolio.N.link.label`（作品連結）
  - `about.team.1` 到 `about.team.4`（填 `about.team.N.name`；第 1 位有填才顯示整個團隊區塊）
  - `about.cta.3.label`（About 頁第三個按鈕）、`site.logo`（Logo 圖）、`contact.hero.image`（聯絡頁橫幅照片）
- 以 `#` 開頭的 key 會被忽略，可以當作註解列。

## 頁面與 key 前綴

| 頁面 | 網址 | key 前綴 |
|---|---|---|
| 所有頁面共用 | | `site.*`、`nav.*`、`footer.*`、`cta.*`（首頁與 Portfolios 頁底部的行動區塊） |
| Home | `/` | `home.*`、`hero.*`、`services.*`、`featured.*`、`portfolio.title`／`portfolio.subtitle` |
| Portfolios | `/portfolios` | `portfolios.*`、`portfolio.1`–`portfolio.9` |
| About | `/about` | `about.*` |
| Contact | `/contact` | `contact.*` |

## 允許的值

- **連結**（`*.link`）：`https://…`、`http://…`、`mailto:…`、`tel:…`、站內路徑（例如 `/contact`），或 `#`。其他格式會被拒絕並保留原本連結。
- **圖片**（`*.image`、`*.icon`、`*.photo`、`site.logo`）：`https://…` 或站內路徑（例如 `/assets/…`）。Google 雲端硬碟的分享連結無法直接當圖片使用；請使用可以直接開啟圖片檔的網址，或把圖片放進 repo 的 `public/assets/`。
- **文字**：一律以純文字顯示，HTML 標籤不會生效（例如粗體、斜體無法在試算表中設定）。

## 第一次設定

1. 在 Google 試算表中：**檔案 → 匯入 → 上傳** `content/site-content.csv`，選「取代試算表」。
2. **檔案 → 共用 → 發佈到網路**：選第一個工作表、格式選 **逗號分隔值 (.csv)**，按「發佈」，複製產生的網址。
3. 把網址加到 `wrangler.jsonc` 的 `vars.SHEET_CSV_URL`，然後 `npm run deploy`。

發佈到網路的試算表任何拿到網址的人都能讀取，所以這個試算表只放會出現在網站上的公開文字。

## 出問題時

- 試算表讀不到（沒發佈、網址錯誤、Google 暫時故障）時，網站會繼續顯示最後一次成功讀到的內容；如果從沒讀到過，就顯示網頁內建的預設文字。網站不會因此壞掉。
- 查看錯誤：`npx wrangler tail`，搜尋 `CMS:` 開頭的訊息。

## 新增欄位之後

`content/site-content.csv` 會列出所有 key。試算表裡沒有的 key 會顯示預設文字；要編輯新欄位，把那幾列從 CSV 複製到試算表即可，不用整份重新匯入。

## 修改頁面結構（開發者）

`public/*.html` 由 `scripts/build-pages.mjs` 產生，**不要直接改**：

- 共用的頁首、導覽列、頁尾：`pages/_layout.html`
- 各頁的內容區塊：`scripts/build-pages.mjs` 裡的 `pages`
- 預設文字：`pages/defaults.json`
- 樣式：`public/assets/site.css`

改完執行 `npm run build:pages`（重新產生頁面與 `content/site-content.csv`），再 `npm run deploy`。

可用的標記：

| 標記 | 作用 |
|---|---|
| `data-cms="key"` | 元素內的文字 |
| `data-cms-href="key"` | 連結 |
| `data-cms-src="key"` | 圖片（會移除 `srcset`/`sizes`） |
| `data-cms-content="key"` | meta 的 `content` |
| `data-cms-value="key"` | 按鈕的 `value` |
| `data-cms-placeholder="key"` | 輸入框提示文字 |
| `data-cms-alt="key"` | 圖片說明（alt） |
| `data-cms-show="key"` | 該 key 存在且為空時移除整個元素 |
| `data-cms-reveal="key"` | 元素預設隱藏（`hidden`），該 key 有值時才顯示 |
