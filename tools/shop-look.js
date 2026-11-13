// Procedural shop integration check. Serve the repository, then:
// node tools/shop-look.js [origin] [optional capture directory]
// Requires Playwright; CHROMIUM_EXECUTABLE selects an installed browser.
const { chromium } = require('playwright');
const assert = require('assert').strict, fs = require('fs'), path = require('path');
const origin = process.argv[2] || 'http://127.0.0.1:5500', output = process.argv[3];
(async () => {
  const browser = await chromium.launch({ ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}), args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [], art = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('request', r => { if (/\/assets\/|\.(png|jpg|webp)(\?|$)/.test(r.url()) && !/icon-/.test(r.url())) art.push(r.url()); });
    await page.goto(origin + '/?debug&seed=7&nosw');
    await page.waitForFunction(() => globalThis.dbg && G.ui.shopRoom);
    const result = await page.evaluate(() => {
      G.core.loop.setPaused(true); G.core.state.change('shop');
      const room = G.ui.shopRoom, save = G.state.save, walk = dbg.shopWalk('RRUUU');
      const queue = [room.MAT.slice()], visited = new Set(), targets = new Set();
      for (let q = 0; q < queue.length; q++) {
        const [x,y] = queue[q], key = x+':'+y; if (visited.has(key)) continue; visited.add(key);
        for (const [face,dx,dy] of [['up',0,-1],['right',1,0],['down',0,1],['left',-1,0]]) {
          const st = room.create(); st.c=x; st.r=y; st.face=face;
          const target=room.facing(st); if(target)targets.add(target);
          if(!room.isBlocked(x+dx,y+dy)&&!visited.has((x+dx)+':'+(y+dy)))queue.push([x+dx,y+dy]);
        }
      }
      save.coins=1000; const lure=G.data.gear.lures[0]; save.baits[lure.id]=0;
      G.ui.shop.shelf('lures',0); const coins=save.coins;G.ui.shop.act();
      const purchase={spent:coins-save.coins,count:save.baits[lure.id],cost:lure.cost*lure.pack,pack:lure.pack};
      let frames=0, empty=0;
      for(const kind of ['fisher','dog','rusty'])for(const look of kind==='rusty'?[null]:G.data.looks[kind==='dog'?'dogs':'fishers']){
        room.prebake(kind,look);
        for(const dir of ['down','up','right','left'])for(let fr=0;fr<4;fr++){
          const im=room.sprite(kind,dir,fr,look), bytes=im.getContext('2d').getImageData(0,0,im.width,im.height).data;
          if(!bytes.some((v,i)=>i%4===3&&v))empty++;frames++;
        }
      }
      const cv=document.createElement('canvas');cv.width=640;cv.height=360;const c=cv.getContext('2d');
      const env={hour:23.5,night:1,grey:0,rain:.6,fog:.5,flash:0,strange:'figure',st:.5},st=room.create(),stock={rods:[],minnows:7,crickets:6},rusty={face:'down',fr:0};
      room.draw(c,st,4,env.hour,rusty,stock,env);
      const n=G.gfx.bake.stats.canvases,saved=JSON.stringify(save),t=performance.now();
      for(let i=0;i<120;i++){env.strange=i%2?'clock':'figure';room.draw(c,st,4+i/60,env.hour,rusty,stock,env);}
      const ms=(performance.now()-t)/120, added=G.gfx.bake.stats.canvases-n,stable=saved===JSON.stringify(save);
      G.core.state.change('sailing'); G.core.state.change('shop');const reentry=dbg.shopWalk('RRUUU').faced;
      return {walk,targets:[...targets].sort(),blocked:room.blocked().length,geometry:[room.T,room.TOP,room.OX,room.OY],purchase,frames,empty,added,stable,ms,restored:c.globalAlpha===1&&c.globalCompositeOperation==='source-over',reentry};
    });
    assert.equal(result.walk.faced,'rusty');assert.equal(result.reentry,'rusty');assert.equal(result.blocked,59);
    assert.deepEqual(result.geometry,[32,44,128,52]);
    assert.deepEqual(result.targets,['cat','cooler','crickets','gear','guitar','jar','lures','rack','rusty','tank','worms']);
    assert.equal(result.purchase.spent,result.purchase.cost);assert.equal(result.purchase.count,result.purchase.pack);
    assert.equal(result.frames,144);assert.equal(result.empty,0);assert.equal(result.added,0);assert(result.stable&&result.restored);
    if(output){
      fs.mkdirSync(output,{recursive:true});
      for(const hour of [12,19.2,23.5]){
        const data=await page.evaluate(hour=>{
          const cv=document.createElement('canvas');cv.width=640;cv.height=360;const c=cv.getContext('2d'),L=G.scene.sailing.light(hour);
          const st=G.ui.shopRoom.create();st.dog.face='right';
          G.ui.shopRoom.draw(c,st,4,hour,{face:'down',fr:0},{rods:[],minnows:7,crickets:6},{hour,night:L.night,grey:L.grey,fog:.46,rain:0,flash:0,strange:'',st:0});return cv.toDataURL();
        },hour);
        fs.writeFileSync(path.join(output,`shop-${hour}-native.png`),Buffer.from(data.split(',')[1],'base64'));
        await page.evaluate(src=>new Promise(resolve=>{const im=new Image();im.onload=()=>{document.body.replaceChildren(im);im.style.cssText='position:fixed;left:0;top:0;width:1280px;height:720px;image-rendering:pixelated';resolve();};im.src=src;}),data);
        await page.screenshot({path:path.join(output,`shop-${hour}-2x.png`)});
      }
      await page.setViewportSize({width:844,height:390});await page.reload();await page.waitForFunction(()=>globalThis.dbg&&G.ui.shopRoom);
      await page.evaluate(()=>{G.core.loop.setPaused(true);G.core.state.change('shop');document.querySelectorAll('pre').forEach(x=>x.remove());});
      await page.screenshot({path:path.join(output,'shop-mobile.png')});
    }
    assert.deepEqual(errors,[]);assert.deepEqual(art,[]);console.log(JSON.stringify({...result,pageErrors:errors.length,artRequests:art.length}));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
