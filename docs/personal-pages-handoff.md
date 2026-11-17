# 個人版部署與手機搬檔

本次僅針對 `anson1217/XianTu`，基於 `bc94e2645581b7370dec17921217e21dbca5ea1f`。部署目標：<https://anson1217.github.io/XianTu/>。未修改《玄寰界》、原作者網站、人物名錄的 AI 提供方式或宗門玩法；LICENSE、NOTICE 保留原檔。

## 修補內容

- `src/utils/npcRealm.ts`：NPC 共用正規化函式。辨識舊字串、繁簡別名與分隔符，保存四／六／八層等真實層數。已有物件保留名稱、階段、有效進度及額外資料。真正的凡人仍是凡人；未知舊值保留供核對並輸出警告，不推定為凡人。
- `src/services/sectContentService.ts`：生成與演化寫入前正規化。同名人物繼續跳過；生成遇到無效境界會中止此次寫入並報錯，無效演化保留原境界並顯示提示。
- `src/utils/dataRepair.ts`、`src/utils/dataValidation.ts`：NPC 修復共用同一函式；玩家境界與回合指令驗證保護未放寬。
- `src/utils/prompts/tasks/sectPrompts.ts`：同門與演化要求物件輸出，仍接受舊格式；宗門高層顯示用字串未改。
- `src/components/dashboard/MainGamePanel.vue`：刪除手機 `.prose` 固定字號與行距。正式、串流正文沿用現有閱讀變數。
- `webpack.config.js`：PNG 使用本部署的相對資源路徑。
- `.github/workflows/pages.yml`：沿用 Pages 流程，Node 24，建置前執行 NPC 測試及型別檢查。

已經被舊版覆寫成「凡人」、且沒有其他備份的原境界無法自動還原。本版不按職位批次升級人物。

## 本機重建與驗收

需 Node.js 24 與 npm。在專案根目錄執行：

```powershell
npm ci
npm run test:npc
npm run test:reading
npm run type-check
npm run build
```

`test:reading` 使用本機 Chrome／Edge／Chromium 的全新暫存測試瀏覽器，找不到時以 `BROWSER_PATH` 指定執行檔。它不會使用個人瀏覽器的存檔。

舊版重現（測試 loader 固定讀取上述基準 SHA，故需保留 Git 歷史）：

```powershell
$env:REGRESSION_BASELINE='1'
node --import ./scripts/test-loader.mjs ./scripts/reproduce-npc-bug.mjs
Remove-Item Env:REGRESSION_BASELINE
node --import ./scripts/test-loader.mjs ./scripts/reproduce-npc-bug.mjs
node scripts/test-reading.mjs --baseline
```

最後一條在舊樣式下應因 390px 正文仍是 16px 而失敗。修補版 `test:reading` 應通過 390、480、481、1280px，14／22px 與三種行距、正式／串流正文、重載設定及按鈕字號不變的檢查。

NPC 測試完全使用合成資料與模擬 AI 回應，會呼叫真實生成、演化、舊檔修復及無關 GM 回合，再序列化重載。測試也檢查重複修復、同名跳過、未知／缺漏／無效資料、原物件、人物數量、職位、好感、記憶、主角及指令保護。沒有真實存檔 fixtures 或付費 API 呼叫。

`dist/` 是部署產物，必須透過 HTTP/HTTPS 開啟。可在專案根目錄執行 `python -m http.server 8080 --directory dist`，瀏覽 `http://localhost:8080/`。此應用仍使用既有 Vue／Vue Router／Lodash 等 CDN，並非完全離線版。

## GitHub Pages 再部署

1. 在自己的 fork 開啟 **Settings → Pages → Build and deployment → Source → GitHub Actions**。
2. 本版使用自己 fork 的 `master` 部署分支，更新該分支會自動觸發原有的 Pages 工作流程。也可開啟 **Actions → Deploy GitHub Pages → Run workflow**，選擇 `master` 再執行；既有 `github-pages` 環境只允許此分支部署。
3. 等待 `build` 與 `deploy` 都成功後，開啟 <https://anson1217.github.io/XianTu/>。若看見舊頁，重新整理／清除網站快取時避免勾選網站資料，以免清掉本地存檔。
4. 除 `master` 外，普通分支 push 不會觸發 Pages 流程。流程保留手動及 `v*` tag 的觸發方式，但環境仍可能拒絕非 `master` 來源；日常更新請使用自己 fork 的 `master`。不要向原作者儲存庫推送。

相對 JS 與 PNG 路徑支援 `/XianTu/`。既有記憶體路由不依賴 Pages 的伺服器端路由重寫。單機入口仍是「独自修行」。公益 API／作者帳號／作者後端不列為個人部署可用的必要條件。

## 手機匯入與接續遊玩

1. 在原網站先把正常進度另存到一個正常存檔槽，保留原站與原檔。到角色管理選擇「导出」角色，或遊戲存檔頁選「导出角色」，下載含角色及正常存檔的 JSON；確認手機「檔案／下載項目」找得到。
2. 用同一支手機的常用瀏覽器開啟新網址，選「独自修行」，在角色管理按「导入角色」，選剛才的角色 JSON 並確認匯入。選角色、載入正常存檔槽。
3. 若只有 `{type: 'saves', ...}` 存檔備份，需先有對應單機角色，選取該角色後「导入存档」，再載入指定槽。同名存檔可能覆蓋，所以先保留備份。
4. 在新版「API」頁設定自己的模型、URL 與 Key。設定及自訂提示詞可另行匯出／匯入；不要把含私密資料的檔案放進公開 repo 或網站。
5. 在新版核對人物名錄及層數，另存測試槽後再跑一個無關回合，重新載入核對。已提供手動修正版時，用它匯入，不要用已損壞且無備份的境界推測原值。
6. 在「閱讀」切換正文 14／22px 及行距，重開網頁確認保留。正文調整不應放大按鈕；「介面縮放」依原行為另行設定。

不同網址即使同一支手機，也有各自獨立的 localStorage／IndexedDB；新網址不會自動讀取原站存檔。不要依賴原站的「上次對話」回退點搬檔。避免無痕模式及清除網站資料；重要進度定期另存 JSON。

## 驗收界線

自動化結果與部署提交見同目錄 `personal-pages-verification.md`。手機真機、付費 API 與玩家真實修正版存檔若未提供／未測，不能視為已完成驗收。
