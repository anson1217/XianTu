import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parse } from '@vue/compiler-sfc';
import puppeteer from 'puppeteer-core';

// Render the real page styles with synthetic content, without saves or AI calls.
const pagePath = 'src/views/game/CraftingPage.vue';
const baseline = process.argv.includes('--baseline');
const source = baseline
  ? execFileSync('git', ['show', `aaefe23b26337a8033ffb059d0fa11f807a3ffad:${pagePath}`], { encoding: 'utf8' })
  : readFileSync(pagePath, 'utf8');
const styles = s => parse(s).descriptor.styles.map(style => style.content).join('\n');
const css = ['src/styles/creation-theme.css', 'src/styles/game-theme.css']
  .map(p => readFileSync(p, 'utf8')).join('\n')
  + styles(readFileSync('src/views/GameView.vue', 'utf8')) + styles(source)
  + styles(readFileSync('src/components/common/RangeSlider.vue', 'utf8'));
const slots = Array.from({ length: 5 }, (_, i) => {
  const a = -Math.PI / 2 + Math.PI * 2 * i / 5;
  return `<button class="slot" style="left:${50 + Math.cos(a) * 41}%;top:${50 + Math.sin(a) * 41}%">${i + 1}</button>`;
}).join('');
const controls = ['火候', '灵气投入', '神识投入'].map(name =>
  `<label class="ctl"><span class="ctl-name">${name}</span><div class="range-slider"><span class="range-slider-thumb"></span></div><output>100% <small>-10000</small></output></label>`).join('');
const html = mode => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{box-sizing:border-box}body{margin:0;background:#0b101b;color:#eee}.stage{height:100vh}${css}</style>
<main class="stage"><section class="sheet"><header class="sheet-head"><h2>炼制工坊</h2></header><div class="sheet-body">
<div class="craft-page"><section class="forge"><div class="forge-top"><div class="gm-seg"><button>炼丹</button><button>炼器</button></div>
<p class="forge-hint">点槽位选中，再点右侧材料放入；同一材料放入次数不超过持有数量。</p></div>
<div class="cauldron-wrap"><div class="cauldron-stage"><div class="cauldron"><span class="cauldron-glyph">${mode}</span></div>${slots}</div></div>
<div class="controls">${controls}<div class="ctl formation"><label class="ctl-name">阵法</label><select class="gm-field"><option>聚灵阵（灵气 +20% · 神识 +10%）</option></select><small class="formation-desc">测试阵法说明</small></div></div>
<footer class="forge-foot"><p class="cost">合计消耗 灵气 10000 / 20000 · 神识 10000 / 20000</p><label class="sim-toggle">成功率推演</label><button class="cc-btn">清空</button><button class="cc-btn primary">开炉炼制</button></footer></section>
<aside class="shelf"><header class="shelf-head"><h3>材料架</h3><input placeholder="搜索材料"></header><ul class="gm-list shelf-list">${Array.from({length:8},(_,i)=>`<li><button class="gm-row"><span class="gm-row-main"><span class="gm-row-title">测试材料${i+1}</span><span class="gm-row-sub">合成测试资料</span></span><span class="gm-row-end">余 10</span></button></li>`).join('')}</ul></aside>
</div></div></section></main>`;
const executablePath = process.env.BROWSER_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/chromium', '/usr/bin/google-chrome',
].find(existsSync);
assert.ok(executablePath, 'Set BROWSER_PATH to a Chromium browser');
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
let cases = 0;
try {
  const page = await browser.newPage();
  for (const mode of ['丹', '器']) for (const width of [360, 390, 480, 768, 769, 1280]) for (const height of [600, 844]) {
    await page.setViewport({ width, height });
    await page.setContent(html(mode));
    const result = await page.evaluate(() => {
      const rect = selector => {
        const r = document.querySelector(selector).getBoundingClientRect();
        return { top:r.top, bottom:r.bottom, left:r.left, right:r.right };
      };
      const forge = rect('.forge'), shelf = rect('.shelf'), controls = rect('.controls'), foot = rect('.forge-foot');
      const intersects = (a,b) => Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
      return { forge, shelf, foot, overlaps:intersects(controls,shelf)||intersects(foot,shelf), display:getComputedStyle(document.querySelector('.craft-page')).display };
    });
    const label = `${mode} ${width}x${height}`;
    assert.equal(result.overlaps, false, `${label}: controls/material shelf overlap`);
    if (width <= 768) {
      assert.equal(result.display, 'flex');
      assert.ok(result.foot.bottom <= result.forge.bottom + 1, `${label}: forge content escaped`);
      assert.ok(result.shelf.top >= result.forge.bottom, `${label}: shelf must follow forge`);
      await page.$eval('.craft-page', e => { e.scrollTop = e.scrollHeight; });
      const reachable = await page.$eval('.shelf', e => {
        const shelf = e.getBoundingClientRect(), viewport = e.closest('.craft-page').getBoundingClientRect();
        return shelf.bottom <= viewport.bottom + 1;
      });
      assert.ok(reachable, `${label}: shelf must be reachable by scrolling`);
    } else {
      assert.equal(result.display, 'grid');
      assert.ok(result.shelf.left >= result.forge.right, `${label}: desktop columns`);
    }
    cases++;
  }
  console.log(JSON.stringify({ result:'PASS', cases, modes:['炼丹','炼器'], widths:[360,390,480,768,769,1280], heights:[600,844] }));
} finally {
  await browser.close();
}
