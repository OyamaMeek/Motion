import {writeFile, stat} from 'node:fs/promises';
import assert from 'node:assert/strict';

export async function renderSamples(task) {
  const root='/Users/oyamahappa/Documents/GitHub/Motion';
  const page=task.page('p1');
  await page.cdp('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  const results=[];
  for(const [style,file] of [['pixel','01-像素遊戲'],['paper','02-紙藝拼貼'],['crayon','03-蠟筆手繪']]) {
    await page.goto(`http://127.0.0.1:8765/會呼吸的痛/開場樣圖/index.html?style=${style}`);
    await page.waitForFunction(()=>window.artReady || window.renderErrors.length);
    const result=await page.evaluate(style=>{
      const canvas=window.artCanvas, errors=[...window.renderErrors];
      if(!window.artReady || errors.length) return {style,errors,ready:false};
      const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      const colors=new Set();let opaque=true,blocks=true,allowed=true;
      const palette=new Set((window.palette||[]).map(c=>parseInt(c.slice(1),16)));
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++) {
        const i=(y*canvas.width+x)*4;
        const c=pixels[i]*65536+pixels[i+1]*256+pixels[i+2];
        colors.add(c);if(pixels[i+3]!==255)opaque=false;
        if(style==='pixel') {
          if(!palette.has(c))allowed=false;
          const j=(Math.floor(y/6)*6*canvas.width+Math.floor(x/6)*6)*4;
          if(pixels[i]!==pixels[j]||pixels[i+1]!==pixels[j+1]||pixels[i+2]!==pixels[j+2])blocks=false;
        }
      }
      return {style,errors,ready:true,width:canvas.width,height:canvas.height,colors:colors.size,opaque,blocks,allowed,
        native:window.pixelNative?[window.pixelNative.width,window.pixelNative.height]:null,brushes:window.brushNames||null};
    },style);
    assert.equal(result.ready,true,JSON.stringify(result));assert.deepEqual(result.errors,[]);
    assert.equal(result.width,1920);assert.equal(result.height,1080);assert.equal(result.opaque,true);
    assert.ok(result.colors>=16);
    if(style==='pixel') {
      assert.deepEqual(result.native,[320,180]);assert.ok(result.colors<=32);
      assert.equal(result.blocks,true);assert.equal(result.allowed,true);
    }
    if(style==='crayon')assert.ok(result.brushes.includes('crayon'));
    const png=await page.evaluate(()=>window.artCanvas.toDataURL('image/png').split(',')[1]);
    const target=`${root}/會呼吸的痛/開場樣圖/${file}.png`;
    await writeFile(target,Buffer.from(png,'base64'));assert.ok((await stat(target)).size>10000);
    await page.screenshot({path:`${root}/.agent/visual/${style}-browser.png`});results.push(result);
  }
  await writeFile(`${root}/會呼吸的痛/開場樣圖/驗證結果.json`,JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify(results,null,2));
}
