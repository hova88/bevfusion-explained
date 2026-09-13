import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.argv[2]||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.AUDIT_URL||'http://localhost:3000/',{waitUntil:'networkidle'});
  const lab=page.locator('.camera-deep');
  for(let i=0;i<4;i++){
   await page.locator('.deep-tabs button').nth(i).click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  await page.getByRole('tab',{name:'01 / Lift & memory',exact:true}).click();
  const initial=await lab.locator('.outer-row button').nth(3).innerText();
  await page.getByLabel('Depth logit at 10 meters',{exact:true}).press('End');
  assert.notEqual(await lab.locator('.outer-row button').nth(3).innerText(),initial);
  await page.getByRole('button',{name:'Depth 15 channel 1',exact:true}).click();
  assert.match(await lab.locator('.address-card').innerText(),/15 m/);
  await page.getByLabel('Storage precision',{exact:true}).selectOption('2');
  assert.match(await lab.locator('.memory-study h3').innerText(),/304.2/);
  await lab.locator('.deep-lead').scrollIntoViewIfNeeded();
  await page.screenshot({path:`/tmp/bevfusion-deep-${width}.png`});
  await page.getByRole('tab',{name:'02 / Sort & reduce',exact:true}).click();
  await page.getByRole('button',{name:'Apply mask + shared argsort',exact:true}).click();
  assert.equal(await lab.locator('.record-table tbody tr').count(),8);
  await page.getByRole('button',{name:'Move B to a second batch',exact:true}).click();
  assert.match(await lab.locator('.address-card').innerText(),/grouping rank = 1/);
  assert.match(await lab.locator('.address-card').innerText(),/= 28/);
  await page.getByRole('tab',{name:'03 / Gradients & height',exact:true}).click();
  await page.getByLabel('Upstream pooling gradient',{exact:true}).press('Home');
  assert.deepEqual(await lab.locator('.deep-controls .gradient-copies b').allInnerTexts(),['-3.0','-3.0','-3.0']);
  await page.getByLabel('Height slices',{exact:true}).selectOption('4');
  await page.getByRole('button',{name:'Height output channel 11',exact:true}).click();
  assert.match(await lab.locator('.layout-study .deep-equation').innerText(),/in\[:, 2, 3, x, y\]/);
  await page.getByRole('tab',{name:'04 / Cache & contracts',exact:true}).click();
  await page.getByLabel('RGB content',{exact:true}).check();
  assert.equal(await lab.locator('.cache-result.invalid').count(),0);
  await page.getByLabel('Resize / crop / image augmentation',{exact:true}).check();
  assert.equal(await lab.locator('.cache-result.invalid').count(),1);
  await page.getByRole('button',{name:'Segmentation · supplied example',exact:true}).click();
  assert.match(await lab.locator('.contract-pairs').innerText(),/128 × 128/);
  assert.deepEqual(errors,[]);
  console.log(`${width}px: deep-dive interactions and layout passed`);
  await page.close();
 }
}finally{await browser.close()}
