# 手機煉製工坊重疊修補

2026-11-18：煉丹、煉器共用 `src/views/game/CraftingPage.vue`。

手機斷點（768px 以下）把爐鼎與材料架改成垂直 flex 排列，並讓兩區的 overflow 可見，但頁面仍受可視高度限制。兩區預設允許 flex shrink，爐鼎高度因而被壓縮，控制項溢出並與下一區重疊。

修補僅在手機既有 `.forge, .shelf` 規則補上 `flex-shrink: 0`，讓區塊保留內容高度，沿用 `.craft-page` 原有捲動。桌面欄位、材料選擇、煉製消耗與 AI 行為未改。

驗證指令（Node 24、npm ci、Chrome／Edge／Chromium）：

```powershell
node scripts/test-crafting-layout.mjs --baseline
node scripts/test-crafting-layout.mjs
npm run type-check
npm run lint:check
npm run build
```

第一條固定載入 `aaefe23` 的舊樣式，應在「丹 360x600」因控制項與材料架重疊而失敗。第二條檢查兩種模式 × 360／390／480／768／769／1280px × 600／844px 高度，共 24 組；驗證手機區塊內容不溢出、材料架排列與捲動可達，桌面維持左右欄且無相交。

這是使用實際頁面及父容器樣式、合成內容的隔離 Chromium 排版測試，未使用正式存檔或 AI API，也不等同實體手機驗收。瀏覽器可透過 `BROWSER_PATH` 指定。

部署沿用自己 fork 的 master 與既有 Pages 工作流程。網址：<https://anson1217.github.io/XianTu/>。
