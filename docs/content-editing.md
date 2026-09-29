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
  - `services.N.title`、`featured.N.title`：隱藏整個方塊
  - `portfolio.N.tab`：隱藏整個作品分頁
  - 其他文字：顯示為空白
- 以 `#` 開頭的 key 會被忽略，可以當作註解列。

## 允許的值

- **連結**（`*.link`）：`https://…`、`http://…`、`mailto:…`、`tel:…`、站內路徑（例如 `/contact`），或 `#`。其他格式會被拒絕並保留原本連結。
- **圖片**（`*.image`、`*.icon`）：`https://…` 或站內路徑（例如 `/assets/…`）。Google 雲端硬碟的分享連結無法直接當圖片使用；請使用可以直接開啟圖片檔的網址，或把圖片放進 repo 的 `public/assets/`。
- **文字**：一律以純文字顯示，HTML 標籤不會生效（例如粗體、斜體無法在試算表中設定）。

## 第一次設定

1. 在 Google 試算表中：**檔案 → 匯入 → 上傳** `content/site-content.csv`，選「取代試算表」。
2. **檔案 → 共用 → 發佈到網路**：選第一個工作表、格式選 **逗號分隔值 (.csv)**，按「發佈」，複製產生的網址。
3. 把網址加到 `wrangler.jsonc` 的 `vars.SHEET_CSV_URL`，然後 `npm run deploy`。

發佈到網路的試算表任何拿到網址的人都能讀取，所以這個試算表只放會出現在網站上的公開文字。

## 出問題時

- 試算表讀不到（沒發佈、網址錯誤、Google 暫時故障）時，網站會繼續顯示最後一次成功讀到的內容；如果從沒讀到過，就顯示網頁內建的預設文字。網站不會因此壞掉。
- 查看錯誤：`npx wrangler tail`，搜尋 `CMS:` 開頭的訊息。

## 新增可編輯的位置（開發者）

在 `public/*.html` 的元素上加標記，然後執行 `node scripts/export-content.mjs` 重新產生 `content/site-content.csv`：

| 標記 | 作用 |
|---|---|
| `data-cms="key"` | 元素內的文字 |
| `data-cms-href="key"` | 連結 |
| `data-cms-src="key"` | 圖片（會移除 `srcset`/`sizes`） |
| `data-cms-content="key"` | meta 的 `content` |
| `data-cms-value="key"` | 按鈕的 `value` |
| `data-cms-placeholder="key"` | 輸入框提示文字 |
| `data-cms-show="key"` | 該 key 存在且為空時移除整個元素 |
