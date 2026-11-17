import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { stripTypeScriptTypes } from 'node:module';
import { execFileSync } from 'node:child_process';
import { parse, compileStyle } from '@vue/compiler-sfc';
import puppeteer from 'puppeteer-core';

const baseline = process.argv.includes('--baseline');
const mainPath = 'src/components/dashboard/MainGamePanel.vue';
const main = baseline ? execFileSync('git',['show',`bc94e2645581b7370dec17921217e21dbca5ea1f:${mainPath}`],{encoding:'utf8'}) : readFileSync(mainPath,'utf8');
const formatted = readFileSync('src/components/common/FormattedText.vue','utf8');
const css = [main,formatted].flatMap((s,i) => parse(s).descriptor.styles.map(style => {
  const compiled=compileStyle({source:style.content,id:`data-v-test${i}`,scoped:style.scoped});
  assert.deepEqual(compiled.errors,[]); return compiled.code;
})).join('\n');
// Both actual template branches wrap FormattedText in .prose.
assert.match(main,/v-if="isAIProcessing && streamingContent" class="prose"/);
assert.match(main,/<div class="prose">\s*<FormattedText/);
const prefs=stripTypeScriptTypes(readFileSync('src/utils/readingPrefs.ts','utf8'));
const html=`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style>
<div id="app"><div id="final" class="prose" data-v-test0><div class="formatted-text" data-v-test1><span>山风吹过竹林，远处传来钟声。</span></div></div>
<div id="stream" class="prose" data-v-test0><div class="formatted-text" data-v-test1><span>山风吹过竹林，远处传来钟声。</span></div></div>
<button class="send-btn" data-v-test0>发送</button></div>
<script type="module">${prefs}; window.prefs={applyNarrativeSize,applyNarrativeLeading,applyUIScale};applyStoredReadingPrefs();window.ready=true;</script>`;
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const executablePath=process.env.BROWSER_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/chromium','/usr/bin/google-chrome',
].find(existsSync);
assert.ok(executablePath,'Set BROWSER_PATH to a Chromium browser');
let browser;
try {
  browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox','--disable-gpu']});
  const page=await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/XianTu/`);
  await page.waitForFunction(()=>window.ready);
  const results=[];
  for (const width of [390,480,481,1280]) {
    await page.setViewport({width,height:900});
    const button=await page.$eval('button',e=>getComputedStyle(e).fontSize);
    for (const size of [14,22]) for (const [leading,ratio] of [['tight',1.8],['normal',2],['loose',2.25]]) {
      await page.evaluate(({size,leading})=>{
        window.prefs.applyNarrativeSize(size);window.prefs.applyNarrativeLeading(leading);
        localStorage.setItem('dad_game_settings',JSON.stringify({fontFamily:'songti',narrativeSize:size,narrativeLeading:leading,uiScale:100}));
      },{size,leading});
      const check=async()=>{
        for (const id of ['final','stream']) {
          const style=await page.$eval(`#${id} span`,e=>({size:getComputedStyle(e).fontSize,line:getComputedStyle(e).lineHeight}));
          assert.equal(style.size,`${size}px`,`${width}px ${id}`);
          assert.ok(Math.abs(parseFloat(style.line)-size*ratio)<0.01,`${width}px ${id} line-height: ${style.line}`);
        }
        assert.equal(await page.$eval('button',e=>getComputedStyle(e).fontSize),button);
      };
      await check(); await page.reload(); await page.waitForFunction(()=>window.ready); await check();
      results.push({width,size,leading,reloaded:true});
    }
  }
  await page.evaluate(()=>window.prefs.applyUIScale(120));
  assert.equal(await page.evaluate(()=>document.documentElement.style.getPropertyValue('--ui-scale')),'1.2');
  console.log(JSON.stringify({result:'PASS',cases:results.length,branches:['final','stream'],widths:[390,480,481,1280],reload:true,buttonUnchanged:true,uiScale:1.2}));
} finally {
  await browser?.close(); await new Promise(resolve=>server.close(resolve));
}
