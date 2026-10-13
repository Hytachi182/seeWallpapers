/* Koi Autumn Pond: original code-drawn koi pond, no external assets or network requests. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'), main=canvas.getContext('2d',{alpha:false});
  const api=window.seeWallpaper, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const params=new URLSearchParams(location.search), preview=params.has('preview');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), on=v=>v!==false&&v!=='false'&&v!==0;
  const hash=n=>{const k=Math.sin(n*127.1+311.7)*43758.5453;return k-Math.floor(k);};
  const TAU=Math.PI*2;
  let settings={speed:1,koi:6,leaves:1,dusk:false,rain:false,rays:true,...api?.getSettings?.()};
  const num=(key,fallback,a,b)=>Number.isFinite(Number(settings[key]))?clamp(Number(settings[key]),a,b):fallback;
  const speed=()=>num('speed',1,0,2), koiCount=()=>Math.round(num('koi',6,3,9)), leafDensity=()=>num('leaves',1,0,2);
  let time=preview?clamp(Number(params.get('preview'))||0,0,86400):12, paused=preview, fps=30;
  let c=main,w=1,h=1,u=1,L={},floor=null,rim=null,canopyLayers=[];
  const taps=[];

  const css=(a,alpha=1)=>`rgba(${a[0]|0},${a[1]|0},${a[2]|0},${alpha})`;
  const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
  function ellipse(x,y,rx,ry,rot=0){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rot,0,TAU);}
  function soft(x,y,rx,ry,color,alpha){
    const g=c.createRadialGradient(x,y,0,x,y,rx);g.addColorStop(0,css(color,alpha));g.addColorStop(1,css(color,0));
    c.save();c.translate(x,y);c.scale(1,ry/rx);c.translate(-x,-y);c.fillStyle=g;c.fillRect(x-rx,y-rx,rx*2,rx*2);c.restore();
  }
  function smooth(points){
    const path=new Path2D(),n=points.length,m=mid(points[n-1],points[0]);path.moveTo(m[0],m[1]);
    for(let j=0;j<n;j++){const a=points[j],b=mid(a,points[(j+1)%n]);path.quadraticCurveTo(a[0],a[1],b[0],b[1]);}
    path.closePath();return path;
  }
  function into(target,fn){const prev=c;c=target.getContext('2d');fn();c=prev;}
  function layer(){const cv=document.createElement('canvas');cv.width=w;cv.height=h;return cv;}

  // A five-lobed maple leaf, unit size, tip pointing up.
  const LEAF=(()=>{
    const R=[[.13,-.6],[.36,-.78],[.3,-.4],[.8,-.5],[.6,-.2],[.96,.06],[.48,.12],[.52,.44],[.14,.2],[.03,.3]];
    const p=new Path2D();p.moveTo(0,-1);R.forEach(([x,y])=>p.lineTo(x,y));[...R].reverse().forEach(([x,y])=>p.lineTo(-x,y));p.closePath();return p;
  })();
  const VEINS=(()=>{const p=new Path2D();for(const [x,y] of [[0,-.9],[.74,-.46],[-.74,-.46],[.48,.38],[-.48,.38],[0,.7]]){p.moveTo(0,.28);p.lineTo(x,y);}return p;})();
  const LEAF_COLS=[[200,52,34],[224,110,40],[234,172,58],[168,34,42],[212,82,36],[190,70,30]];
  function leaf(x,y,size,rot,flip,col,alpha=1){
    c.save();c.translate(x,y);c.rotate(rot);c.scale(size*(Math.abs(flip)<.08?.08*Math.sign(flip||1):flip),size);c.globalAlpha*=alpha;
    c.fillStyle=css(col);c.fill(LEAF);
    if(size>10*u){c.strokeStyle=css(col.map(v=>v*.6),.8);c.lineWidth=.045;c.stroke(VEINS);}
    c.restore();
  }

  const VARIETIES=[
    {base:[244,238,228],patches:[[214,62,38]],fins:[255,250,242]},
    {base:[236,178,58],patches:[],fins:[250,214,120],sheen:1},
    {base:[30,28,32],patches:[[208,58,36],[240,234,224]],fins:[70,66,70]},
    {base:[244,238,228],patches:[[214,62,38]],spots:[24,22,26],fins:[255,250,242]},
    {base:[246,242,236],patches:[],crown:[220,48,40],fins:[255,252,246]},
    {base:[238,120,40],patches:[],fins:[250,170,100],sheen:1},
    {base:[112,138,162],patches:[],belly:[216,96,52],fins:[170,186,200]},
    {base:[228,230,232],patches:[],fins:[245,246,248],sheen:1},
    {base:[150,104,62],patches:[],fins:[184,138,94]}
  ];
  const KOI=VARIETIES.map((v,i)=>{
    const r=k=>hash(i*13.7+k),patches=[];
    const n=v.patches.length?2+Math.floor(r(30)*3):0;
    for(let k=0;k<n;k++)patches.push({s:.06+k*(.62/n)+r(k+31)*.1,off:(r(k+40)-.5)*.9,l:.07+r(k+50)*.08,wd:.75+r(k+60)*.5,col:v.patches[k%v.patches.length]});
    if(v.spots)for(let k=0;k<5;k++)patches.push({s:.15+r(k+70)*.5,off:(r(k+80)-.5)*1.4,l:.02+r(k+90)*.02,wd:.22+r(k+100)*.18,col:v.spots});
    if(v.crown)patches.push({s:.07,off:0,l:.055,wd:.62,col:v.crown});
    if(v.belly)for(const side of [-1,1])patches.push({s:.34,off:side*.95,l:.24,wd:.42,col:v.belly});
    return {i,v,patches,len:150+r(1)*80,cx:.38+((i*.37+r(2)*.2)%1)*.24,cy:.38+((i*.61+r(3)*.2)%1)*.24,ax:.22+r(4)*.1,bx:.02+r(5)*.04,ay:.22+r(6)*.1,by:.02+r(7)*.04,
      w:(.08+r(8)*.05)*(r(9)<.5?-1:1),p1:r(10)*TAU,p2:r(11)*TAU,p3:r(12)*TAU,p4:r(13)*TAU,zw:.05+r(14)*.06,zp:r(15)*TAU,
      sipP:8+r(16)*9,sipO:r(17)*20,beat:1.1+r(18)*.5};
  });

  function layout(){
    const portrait=w/h<1;
    u=portrait?Math.min(w/760,h/1300):Math.min(h/1080,w/1700);
    L=portrait?{
      pond:[.12,.2,.76,.56],bridge:[[.42,-.04],[1.08,.27]],canopy:[-.1,-.05,.85,.3],
      pads:[[.1,.42,52,1],[.2,.48,40,0],[.08,.52,44,0],[.5,.88,46,1],[.6,.84,34,0]],
      lanterns:[[.14,.9],[.9,.86]],
      banks:[{edge:[[-.02,.74],[.1,.77],[.2,.83],[.28,.9],[.33,1.02]],close:[[-.02,1.02]],inward:[-.6,.8]},
             {edge:[[1.02,.72],[.9,.77],[.82,.84],[.77,.92],[.74,1.02]],close:[[1.02,1.02]],inward:[.6,.8]}]
    }:{
      pond:[.16,.12,.68,.66],bridge:[[.64,-.08],[1.06,.5]],canopy:[-.08,-.1,.52,.6],
      pads:[[.07,.4,60,1],[.14,.48,46,0],[.05,.52,52,0],[.12,.31,38,0],[.5,.9,50,1],[.58,.86,36,0],[.44,.95,40,0]],
      lanterns:[[.13,.84],[.93,.83]],
      banks:[{edge:[[-.02,.58],[.05,.62],[.1,.69],[.15,.73],[.2,.81],[.24,.9],[.27,1.02]],close:[[-.02,1.02]],inward:[-.6,.8]},
             {edge:[[1.02,.62],[.96,.67],[.91,.73],[.88,.82],[.85,.92],[.83,1.02]],close:[[1.02,1.02]],inward:[.6,.8]}]
    };
    L.portrait=portrait;
  }

  // Static layers, rebuilt only on resize.
  function buildFloor(){
    floor=layer();
    into(floor,()=>{
      const g=c.createRadialGradient(w*.55,h*.42,0,w*.55,h*.42,Math.hypot(w,h)*.62);
      g.addColorStop(0,'#1d4f4a');g.addColorStop(.55,'#123634');g.addColorStop(1,'#081c1d');
      c.fillStyle=g;c.fillRect(0,0,w,h);
      for(let i=0;i<520;i++){
        const x=hash(i*1.31)*w,y=hash(i*2.17)*h,r=(3+hash(i*3.7)**2*16)*u,tone=hash(i*4.1);
        c.fillStyle=`rgba(${60+tone*60|0},${70+tone*50|0},${60+tone*30|0},${.07+hash(i*5.3)*.12})`;
        ellipse(x,y,r,r*(.6+hash(i*6.1)*.4),hash(i*7.7)*TAU);c.fill();
      }
      for(let i=0;i<14;i++)soft(hash(i*8.9)*w,hash(i*9.7)*h,(60+hash(i*3.3)*90)*u,(40+hash(i*4.4)*60)*u,[4,16,16],.35);
      c.lineCap='round';
      for(let i=0;i<80;i++){
        const left=i%2,x=left?hash(i*2.3)*.22*w:(.2+hash(i*2.3)*.6)*w,y=left?(.25+hash(i*3.1)*.7)*h:(.84+hash(i*3.1)*.16)*h;
        const len=(60+hash(i*4.7)*90)*u,a=left?-.2+hash(i*5.9)*.6:-Math.PI/2+(hash(i*5.9)-.5)*.8;
        c.strokeStyle=`rgba(${60+hash(i)*30|0},${96+hash(i*1.7)*30|0},${48},${.18+hash(i*6.6)*.14})`;c.lineWidth=(2+hash(i*7.3)*2.5)*u;
        c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+Math.cos(a+.5)*len*.6,y+Math.sin(a+.5)*len*.6,x+Math.cos(a)*len,y+Math.sin(a)*len);c.stroke();
      }
    });
  }
  function stonePath(x,y,r,seed){
    const pts=[];for(let k=0;k<10;k++){const a=k/10*TAU+hash(seed+k)*.3,rr=r*(.8+hash(seed+k*1.7)*.28);pts.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr*.86]);}
    return smooth(pts);
  }
  function stone(s,shadow){
    if(shadow){c.save();c.translate(-s.r*.28,s.r*.34);c.fillStyle='rgba(0,8,8,.4)';c.fill(s.path);c.restore();return;}
    const g=c.createRadialGradient(s.x+s.r*.35,s.y-s.r*.4,0,s.x,s.y,s.r*1.15);
    g.addColorStop(0,'#99958a');g.addColorStop(.55,'#5c5e58');g.addColorStop(1,'#33352f');
    c.fillStyle=g;c.fill(s.path);
    c.save();c.clip(s.path);
    for(let m=0;m<20;m++){const a=hash(s.seed+m*3.1)*TAU,d=hash(s.seed+m*4.3)*s.r;c.fillStyle=`rgba(${70+hash(m)*20|0},${104+hash(m*2)*24|0},50,.5)`;ellipse(s.x-s.r*.25+Math.cos(a)*d*.8,s.y+s.r*.2+Math.sin(a)*d*.6,s.r*(.12+hash(s.seed+m)*.16),s.r*(.08+hash(s.seed+m*2)*.1));c.fill();}
    c.restore();
    c.strokeStyle='rgba(255,250,235,.1)';c.lineWidth=1.5*u;c.stroke(s.path);
  }
  function bridge(shadow){
    const [A,B]=L.bridge.map(([x,y])=>[x*w,y*h]),cx=(A[0]+B[0])/2,cy=(A[1]+B[1])/2,ang=Math.atan2(B[1]-A[1],B[0]-A[0]),len=Math.hypot(B[0]-A[0],B[1]-A[1]),W=118*u;
    c.save();
    if(shadow){c.translate(cx-40*u,cy+52*u);c.rotate(ang);c.fillStyle='rgba(0,10,12,.42)';c.fillRect(-len/2,-W/2-8*u,len,W+16*u);c.restore();return;}
    c.translate(cx,cy);c.rotate(ang);
    c.fillStyle='#2a1810';c.fillRect(-len/2,-W/2-4*u,len,W+8*u);
    for(let x=-len/2,k=0;x<len/2;x+=18*u,k++){const v=hash(k*.37+3);c.fillStyle=`rgb(${110+v*30|0},${66+v*18|0},${42+v*10|0})`;c.fillRect(x+1.5*u,-W/2+8*u,16*u,W-16*u);}
    const g=c.createLinearGradient(-len/2,0,len/2,0);g.addColorStop(0,'rgba(0,0,0,.38)');g.addColorStop(.5,'rgba(255,214,150,.15)');g.addColorStop(1,'rgba(0,0,0,.38)');
    c.fillStyle=g;c.fillRect(-len/2,-W/2,len,W);
    for(const side of [-1,1]){
      const y=side*(W/2-6*u);
      c.fillStyle='#a92b22';c.fillRect(-len/2,y-6*u,len,12*u);
      c.fillStyle='rgba(255,140,110,.35)';c.fillRect(-len/2,y-6*u,len,3*u);
      for(let x=-len/2+30*u;x<len/2;x+=78*u){
        c.fillStyle='#8a2019';c.fillRect(x-9*u,y-9*u,18*u,18*u);
        c.fillStyle='#2c1e18';c.fillRect(x-6*u,y-6*u,12*u,12*u);
        c.fillStyle='rgba(255,220,160,.25)';c.fillRect(x-6*u,y-6*u,12*u,3*u);
      }
    }
    c.restore();
  }
  // Stone lantern (tōrō) seen from above: a hexagonal roof with ridges, moss and a jewel finial.
  function lantern(x,y,bright=1,shadow=true){
    const R=34*u,corners=[0,1,2,3,4,5].map(k=>[Math.cos(.2+k*Math.PI/3)*R,Math.sin(.2+k*Math.PI/3)*R]);
    c.save();c.translate(x,y);
    if(shadow){c.save();c.translate(-16*u,20*u);c.fillStyle='rgba(0,0,0,.38)';ellipse(0,0,R*1.1,R*1.05);c.fill();c.restore();}
    const roof=new Path2D();roof.moveTo(...corners[0]);
    for(let k=0;k<6;k++){const a=corners[k],b=corners[(k+1)%6],m=mid(a,b);roof.quadraticCurveTo(m[0]*.9,m[1]*.9,b[0],b[1]);}
    roof.closePath();
    const g=c.createRadialGradient(R*.35,-R*.35,0,0,0,R*1.1);g.addColorStop(0,css([158*bright,154*bright,144*bright]));g.addColorStop(1,css([62*bright,64*bright,60*bright]));
    c.fillStyle=g;c.fill(roof);
    c.save();c.clip(roof);
    for(let m=0;m<10;m++){const a=hash(x+m*2.3)*TAU,d=(.4+hash(y+m)*.6)*R;c.fillStyle=css([74*bright,104*bright,52*bright],.55);ellipse(Math.cos(a)*d-R*.2,Math.sin(a)*d+R*.2,R*.16,R*.11,a);c.fill();}
    c.restore();
    c.strokeStyle=css([28,28,26],.4);c.lineWidth=1.5*u;c.beginPath();corners.forEach(p=>{c.moveTo(p[0]*.25,p[1]*.25);c.lineTo(p[0]*.96,p[1]*.96);});c.stroke();
    c.strokeStyle=css([200*bright,196*bright,186*bright],.25);c.lineWidth=1.5*u;c.stroke(roof);
    c.fillStyle=css([96*bright,96*bright,92*bright]);ellipse(0,0,13*u,13*u);c.fill();
    c.fillStyle=css([176*bright,172*bright,162*bright]);ellipse(2*u,-2*u,7*u,7*u);c.fill();
    c.restore();
  }
  function buildRim(){
    rim=layer();
    into(rim,()=>{
      bridge(true);
      const stones=[];
      L.banks.forEach((bank,bi)=>{
        const pts=bank.edge.map(([x,y])=>[x*w,y*h]);
        c.lineJoin='round';c.lineCap='round';
        for(const [lw,a] of [[48,.14],[22,.2]]){c.strokeStyle=`rgba(0,8,8,${a})`;c.lineWidth=lw*u;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
        c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));bank.close.forEach(([x,y])=>c.lineTo(x*w,y*h));c.closePath();
        const g=c.createLinearGradient(pts[0][0],pts[0][1],pts[0][0]+bank.inward[0]*400*u,pts[pts.length-1][1]);
        g.addColorStop(0,'#2b4126');g.addColorStop(1,'#18261a');c.fillStyle=g;c.fill();
        c.save();c.clip();
        for(let i=0;i<320;i++){const x=hash(i*3.3+bi)*w,y=(.5+hash(i*4.1+bi)*.5)*h;c.fillStyle=`rgba(${60+hash(i)*50|0},${90+hash(i*2)*50|0},${40},${.2+hash(i*5)*.25})`;ellipse(x,y,(3+hash(i*6)*9)*u,(2+hash(i*7)*6)*u,hash(i*8)*TAU);c.fill();}
        c.strokeStyle='rgba(120,150,70,.35)';c.lineWidth=1.4*u;c.beginPath();
        for(let i=0;i<260;i++){const x=hash(i*9.1+bi)*w,y=(.5+hash(i*7.3+bi)*.5)*h,a=-Math.PI/2+(hash(i*2.9)-.5)*1.2,l=(6+hash(i*1.9)*10)*u;c.moveTo(x,y);c.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);}
        c.stroke();c.restore();
        for(let j=0;j<pts.length-1;j++){
          const [x0,y0]=pts[j],[x1,y1]=pts[j+1],d=Math.hypot(x1-x0,y1-y0),n=Math.max(1,Math.round(d/(62*u)));
          for(let k=0;k<n;k++){
            const seed=bi*100+j*10+k,f=(k+hash(seed)*.6)/n,r=(24+hash(seed*1.3)*30)*u;
            const x=x0+(x1-x0)*f+bank.inward[0]*r*.25,y=y0+(y1-y0)*f+bank.inward[1]*r*.25;
            stones.push({x,y,r,seed,path:stonePath(x,y,r,seed)});
          }
        }
      });
      stones.forEach(s=>stone(s,true));stones.forEach(s=>stone(s,false));
      bridge(false);
      L.lanterns.forEach(([x,y])=>lantern(x*w,y*h));
    });
  }
  const bez=(b,t)=>{const m=1-t;return[0,1].map(k=>m*m*m*b[0][k]+3*m*m*t*b[1][k]+3*m*t*t*b[2][k]+t*t*t*b[3][k]);};
  function buildCanopy(){
    const [fx,fy,fw,fh]=L.canopy,cw=Math.max(1,Math.round(fw*w)),ch=Math.max(1,Math.round(fh*h)),ox=-fx*w,oy=-fy*h;
    const branches=[0,1,2].map(b=>[[ox*.3,oy*.3],[cw*(.3+hash(b*3.1)*.2),ch*(.1+hash(b*4.7)*.3)],[cw*(.5+hash(b*5.3)*.2),ch*(.3+hash(b*6.1)*.35)],[cw*(.72+hash(b*7.9)*.18),ch*(.35+hash(b*8.3)*.45)]]);
    const palette=[[196,58,34],[222,112,42],[176,36,40],[234,160,58]];
    canopyLayers=[0,1].map(j=>{
      const cv=document.createElement('canvas');cv.width=cw;cv.height=ch;
      into(cv,()=>{
        if(!j){c.strokeStyle='#24170f';c.lineCap='round';branches.forEach((b,bi)=>{c.lineWidth=(16-bi*3)*u;c.beginPath();c.moveTo(...b[0]);c.bezierCurveTo(...b[1],...b[2],...b[3]);c.stroke();});}
        const R=58*u;
        for(let m=0;m<(j?18:24);m++){
          const [px,py]=bez(branches[m%3],.25+hash(m*3.3+j*7)*.75);
          const x0=clamp(px,R+30*u,cw-R-30*u),y0=clamp(py,R+30*u,ch-R-30*u);
          for(let l=0;l<14;l++){
            const a=hash(m*11+l*1.3+j*5)*TAU,d=Math.sqrt(hash(m*13+l*2.1+j*3))*R,tone=(j?.62:.34)+hash(m*17+l*.7+j)*.45;
            const col=palette[Math.floor(hash(m*19+l+j)*4)].map(v=>Math.min(255,v*tone+(j?18:0)));
            leaf(x0+Math.cos(a)*d,y0+Math.sin(a)*d,(16+hash(m*23+l)*12)*u,hash(m*29+l)*TAU,1,col);
          }
        }
      });
      const sh=document.createElement('canvas');sh.width=cw;sh.height=ch;
      const sc=sh.getContext('2d');sc.drawImage(cv,0,0);sc.globalCompositeOperation='source-in';sc.fillStyle='rgb(0,10,8)';sc.fillRect(0,0,cw,ch);
      return {cv,sh};
    });
  }
  function canopy(shadow){
    const x=L.canopy[0]*w,y=L.canopy[1]*h;
    canopyLayers.forEach(({cv,sh},j)=>{
      const a=Math.sin(time*(.45+j*.17)+j)*(.01+j*.006)+Math.sin(time*1.3+j)*.002;
      c.save();c.translate(x+(shadow?-46*u:0),y+(shadow?86*u:0));c.rotate(a);
      if(shadow){c.globalAlpha=.28;c.drawImage(sh,0,0);}else c.drawImage(cv,0,0);
      c.restore();
    });
  }

  // Koi: each swims a slow Lissajous loop; its body follows the path it has just travelled.
  function pos(k,t){
    const a=k.w*t,[px,py,pw,ph]=L.pond;
    return [w*(px+pw*(k.cx+k.ax*Math.sin(a+k.p1)+k.bx*Math.sin(a*2.13+k.p2))),h*(py+ph*(k.cy+k.ay*Math.sin(a*1.37+k.p3)+k.by*Math.cos(a*.71+k.p4)))];
  }
  function spine(k,t,len){
    const head=pos(k,t),back=pos(k,t-.2),v=Math.hypot(head[0]-back[0],head[1]-back[1])/.2;
    const dt=clamp(len/Math.max(v,1)/36,.01,.5),pts=[head],lens=[0];let acc=0,prev=head;
    for(let j=1;j<90&&acc<len;j++){const p=pos(k,t-j*dt);acc+=Math.hypot(p[0]-prev[0],p[1]-prev[1]);pts.push(p);lens.push(acc);prev=p;}
    const N=14,out=[],total=Math.min(len,acc);let j=0;
    for(let n=0;n<N;n++){
      const s=n/(N-1)*total;while(j<lens.length-2&&lens[j+1]<s)j++;
      const a=pts[j],b=pts[Math.min(j+1,pts.length-1)],f=clamp((s-lens[j])/Math.max(1e-6,(lens[j+1]??lens[j])-lens[j]),0,1);
      out.push([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]);
    }
    return out;
  }
  function sip(k,t){
    const e0=Math.floor((t+k.sipO)/k.sipP),events=[];
    for(const e of [e0-1,e0,e0+1]){if(hash(e*7.31+k.i*3.3)<.3)continue;events.push(e*k.sipP-k.sipO+k.sipP*.5);}
    return events;
  }
  const prof=s=>s<.22?.6+.4*Math.sin(s/.22*Math.PI/2):.1+.9*(1-(s-.22)/.78)**1.1;
  function koiFrames(){
    const frames=[];
    for(let i=0;i<koiCount();i++){
      const k=KOI[i],sips=sip(k,time),bump=Math.max(0,...sips.map(te=>Math.exp(-(((time-te)/1.6)**2))));
      const z=(.5+.5*Math.sin(time*k.zw+k.zp))*(1-bump),len=k.len*u*(L.portrait?.85:1)*(1-z*.14);
      const p=spine(k,time,len),N=p.length,tn=[],nr=[];
      for(let j=0;j<N;j++){const a=p[Math.max(0,j-1)],b=p[Math.min(N-1,j+1)];let dx=a[0]-b[0],dy=a[1]-b[1];const m=Math.hypot(dx,dy)||1;dx/=m;dy/=m;tn.push([dx,dy]);nr.push([-dy,dx]);}
      const beat=time*TAU*k.beat+k.i;
      const q=p.map((pt,j)=>{const s=j/(N-1),o=len*.055*s**1.7*Math.sin(beat-s*4.2);return[pt[0]+nr[j][0]*o,pt[1]+nr[j][1]*o];});
      const Lp=[],Rp=[];
      for(let j=0;j<N;j++){const hw=len*.12*prof(j/(N-1));Lp.push([q[j][0]+nr[j][0]*hw,q[j][1]+nr[j][1]*hw]);Rp.push([q[j][0]-nr[j][0]*hw,q[j][1]-nr[j][1]*hw]);}
      const hw0=len*.12*prof(0),tip=[q[0][0]+tn[0][0]*hw0*1.3,q[0][1]+tn[0][1]*hw0*1.3];
      frames.push({k,z,len,q,tn,nr,beat,sips,path:smooth([...Lp.reverse(),tip,...Rp])});
    }
    return frames.sort((a,b)=>b.z-a.z);
  }
  function fin(base,dir,lenF,spread,col,alpha){
    const a=Math.atan2(dir[1],dir[0]),P=(ang,r)=>[base[0]+Math.cos(ang)*r,base[1]+Math.sin(ang)*r];
    const t1=P(a-spread,lenF),t2=P(a+spread,lenF*.8),m=P(a+spread*.2,lenF*1.12);
    c.fillStyle=css(col,alpha);c.beginPath();c.moveTo(base[0],base[1]);c.lineTo(t1[0],t1[1]);c.quadraticCurveTo(m[0],m[1],t2[0],t2[1]);c.closePath();c.fill();
    c.strokeStyle=css(col,alpha*.7);c.lineWidth=Math.max(.6,lenF*.02);c.beginPath();
    for(let r=-1;r<=1;r++){const e=P(a+r*spread*.6,lenF*.95);c.moveTo(base[0],base[1]);c.lineTo(e[0],e[1]);}
    c.stroke();
  }
  function drawKoi(f){
    const {k,z,len,q,tn,nr,beat,path}=f,v=k.v,N=q.length,fa=1-z*.55,hwAt=j=>len*.12*prof(j/(N-1));
    c.save();c.globalAlpha=1-z*.3;
    for(const side of [-1,1]){
      for(const [j,lenF,spread,sw0] of [[3,.21,.34,1.05],[8,.1,.3,.95]]){
        const base=[q[j][0]+nr[j][0]*side*hwAt(j)*.75,q[j][1]+nr[j][1]*side*hwAt(j)*.75],sw=sw0+.3*Math.sin(time*2.1+k.i*1.3+side*.8+j);
        fin(base,[-tn[j][0]*Math.cos(sw)+side*nr[j][0]*Math.sin(sw),-tn[j][1]*Math.cos(sw)+side*nr[j][1]*Math.sin(sw)],len*lenF,spread,v.fins,.5*fa);
      }
    }
    const e=q[N-1],ta=Math.atan2(-tn[N-1][1],-tn[N-1][0])+.35*Math.sin(beat-4.6);
    for(const s of [-1,1])fin(e,[Math.cos(ta+s*.36),Math.sin(ta+s*.36)],len*.27,.24,v.fins,.6*fa);
    c.fillStyle=css(v.base);c.fill(path);
    c.save();c.clip(path);
    for(const pa of k.patches){
      const j=Math.round(pa.s*(N-1)),hw=hwAt(j);
      c.fillStyle=css(pa.col);ellipse(q[j][0]+nr[j][0]*pa.off*hw,q[j][1]+nr[j][1]*pa.off*hw,len*pa.l,hw*pa.wd,Math.atan2(tn[j][1],tn[j][0]));c.fill();
    }
    c.lineJoin='round';c.lineCap='round';
    c.strokeStyle='rgba(0,0,0,.22)';c.lineWidth=len*.06;c.stroke(path);
    c.strokeStyle=`rgba(255,250,235,${v.sheen?.32+.14*Math.sin(time*1.4+k.i):.17})`;c.lineWidth=len*.05;
    c.beginPath();q.slice(0,N-3).forEach((p,j)=>j?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();
    if(z>.02){c.fillStyle=`rgba(16,52,52,${z*.55})`;c.fill(path);}
    c.restore();
    c.strokeStyle=css(v.fins,.45*fa);c.lineWidth=len*.016;c.beginPath();
    for(let j=2;j<=8;j++)j>2?c.lineTo(q[j][0],q[j][1]):c.moveTo(q[j][0],q[j][1]);
    c.stroke();
    c.fillStyle='rgba(18,16,18,.85)';
    for(const side of [-1,1]){ellipse(q[0][0]-tn[0][0]*len*.015+nr[0][0]*side*hwAt(0)*.7,q[0][1]-tn[0][1]*len*.015+nr[0][1]*side*hwAt(0)*.7,len*.012,len*.012);c.fill();}
    c.restore();
  }

  // Maple leaves fall towards the water, float, drift and slowly sink, each on its own cycle.
  function leafStates(){
    const n=Math.round(14*leafDensity()),out=[];
    for(let i=0;i<n;i++){
      const P=18+hash(i*5.3+1)*14,lt=time+hash(i*2.9+2)*P,e=Math.floor(lt/P),lc=lt-e*P;
      const r=k=>hash(i*17.1+e*3.71+k),F=4,S=5,D=P-F-S;
      const st={size:(20+r(1)*14)*u,col:LEAF_COLS[Math.floor(r(2)*LEAF_COLS.length)],lx:(.04+r(3)*.92)*w,ly:(.04+r(4)*.92)*h,age:lc-F};
      const rot0=r(5)*TAU;
      if(lc<F){
        const q=lc/F,hgt=1-q;
        Object.assign(st,{mode:'fall',hgt,alpha:Math.min(1,q*3)*(1-hgt*.35),scale:1+hgt*1.3,
          x:st.lx+Math.sin(q*Math.PI*2.4+i)*70*u*hgt-60*u*hgt,y:st.ly-90*u*hgt*hgt,
          rot:rot0-hgt*(r(7)<.5?1:-1)*Math.PI*2.2,flip:Math.cos(hgt*Math.PI*4.5)});
      } else {
        const ft=lc-F,dir=r(10)<.5?1:-1;
        Object.assign(st,{hgt:0,flip:1,x:st.lx+ft*(10+r(8)*8)*u,y:st.ly+ft*(3+r(9)*5)*u*dir,rot:rot0+(r(6)-.5)*.5*ft});
        if(ft<D)Object.assign(st,{mode:'float',alpha:1,sink:0,scale:1});
        else{const s=(ft-D)/S;Object.assign(st,{mode:'sink',alpha:1-s,sink:s,scale:1-s*.15});}
      }
      out.push(st);
    }
    return out;
  }
  function leafShadows(leaves){
    for(const s of leaves){
      const off=s.hgt*90*u+5*u,a=.24*s.alpha*(1-(s.sink||0))*(1-s.hgt*.5);
      leaf(s.x-off*.8,s.y+off,s.size*(1+s.hgt*.4),s.rot,s.flip,[0,12,12],a);
    }
  }
  function drawLeaves(leaves,mode){
    for(const s of leaves){
      if((mode==='fall')!==(s.mode==='fall'))continue;
      const col=s.sink?s.col.map((v,k)=>v+([18,52,52][k]-v)*s.sink*.6):s.col;
      leaf(s.x,s.y,s.size*s.scale,s.rot,s.flip,col,s.alpha);
    }
  }

  function collectRipples(frames,leaves){
    const list=[];
    for(const f of frames)for(const te of f.sips){
      const age=time-te;if(age<0||age>=5)continue;
      const [x,y]=pos(f.k,te);list.push({x,y,age,s:.85,v:50*u,max:5,gap:15*u,splash:f.k.i});
    }
    for(const s of leaves)if(s.age>=0&&s.age<4.5)list.push({x:s.lx,y:s.ly,age:s.age,s:.6,v:45*u,max:4.5,gap:14*u});
    if(on(settings.rain))for(let k=0;k<55;k++){
      const Q=1.5,lt=time+hash(k*1.9)*Q,e=Math.floor(lt/Q);
      list.push({x:hash(k*7.3+e*1.13)*w,y:hash(k*3.1+e*2.71)*h,age:lt-e*Q,s:.55,v:32*u,max:1.5,gap:9*u});
    }
    for(const t of taps){const age=time-t.t;if(age>=0&&age<5)list.push({x:t.x,y:t.y,age,s:1,v:60*u,max:5,gap:16*u});}
    return list;
  }
  function drawRipples(list){
    c.save();
    for(const r of list){
      const f=r.age/r.max;if(f<0||f>=1)continue;
      const fade=(1-f)**2*r.s,R=r.age*r.v;
      for(let k=0;k<3;k++){
        const rr=R-k*r.gap;if(rr<=1)continue;const a=fade*(1-k*.3);
        c.strokeStyle=`rgba(255,236,200,${.42*a})`;c.lineWidth=(1.6-k*.3)*u;ellipse(r.x,r.y,rr,rr*.96);c.stroke();
        c.strokeStyle=`rgba(4,18,20,${.3*a})`;c.lineWidth=2*u;ellipse(r.x,r.y,rr+2.5*u,(rr+2.5*u)*.96);c.stroke();
      }
      if(r.splash!==undefined&&r.age<.6){
        c.fillStyle=`rgba(240,248,245,${.8*(1-r.age/.6)})`;
        for(let d=0;d<7;d++){const a=hash(r.splash*9+d)*TAU,dist=r.age*(50+hash(d*3.3)*40)*u;ellipse(r.x+Math.cos(a)*dist,r.y+Math.sin(a)*dist,2*u,2*u);c.fill();}
      }
    }
    c.restore();
  }
  function caustics(level){
    c.save();c.globalCompositeOperation='screen';
    for(let i=0,n=L.portrait?90:160;i<n;i++){
      const a=Math.max(0,Math.sin(time*(.6+hash(i*5.9)*.9)+i*2.1))**3;if(a<.02)continue;
      const x=hash(i*3.3)*w+Math.sin(time*.23+i)*24*u,y=hash(i*4.7)*h+Math.cos(time*.19+i*1.3)*20*u;
      c.fillStyle=`rgba(255,226,160,${a*.16*level})`;
      ellipse(x,y,(10+hash(i*6.3)*22)*u,(1.6+hash(i*7.1)*2.4)*u,hash(i*8.3)*Math.PI+Math.sin(time*.3+i)*.3);c.fill();
    }
    c.restore();
  }
  function rays(){
    c.save();c.globalCompositeOperation='screen';
    const sx=w*1.12,sy=-h*.25,base=Math.atan2(h*1.3,-w*1.25),R=Math.hypot(w,h)*1.4;
    for(let i=0;i<7;i++){
      const a=base+(i-3)*.085+Math.sin(time*.11+i*1.9)*.025,half=.012+hash(i*3.1)*.018,al=.025+.03*Math.sin(time*.37+i*1.7)**2;
      const g=c.createLinearGradient(sx,sy,sx+Math.cos(a)*R,sy+Math.sin(a)*R);
      g.addColorStop(0,`rgba(255,206,130,${al*1.4})`);g.addColorStop(.45,`rgba(255,196,120,${al})`);g.addColorStop(1,'rgba(255,190,110,0)');
      c.fillStyle=g;c.beginPath();c.moveTo(sx,sy);c.lineTo(sx+Math.cos(a-half)*R,sy+Math.sin(a-half)*R);c.lineTo(sx+Math.cos(a+half)*R,sy+Math.sin(a+half)*R);c.closePath();c.fill();
    }
    c.restore();
  }
  function sheen(dusk){
    c.save();c.globalCompositeOperation='screen';
    soft(w*.86,h*.06,Math.max(w,h)*.75,Math.max(w,h)*.55,dusk?[150,96,170]:[255,170,92],dusk?.12:.22);
    c.lineWidth=2*u;
    for(let i=0;i<60;i++){
      const a=Math.max(0,Math.sin(time*(.7+hash(i*2.3))+i*3.1))**4*.3;if(a<.02)continue;
      const x=(.35+hash(i*9.1)*.7)*w+Math.sin(time*.2+i)*14*u,y=hash(i*3.9)**1.4*.65*h,len=(26+hash(i*4.4)*70)*u;
      c.strokeStyle=css(dusk?[220,190,240]:[255,228,175],a);c.beginPath();c.moveTo(x,y);c.lineTo(x+len,y-len*.18);c.stroke();
    }
    c.restore();
  }
  function lotus(x,y,s,i){
    c.save();c.translate(x,y);c.rotate(i+Math.sin(time*.3+i)*.05);
    for(const [n,len,off,col] of [[8,1,0,[232,150,178]],[8,.78,.39,[244,186,204]],[6,.52,.2,[252,222,230]]]){
      for(let k=0;k<n;k++){
        c.save();c.rotate(off+k*TAU/n);
        const g=c.createLinearGradient(0,0,s*len,0);g.addColorStop(0,css(col.map(v=>Math.min(255,v+20))));g.addColorStop(1,css(col));
        c.fillStyle=g;ellipse(s*len*.55,0,s*len*.5,s*len*.2);c.fill();c.restore();
      }
    }
    c.fillStyle='#f2c94c';ellipse(0,0,s*.18,s*.18);c.fill();
    c.restore();
  }
  function pads(shadow){
    L.pads.forEach(([fx,fy,r0,flower],i)=>{
      const r=r0*u,x=fx*w+Math.sin(time*.27+i*2)*2*u,y=fy*h,rot=i*1.7+Math.sin(time*.35+i)*.06;
      if(shadow){c.fillStyle='rgba(0,12,12,.35)';ellipse(x-8*u,y+10*u,r,r);c.fill();return;}
      c.save();c.translate(x,y);c.rotate(rot);
      const g=c.createRadialGradient(-r*.2,-r*.2,0,0,0,r);g.addColorStop(0,i%3===2?'#8f8a3e':'#6f9a45');g.addColorStop(1,i%3===2?'#6a5a2a':'#3d6a2f');
      c.fillStyle=g;c.beginPath();c.moveTo(0,0);c.arc(0,0,r,.14,TAU-.14);c.closePath();c.fill();
      c.strokeStyle='rgba(28,58,24,.35)';c.lineWidth=1.2*u;c.beginPath();
      for(let k=1;k<9;k++){const a=.14+k*(TAU-.28)/9;c.moveTo(0,0);c.lineTo(Math.cos(a)*r*.92,Math.sin(a)*r*.92);}
      c.stroke();
      c.strokeStyle='rgba(190,215,130,.3)';c.lineWidth=2*u;c.beginPath();c.arc(0,0,r-u,.14,TAU-.14);c.stroke();
      c.restore();
      if(flower)lotus(x+r*.2,y-r*.15,r0*.42*u,i);
    });
  }
  function rainStreaks(){
    c.fillStyle='rgba(60,70,80,.1)';c.fillRect(0,0,w,h);
    c.lineWidth=1.2*u;
    for(let i=0;i<130;i++){
      const Q=.35+hash(i)*.25,lt=time+hash(i*2)*Q,e=Math.floor(lt/Q),p=(lt-e*Q)/Q;
      const dx=hash(i*5.1+e*1.7)*w-w/2,dy=hash(i*6.3+e*2.9)*h-h/2,k=1-p*.25;
      c.strokeStyle=`rgba(200,215,225,${.28*(1-p)})`;c.beginPath();c.moveTo(w/2+dx*k,h/2+dy*k);c.lineTo(w/2+dx*(k+.04),h/2+dy*(k+.04));c.stroke();
    }
  }
  function duskLayer(){
    c.save();
    c.globalCompositeOperation='multiply';c.fillStyle='rgb(92,96,150)';c.fillRect(0,0,w,h);
    c.globalCompositeOperation='screen';
    L.lanterns.forEach(([fx,fy],i)=>{
      const x=fx*w,y=fy*h,fl=.85+.1*Math.sin(time*6.1+i*9)+.05*Math.sin(time*13.7+i);
      soft(x,y,200*u,200*u,[255,160,70],.5*fl);soft(x,y,72*u,72*u,[255,214,150],.6*fl);
    });
    for(let i=0;i<18;i++){
      const x=(hash(i*3.7)*w+Math.sin(time*.31+i)*80*u+w)%w,y=(.3+hash(i*5.1)*.65)*h+Math.cos(time*.27+i*2)*50*u,a=Math.max(0,Math.sin(time*1.7+i*2.3))**2;
      if(a>.02)soft(x,y,16*u,16*u,[220,255,140],.7*a);
    }
    c.globalCompositeOperation='source-over';
    L.lanterns.forEach(([fx,fy])=>lantern(fx*w,fy*h,.45,false));
    c.restore();
  }

  function draw(){
    const dusk=on(settings.dusk);
    c.drawImage(floor,0,0);
    caustics(dusk?.35:1);
    const frames=koiFrames();
    for(const f of frames){const off=(10+(1-f.z)*16)*u;c.save();c.translate(-off*.8,off);c.fillStyle=`rgba(0,10,10,${.28*(1-f.z*.5)})`;c.fill(f.path);c.restore();}
    for(const f of frames)drawKoi(f);
    c.fillStyle='rgba(14,54,54,.12)';c.fillRect(0,0,w,h);
    canopy(true);
    if(on(settings.rays)&&!dusk)rays();
    sheen(dusk);
    const leaves=leafStates();
    leafShadows(leaves);pads(true);
    drawRipples(collectRipples(frames,leaves));
    pads(false);
    drawLeaves(leaves,'water');
    c.drawImage(rim,0,0);
    canopy(false);
    drawLeaves(leaves,'fall');
    if(on(settings.rain))rainStreaks();
    if(dusk)duskLayer();
    c.save();c.globalCompositeOperation='screen';c.fillStyle=dusk?'rgba(40,30,70,.06)':'rgba(255,170,80,.06)';c.fillRect(0,0,w,h);c.restore();
    const v=c.createRadialGradient(w*.5,h*.5,Math.min(w,h)*.3,w*.5,h*.5,Math.max(w,h)*.8);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(8,5,2,.5)');
    c.fillStyle=v;c.fillRect(0,0,w,h);
  }

  const moving=()=>!reduced.matches&&speed()>0;
  let frame=0,last=0,elapsed=0;
  const active=()=>!paused&&!document.hidden&&moving();
  function tick(now){
    if(!active()){stop();return;}
    const dt=last?Math.min(.1,(now-last)/1000):0;last=now;elapsed+=dt;
    if(elapsed+1e-5>=1/clamp(fps,1,60)){time+=elapsed*speed();elapsed=0;draw();}
    frame=requestAnimationFrame(tick);
  }
  function stop(){cancelAnimationFrame(frame);frame=0;last=0;elapsed=0;}
  function start(){stop();if(active())frame=requestAnimationFrame(tick);}
  function resize(){
    const ratio=Math.min(devicePixelRatio||1,1920/Math.max(1,innerWidth),1080/Math.max(1,innerHeight));
    w=canvas.width=Math.max(1,Math.round(innerWidth*ratio));h=canvas.height=Math.max(1,Math.round(innerHeight*ratio));
    layout();buildFloor();buildRim();buildCanopy();draw();
  }
  addEventListener('pointerdown',e=>{
    taps.push({x:e.clientX*w/Math.max(1,innerWidth),y:e.clientY*h/Math.max(1,innerHeight),t:time});
    if(taps.length>8)taps.shift();
    if(!active())draw();
  });
  addEventListener('resize',resize);
  document.addEventListener('visibilitychange',start);
  reduced.addEventListener?.('change',()=>{draw();start();});
  api?.onSettingsChanged(value=>{settings={...settings,...value};draw();start();});
  api?.onPause(()=>{paused=true;stop();});
  api?.onResume(()=>{paused=false;start();});
  api?.onPerformanceChanged(value=>{fps=clamp(Number(value)||30,1,60);start();});
  resize();canvas.dataset.ready='true';start();
})();
