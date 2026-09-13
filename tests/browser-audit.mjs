// Run with an installed Playwright module path; does not modify project dependencies.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.argv[2]||'playwright');
const output=process.argv[3]||'/tmp/bevfusion-browser-audit';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try{
 for(const width of [320,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.AUDIT_URL||'http://localhost:3000/',{waitUntil:'networkidle'});
  for(const [i,name] of ['00 Frame SYNC','01 Image ENCODE','02 Lift LIFT','03 Pool REDUCE','04 LiDAR VOXELIZE','05 Align REGISTER','06 Fuse FUSE','07 Head DECODE'].entries()){
   if(width<=760)await page.locator('.mobile-chapters').click();
   await page.locator('.lesson-nav button').nth([0,1,2,4,7,8,10,11][i]).click();
   await page.waitForTimeout(150);
   const audit=await page.evaluate(()=>{
    const root=document.querySelector('.lesson-article');
    const tiny=[...root.querySelectorAll('*')].filter(e=>e.children.length===0&&e.textContent.trim()&&e.getBoundingClientRect().width>0&&parseFloat(getComputedStyle(e).fontSize)<12).map(e=>({tag:e.tagName,cls:e.className,size:getComputedStyle(e).fontSize,text:e.textContent.slice(0,60)}));
    const clipped=[...root.querySelectorAll('input,button,select,canvas')].filter(e=>{const r=e.getBoundingClientRect();if(!r.width)return false;let p=e.parentElement;while(p&&p!==root){if(['auto','scroll'].includes(getComputedStyle(p).overflowX))return false;p=p.parentElement}return r.left<-.5||r.right>innerWidth+.5}).map(e=>({tag:e.tagName,label:e.getAttribute('aria-label'),rect:{x:e.getBoundingClientRect().x,width:e.getBoundingClientRect().width}}));
    return {overflow:document.documentElement.scrollWidth>innerWidth,headingObscured:root.querySelector('h1').getBoundingClientRect().top<document.querySelector('.site-header').getBoundingClientRect().bottom,tiny,clipped,missingImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src)};
   });
   if([0,1,3,6,7].includes(i))await page.screenshot({path:`${output}/${width}-${i}.png`});
   results.push({width,stage:i,...audit,errors:[...errors]});
  }
  await page.close();
 }
 await writeFile(`${output}/report.json`,JSON.stringify(results,null,2));
 console.log(JSON.stringify(results.map(r=>({...r,tiny:r.tiny.map(t=>`${t.tag}.${t.cls} ${t.size}: ${t.text}`).filter((v,i,a)=>a.indexOf(v)===i)})),null,2));
}finally{await browser.close()}
