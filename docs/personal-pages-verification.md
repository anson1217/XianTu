# 個人版驗收紀錄

驗收日期：2026-11-17（Asia/Taipei）。基準：`bc94e2645581b7370dec17921217e21dbca5ea1f`。

## 已實際執行

| 檢查 | 結果 |
| --- | --- |
| 舊版 NPC 重現 | 相同 8 位合成同門生成時有練氣後期、四／六／八層；真實無關 GM 回合後 8 位全部變凡人。 |
| 修補版 NPC 回歸 | `npm run test:npc` 通過；新舊格式、繁簡、分隔符、數字層數、凡人、原物件與有效進度、無效生成／演化、未知／缺漏資料均涵蓋。 |
| 保留資料 | 同名人物跳過；人數、職位、好感、人物記憶、主角保持。測試 JSON 序列化／重載與重複修復通過。嚴格回合部分更新也保留層數。玩家與 NPC 原字串指令仍被驗證器拒絕。 |
| 舊版閱讀重現 | 固定上游樣式在 390px、選 14px 時 computed font-size 仍是 16px，測試按預期失敗。 |
| 修補版閱讀回歸 | `npm run test:reading` 24 組通過：390／480／481／1280px × 14／22px × tight／normal／loose。每組檢查正式與串流文字、重新載入後設定、按鈕字號不變；另檢查介面縮放 120% 的變數。 |
| 型別 | `npm run type-check`（tsc --noEmit）成功。 |
| 正式建置 | `npm run build` 成功，webpack 5.101.0 無編譯錯誤。 |
| 靜態站點 | `node scripts/test-dist.mjs` 通過。390px 測試瀏覽器從 `/XianTu/` 載入；首頁 HTTP 200、XianTu.js 與本站 single/cloud PNG 都 200、獨自修行入口可見，pageErrors 為空。 |

本機 Node 24.22.1／npm 10.9.4。使用專案原有 package-lock.json，`npm ci --ignore-scripts --no-audit --no-fund` 安裝 656 個套件成功。因 D 槽解壓耗時且半成品目錄被鎖，本次驗收在系統暫存區的同碼副本執行；未更動鎖定檔。一般重建仍可使用 `npm ci`。測試使用獨立 headless Chrome 暫存設定檔。

## 尚未當作已驗收的項目

- 沒有實體手機操作測試；上述是 Chromium 窄螢幕自動化。
- 沒有付費／真實 AI API 請求。
- 沒有提供或讀取玩家正式存檔／手動修正版；柳輕衣、顧長青及真實 8 位同門未做實檔核對。
- 舊檔測試直接把合成舊字串資料送入實際修復、GM 回合與序列化重載；未聲稱完成手機檔案選擇器的實際搬檔操作。

## 部署

目標：`anson1217/XianTu` 的 `personal-pages` 分支，沿用 `.github/workflows/pages.yml`。公開網址：<https://anson1217.github.io/XianTu/>。

推送該分支自動觸發 Pages 工作流程，亦保留手動執行及 v* tag 的觸發方式。最新部署結果應核對該 fork 的 Actions 執行紀錄與線上靜態檢查，不以本機 build 成功代替部署成功。

手機搬檔及再部署步驟見 [personal-pages-handoff.md](personal-pages-handoff.md)。
