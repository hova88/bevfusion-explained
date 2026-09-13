import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.argv[2]||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.env.AUDIT_URL||'http://localhost:3000/';
try{
 for(const width of [320,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});
  const go=async i=>{if(width<=760)await page.locator('.mobile-chapters').click();await page.locator('.lesson-nav button').nth(i).click()};
  for(let i=0;i<13;i++){
   if(i)await page.locator('.lesson-next').click();
   await page.waitForTimeout(100);
   assert.equal(await page.locator('.lesson-nav button[aria-current=step]').innerText(),await page.locator('.lesson-nav button').nth(i).innerText());
   const audit=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,top:document.querySelector('#lesson-title').getBoundingClientRect().top,header:document.querySelector('.site-header').getBoundingClientRect().bottom}));
   assert.equal(audit.overflow,false,`${width}px step ${i+1} overflow`);
   assert.ok(audit.top>=audit.header,`${width}px step ${i+1} hidden title`);
   assert.equal(await page.locator('.lesson-experiment>.review:visible').count(),i===12?1:0);
   assert.equal(await page.locator('.deep-tabs:visible').count(),0);
   if([0,3,5,10,12].includes(i))await page.screenshot({path:`/tmp/bevfusion-journey-${width}-${i}.png`});
  }
  await go(3);
  await page.getByLabel('Depth logit at 10 meters',{exact:true}).press('End');
  const value=await page.getByLabel('Depth logit at 10 meters',{exact:true}).inputValue();
  await go(6);await go(3);
  assert.equal(await page.getByLabel('Depth logit at 10 meters',{exact:true}).inputValue(),value);
  await page.locator('.lesson-next').click();await page.goBack();
  assert.match(await page.locator('#lesson-title').innerText(),/uncertainty/);
  await page.reload({waitUntil:'networkidle'});
  assert.match(await page.locator('#lesson-title').innerText(),/uncertainty/);
  await page.goto(base+'#camera-deep',{waitUntil:'networkidle'});
  assert.match(await page.locator('#lesson-title').innerText(),/uncertainty/);
  assert.deepEqual(errors,[]);
  console.log(`${width}px: 13 chapters, single reading surface, next/back, menu, deep state and legacy link pass`);
  await page.close();
 }
}finally{await browser.close()}
