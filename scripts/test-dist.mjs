import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const remote=process.argv.find(v=>v.startsWith('https://'));
let server;
let url=remote;
if(!url) {
  server=createServer((req,res)=>{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(!pathname.startsWith('/XianTu/')) {res.writeHead(404).end();return;}
    const relative=pathname.slice('/XianTu/'.length)||'index.html';
    const file=path.resolve('dist',relative);
    if(!file.startsWith(path.resolve('dist')+path.sep)||!existsSync(file)){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.png')?'image/png':'text/html; charset=utf-8');
    res.end(readFileSync(file));
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  url=`http://127.0.0.1:${server.address().port}/XianTu/`;
}
let browser;
try {
  const executablePath=process.env.BROWSER_PATH||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/chromium'].find(existsSync);
  browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox','--disable-gpu']});
  const page=await browser.newPage();
  await page.setViewport({width:390,height:844,isMobile:true});
  const errors=[]; const localRequests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(url)&&/\.js|\.png/.test(r.url()))localRequests.push({url:r.url(),status:r.status()});});
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>document.body.innerText.includes('独自修行'),{timeout:45000});
  await page.waitForFunction(()=>Array.from(document.images).filter(i=>i.src.includes('/assets/')).every(i=>i.complete&&i.naturalWidth>0),{timeout:15000});
  const images=await page.$$eval('img',els=>els.map(i=>({src:i.src,loaded:i.complete&&i.naturalWidth>0})));
  assert.ok(images.some(i=>i.src.startsWith(url+'assets/')&&i.loaded));
  assert.ok(localRequests.some(r=>r.url.includes('XianTu.js')&&r.status===200));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',url,title:await page.title(),singlePlayerEntry:true,images,localRequests,pageErrors:errors}));
} finally {
  await browser?.close(); if(server) await new Promise(r=>server.close(r));
}
