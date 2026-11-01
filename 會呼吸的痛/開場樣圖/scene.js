const STYLE = new URLSearchParams(location.search).get('style') || 'pixel';
if (!['pixel', 'paper', 'crayon'].includes(STYLE)) throw new Error('Unknown style');
const W = 1920, H = 1080, SCALE = 6;
const PALETTE = [
  '#f3eddb', '#e7dfc8', '#d5c6a6', '#b6a88b', '#d6ded5', '#becdca',
  '#9eafb0', '#849a9f', '#6e8990', '#546f79', '#3e5965', '#ded5b8',
  '#c4c5a3', '#a7b091', '#899a7b', '#687e68', '#4c6457', '#b68d68',
  '#946e53', '#735746', '#ad6656', '#8e4e45', '#e0b18b', '#3c4544',
];
const C = i => PALETTE[i];
let seed = 419;
function rand() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
const ellipse = (x,y,rx,ry,n=32) => Array.from({length:n}, (_,i) => [x+Math.cos(i/n*Math.PI*2)*rx,y+Math.sin(i/n*Math.PI*2)*ry]);
const box = (x,y,w,h) => [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
const shapes = [];
function shape(name, color, points, texture='') { shapes.push({name,color,points,texture}); }

shape('sky',0,box(-4,-4,328,188));
shape('sun',1,ellipse(241,38,16,16));
shape('cloud',0,[[22,31],[36,27],[49,28],[56,24],[69,27],[80,26],[91,32],[115,34],[126,38],[71,39],[54,36],[29,37]]);
shape('cloud',0,[[161,58],[175,53],[191,55],[201,51],[215,55],[232,56],[249,61],[209,64],[183,61]]);
shape('haze',4,[[0,73],[28,72],[54,74],[79,71],[105,72],[136,75],[176,72],[217,74],[262,71],[320,72],[320,92],[0,92]]);
shape('sea',5,[[0,82],[320,80],[320,144],[0,145]],'water');
shape('sea',6,[[0,106],[31,105],[68,108],[115,106],[160,109],[209,104],[257,108],[320,105],[320,146],[0,147]],'water');
shape('headland',6,[[0,75],[13,73],[21,76],[30,75],[41,80],[61,83],[83,86],[80,91],[0,92]]);
shape('harbor',7,[[0,91],[21,87],[49,87],[72,90],[84,95],[112,99],[105,101],[65,96],[30,94],[0,95]]);
for (let i=0;i<9;i++) {
  const x=9+i*6, y=81+(i%3)*2;
  shape('house',i%3===0?2:1,box(x,y,4,7));
  shape('roof',i%3===0?20:18,[[x-1,y],[x+2,y-2],[x+5,y]]);
  shape('window',9,box(x+1,y+3,1,2));
}
shape('lighthouse',0,[[68,76],[69,65],[72,65],[73,76]]);
shape('lighthouse-cap',20,box(68,63,5,2));
shape('lighthouse-window',9,box(70,67,1,2));
shape('distant-sail',0,[[157,94],[157,85],[150,94]]);
shape('distant-boat',9,[[149,96],[161,96],[158,98],[152,98]]);
shape('hill',13,[[320,111],[300,112],[281,116],[260,121],[241,125],[218,130],[190,134],[166,136],[141,137],[116,140],[87,147],[49,156],[0,160],[0,184],[320,184]],'grass');
shape('path',11,[[320,130],[295,133],[271,143],[240,150],[207,155],[174,157],[133,161],[111,167],[128,180],[202,184],[227,177],[245,168],[273,160],[300,150],[320,147]],'sand');
shape('hill-front',14,[[0,170],[29,163],[62,160],[87,161],[113,165],[137,174],[150,184],[0,184]],'grass');
shape('hill-front',15,[[320,151],[302,155],[295,167],[274,175],[266,184],[320,184]],'grass');
shape('bench-shadow',3,[[170,152],[245,151],[264,156],[194,159]]);
shape('bench-leg',23,[[180,137],[184,137],[182,153],[179,153]]);
shape('bench-leg',23,[[247,137],[250,137],[252,152],[249,152]]);
shape('bench-brace',19,box(179,136,73,2));
shape('bench-post',23,box(181,122,2,19));
shape('bench-post',23,box(249,122,2,19));
shape('bench-back',18,box(175,123,81,4));
shape('bench-back',17,box(175,129,81,4));
shape('bench-seat',17,[[173,137],[257,137],[260,141],[172,141]]);
shape('bench-seat-edge',19,box(172,141,88,2));
shape('ticket',0,[[193,136],[201,135],[203,138],[195,139]]);
shape('ticket',1,[[200,135],[208,136],[207,139],[199,138]]);
shape('ticket-stripe',20,[[194,136],[195,136],[197,139],[196,139]]);
shape('ticket-stripe',20,[[205,136],[206,136],[205,139],[204,139]]);
shape('leg',9,[[230,138],[236,138],[235,153],[231,153]]);
shape('leg',10,[[240,138],[245,137],[244,152],[240,152]]);
shape('shoe',23,[[230,151],[235,151],[237,154],[229,154]]);
shape('shoe',23,[[240,151],[244,151],[248,153],[248,154],[239,154]]);
shape('coat',20,[[229,111],[239,110],[244,114],[247,126],[249,139],[244,142],[230,141],[223,137],[225,123],[225,116]],'cloth');
shape('coat-shade',21,[[239,115],[243,117],[247,132],[249,139],[244,142],[239,140]]);
shape('sleeve',21,[[227,116],[230,119],[228,133],[231,136],[226,136],[223,133]]);
shape('hand',22,[[226,135],[231,135],[232,138],[227,138]]);
shape('neck',22,box(232,107,7,6));
shape('head',22,ellipse(236,103,6,7));
shape('hair',19,[[230,99],[232,96],[236,95],[241,97],[243,102],[241,110],[239,114],[230,112],[229,107]]);
shape('hair-shade',23,[[235,96],[240,97],[243,102],[241,110],[239,114],[236,112],[238,107],[238,101]]);
shape('scarf',2,[[228,112],[239,111],[242,114],[237,117],[230,116]]);
shape('scarf-tail',2,[[240,113],[249,113],[256,110],[262,112],[254,115],[244,117]]);
shape('case-handle',19,[[268,143],[268,139],[275,139],[275,143],[273,143],[273,141],[270,141],[270,143]]);
shape('suitcase',17,[[263,143],[280,142],[281,157],[263,158]],'cloth');
shape('case-side',18,[[276,143],[280,142],[281,157],[277,157]]);
shape('case-strap',2,box(267,143,1,14));
shape('case-strap',2,box(274,143,1,14));
shape('case-label',0,[[268,146],[272,145],[273,148],[269,149]]);

const marks=[];
function mark(points,color,width=0.4) { marks.push({points,color,width}); }
seed=419;
for(let i=0;i<95;i++) {
  const y=84+rand()*48, x=rand()*320;
  if(y>114 && x>160) continue;
  mark([[x,y],[x+2+rand()*12,y+rand()*.3]],i%4===0?0:i%3===0?8:4,i%4===0?.35:.2);
}
mark([[93,46],[96,44],[99,46],[102,44],[105,45]],8,.55);
mark([[112,40],[114,39],[116,40],[118,39],[120,40]],7,.4);
mark([[131,53],[133,52],[135,53],[137,52]],7,.4);
for(let i=0;i<48;i++) {
  const x=rand()*112,y=168+rand()*12;
  mark([[x,y],[x-1-rand()*2,y-3-rand()*7]],i%3===0?12:16,.45);
  if(i%4===0) mark([[x-2,y-6],[x-3,y-9]],2,.8);
}
for(let i=0;i<20;i++) {
  const x=300+rand()*20,y=164+rand()*16;
  mark([[x,y],[x-1-rand()*3,y-4-rand()*8]],i%2?16:12,.5);
}
mark([[234,118],[233,131],[234,137]],21,.45);
mark([[237,99],[236,105],[234,109]],18,.4);

function path(ctx,pts) {
  ctx.beginPath(); pts.forEach(([x,y],i)=>i?ctx.lineTo(x*6,y*6):ctx.moveTo(x*6,y*6)); ctx.closePath();
}
function rasterPolygon(ctx,points,color) {
  ctx.fillStyle=C(color);
  for(let y=Math.max(0,Math.floor(Math.min(...points.map(p=>p[1]))));y<Math.min(180,Math.ceil(Math.max(...points.map(p=>p[1]))));y++) {
    const xs=[];
    for(let i=0;i<points.length;i++) {
      const [ax,ay]=points[i], [bx,by]=points[(i+1)%points.length];
      if((ay<=y+.5 && by>y+.5)||(by<=y+.5 && ay>y+.5)) xs.push(ax+(y+.5-ay)*(bx-ax)/(by-ay));
    }
    xs.sort((a,b)=>a-b);
    for(let i=0;i<xs.length;i+=2) ctx.fillRect(Math.ceil(xs[i]-.5),y,Math.ceil(xs[i+1]-.5)-Math.ceil(xs[i]-.5),1);
  }
}
function rasterLine(ctx,a,b,color) {
  let [x,y]=a.map(Math.round),[tx,ty]=b.map(Math.round);
  const dx=Math.abs(tx-x),dy=-Math.abs(ty-y),sx=x<tx?1:-1,sy=y<ty?1:-1;
  let err=dx+dy; ctx.fillStyle=C(color);
  while(true) { ctx.fillRect(x,y,1,1); if(x===tx&&y===ty)break;const e=2*err;if(e>=dy){err+=dy;x+=sx;}if(e<=dx){err+=dx;y+=sy;} }
}
function drawPixel() {
  const native=document.createElement('canvas'); native.width=320;native.height=180;
  const ctx=native.getContext('2d');
  seed=419;
  const bayer=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
  for(const s of shapes) {
    rasterPolygon(ctx,s.points,s.color);
    if(['sky','sea','hill','hill-front'].includes(s.name)) {
      const mask=ctx.getImageData(0,0,320,180);
      const rgb=C(s.color).match(/[\da-f]{2}/gi).map(v=>parseInt(v,16));
      for(let y=0;y<180;y++)for(let x=0;x<320;x++) {
        const k=(y*320+x)*4;
        if(!rgb.every((v,i)=>mask.data[k+i]===v))continue;
        const threshold=s.name==='sky'?Math.max(0,(y-38)/46)*5:Math.max(0,(y-100)/65)*6;
        if(bayer[y%4][x%4]<threshold) {ctx.fillStyle=C(s.name==='sky'?1:s.color===5?6:s.color===6?7:s.color+1);ctx.fillRect(x,y,1,1);}
      }
    }
  }
  for(const m of marks)for(let i=1;i<m.points.length;i++)rasterLine(ctx,m.points[i-1],m.points[i],m.color);
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.append(canvas);
  const out=canvas.getContext('2d');out.imageSmoothingEnabled=false;out.drawImage(native,0,0,W,H);
  window.pixelNative=native; window.palette=PALETTE;window.artCanvas=canvas;window.artReady=true;
}
function torn(points) {
  const result=[];
  points.forEach(([x,y],i)=>{
    const [nx,ny]=points[(i+1)%points.length],len=Math.hypot(nx-x,ny-y),n=Math.max(1,Math.ceil(len/1.6));
    for(let j=0;j<n;j++){const t=j/n,noise=(rand()-.5)*.65;result.push([x+(nx-x)*t-(ny-y)/len*noise,y+(ny-y)*t+(nx-x)/len*noise]);}
  });return result;
}
function grain(ctx,opacity=.16) {
  const texture=document.createElement('canvas');texture.width=384;texture.height=216;
  const t=texture.getContext('2d'),im=t.createImageData(384,216);
  for(let i=0;i<im.data.length;i+=4){const v=rand()>.48?255:84;im.data[i]=v;im.data[i+1]=v;im.data[i+2]=v;im.data[i+3]=rand()*85;}
  t.putImageData(im,0,0);ctx.save();ctx.globalAlpha=opacity;ctx.fillStyle=ctx.createPattern(texture,'repeat');ctx.fillRect(0,0,W,H);ctx.restore();
}
function drawPaper() {
  seed=419;
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.append(canvas);
  const ctx=canvas.getContext('2d');ctx.fillStyle='#c3a881';ctx.fillRect(0,0,W,H);
  for(const s of shapes) {
    const points=torn(s.points);
    ctx.save();path(ctx,points);
    ctx.shadowColor='rgba(64,52,36,.25)';ctx.shadowBlur=s.name==='sky'?0:9;ctx.shadowOffsetX=3;ctx.shadowOffsetY=7;
    ctx.strokeStyle='#fff9e9';ctx.lineWidth=s.name==='sky'?0:6;ctx.lineJoin='round';ctx.fillStyle=C(s.color);ctx.fill();ctx.stroke();
    ctx.shadowColor='transparent';path(ctx,points);ctx.clip();
    const xs=s.points.map(p=>p[0]*6),ys=s.points.map(p=>p[1]*6),minX=Math.min(...xs),minY=Math.min(...ys),ww=Math.max(...xs)-minX,hh=Math.max(...ys)-minY;
    const count=Math.min(3500,Math.ceil(ww*hh/180));
    for(let i=0;i<count;i++) {
      const x=minX+rand()*ww,y=minY+rand()*hh;
      ctx.strokeStyle=i%3?'rgba(87,68,42,.09)':'rgba(255,255,245,.28)';ctx.lineWidth=.4+rand()*.7;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2+rand()*7,y+(rand()-.5)*2);ctx.stroke();
    }
    if(s.texture==='cloth') {
      ctx.strokeStyle='rgba(255,245,220,.12)';ctx.lineWidth=.6;
      for(let x=minX;x<minX+ww;x+=4){ctx.beginPath();ctx.moveTo(x,minY);ctx.lineTo(x,minY+hh);ctx.stroke();}
    }
    ctx.restore();
  }
  for(const m of marks) {
    ctx.save();ctx.beginPath();m.points.forEach(([x,y],i)=>i?ctx.lineTo(x*6,y*6):ctx.moveTo(x*6,y*6));
    ctx.strokeStyle=C(m.color);ctx.lineWidth=Math.max(1.2,m.width*6);ctx.lineCap='round';ctx.shadowColor='rgba(60,50,30,.15)';ctx.shadowOffsetY=2;ctx.stroke();ctx.restore();
  }
  grain(ctx,.22);window.artCanvas=canvas;window.artReady=true;
}
function drawCrayon() {
  new p5(p=>{
    brush.instance(p);
    p.setup=()=>{
      const cnv=p.createCanvas(W,H,p.WEBGL);window.artCanvas=cnv.elt;
      p.pixelDensity(1);
      p.randomSeed(419);p.noiseSeed(419);p.angleMode(p.DEGREES);
      brush.scaleBrushes(3);p.noLoop();
    };
    p.draw=()=>{
      p.background('#f6efdf');p.translate(-W/2,-H/2);
      brush.noField();brush.noFill();brush.noHatch();
      for(const s of shapes) {
        if(s.name==='sky')continue;
        brush.set('2B',C(s.color),.28);
        brush.mass('crayon',C(s.color),{precision:.65,strength:.9,gradient:0,outline:false});
        brush.polygon(s.points.map(([x,y])=>[x*6,y*6]));
        brush.noMass();
      }
      for(const m of marks) {
        brush.set('2B',C(m.color),Math.max(.35,m.width*1.8));
        for(let i=1;i<m.points.length;i++)brush.line(...m.points[i-1].map(v=>v*6),...m.points[i].map(v=>v*6));
      }
      brush.noMass();brush.noFill();
      brush.set('crayon',C(1),.3);
      for(let i=0;i<30;i++){const y=30+i*12;brush.line(120+rand()*90,y,1200+rand()*500,y+rand()*7);}
      requestAnimationFrame(()=>{
        const output=document.createElement('canvas');output.width=W;output.height=H;
        const ctx=output.getContext('2d');ctx.drawImage(window.artCanvas,0,0,W,H);grain(ctx,.24);
        cnvRemove();document.body.append(output);window.artCanvas=output;window.brushNames=brush.box();window.artReady=true;
      });
      function cnvRemove(){window.artCanvas.style.display='none';}
    };
  });
}
if(STYLE==='pixel')drawPixel();
if(STYLE==='paper')drawPaper();
if(STYLE==='crayon')drawCrayon();
