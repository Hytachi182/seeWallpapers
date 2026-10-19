/* Pocket Quest: original code-drawn handheld monster-collecting adventure, no external assets or network requests. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'), main=canvas.getContext('2d',{alpha:false});
  const api=window.seeWallpaper, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const params=new URLSearchParams(location.search), preview=params.has('preview');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), on=v=>v!==false&&v!=='false'&&v!==0;
  const hash=n=>{const k=Math.sin(n*127.1+311.7)*43758.5453;return k-Math.floor(k);};
  const TAU=Math.PI*2, mod=(a,b)=>((a%b)+b)%b, mix=(a,b,t)=>a+(b-a)*t;
  const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
  let settings={speed:1,palette:0,frame:true,grid:true,glow:true,...api?.getSettings?.()};
  const num=(key,fallback,a,b)=>Number.isFinite(Number(settings[key]))?clamp(Number(settings[key]),a,b):fallback;
  const speed=()=>num('speed',1,0,2), paletteIndex=()=>Math.round(num('palette',0,0,3));
  let time=preview?clamp(Number(params.get('preview'))||0,0,86400):0, paused=preview, fps=30;
  let w=1,h=1;
  const css=(a,alpha=1)=>`rgba(${a[0]|0},${a[1]|0},${a[2]|0},${clamp(alpha,0,1).toFixed(3)})`;

  // ---- 160x144 four-shade screen ------------------------------------------------------------
  const PALETTES=[
    [[155,188,15],[139,172,15],[48,98,48],[15,56,15]],
    [[200,210,170],[142,152,112],[78,86,64],[30,32,28]],
    [[214,230,245],[145,178,216],[62,90,148],[16,24,56]],
    [[255,232,160],[236,174,74],[142,72,30],[42,18,10]]
  ];
  const LW=160, LH=144, FB=new Uint8Array(LW*LH);
  const lcd=document.createElement('canvas');lcd.width=LW;lcd.height=LH;
  const lcdCtx=lcd.getContext('2d'), lcdData=lcdCtx.createImageData(LW,LH);
  const px=(x,y,i)=>{x|=0;y|=0;if(x>=0&&x<LW&&y>=0&&y<LH)FB[y*LW+x]=i;};
  const rect=(x,y,rw,rh,i)=>{x|=0;y|=0;rw|=0;rh|=0;for(let yy=Math.max(0,y);yy<Math.min(LH,y+rh);yy++)for(let xx=Math.max(0,x);xx<Math.min(LW,x+rw);xx++)FB[yy*LW+xx]=i;};
  const ell=(cx,cy,rx,ry,i)=>{for(let y=Math.floor(cy-ry);y<=cy+ry;y++)for(let x=Math.floor(cx-rx);x<=cx+rx;x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)px(x,y,i);};
  const box=(x,y,bw,bh)=>{rect(x,y,bw,bh,3);rect(x+2,y+2,bw-4,bh-4,0);rect(x+3,y+3,bw-6,1,2);};
  function present(){
    const pal=PALETTES[paletteIndex()], d=lcdData.data;
    for(let i=0;i<FB.length;i++){const p=pal[FB[i]],o=i*4;d[o]=p[0];d[o+1]=p[1];d[o+2]=p[2];d[o+3]=255;}
    lcdCtx.putImageData(lcdData,0,0);
  }

  // ---- 5x7 pixel font (upper case, digits and a little punctuation) ----------------------------
  const FONT={A:[14,17,17,31,17,17,17],B:[30,17,17,30,17,17,30],C:[14,17,16,16,16,17,14],D:[30,17,17,17,17,17,30],E:[31,16,16,30,16,16,31],F:[31,16,16,30,16,16,16],
    G:[14,17,16,23,17,17,15],H:[17,17,17,31,17,17,17],I:[14,4,4,4,4,4,14],J:[7,2,2,2,2,18,12],K:[17,18,20,24,20,18,17],L:[16,16,16,16,16,16,31],M:[17,27,21,21,17,17,17],
    N:[17,25,21,19,17,17,17],O:[14,17,17,17,17,17,14],P:[30,17,17,30,16,16,16],Q:[14,17,17,17,21,18,13],R:[30,17,17,30,20,18,17],S:[15,16,16,14,1,1,30],T:[31,4,4,4,4,4,4],
    U:[17,17,17,17,17,17,14],V:[17,17,17,17,17,10,4],W:[17,17,17,21,21,27,17],X:[17,17,10,4,10,17,17],Y:[17,17,10,4,4,4,4],Z:[31,1,2,4,8,16,31],
    0:[14,17,19,21,25,17,14],1:[4,12,4,4,4,4,14],2:[14,17,1,2,4,8,31],3:[30,1,1,14,1,1,30],4:[2,6,10,18,31,2,2],5:[31,16,30,1,1,17,14],6:[6,8,16,30,17,17,14],7:[31,1,2,4,8,8,8],
    8:[14,17,17,14,17,17,14],9:[14,17,17,15,1,2,12],'!':[4,4,4,4,4,0,4],'.':[0,0,0,0,0,12,12],',':[0,0,0,0,12,4,8],"'":[4,4,8,0,0,0,0],':':[0,12,12,0,12,12,0],'-':[0,0,0,31,0,0,0],'?':[14,17,1,2,4,0,4],'/':[1,2,2,4,8,8,16]};
  function text(s,x,y,i=3,count=Infinity){
    let n=0;
    for(const ch of s){
      if(n++>=count)break;
      const g=FONT[ch];
      if(g)for(let r=0;r<7;r++)for(let q=0;q<5;q++)if(g[r]&(16>>q))px(x+q,y+r,i);
      x+=6;
    }
  }
  const cursor=(x,y)=>{for(let k=0;k<4;k++)rect(x+k,y+k,1,7-k*2,3);};

  // ---- sprites -------------------------------------------------------------------------------
  const N=20;
  function monster(seed,front){
    const a=new Uint8Array(N*N).fill(255), r=k=>hash(seed*13.7+k*3.1);
    const cy=11+Math.round(r(1)*2), rx=6.2+r(2)*2.6, ry=5.2+r(3)*2.4, ears=r(4)>.35?3+Math.round(r(5)*3):0, feet=r(6)>.25, crest=r(7)>.55;
    const put=(x,y)=>{if(x>=0&&x<10&&y>=0&&y<N)a[y*N+x]=1;};
    for(let y=0;y<N;y++)for(let x=0;x<10;x++)if(((x-9.5)/rx)**2+((y-cy)/ry)**2<=1)put(x,y);
    const top=cy-ry, ex=9.5-rx*.62;
    for(let y=Math.floor(top-ears);y<=top+1;y++){const half=(y-(top-ears))*.45+.4;for(let x=0;x<10;x++)if(Math.abs(x-ex)<=half)put(x,y);}
    if(feet)for(let x=0;x<10;x++)if(Math.abs(x-(9.5-rx*.5))<=1.4)for(let y=Math.floor(cy+ry-1);y<=cy+ry+1;y++)put(x,y);
    if(crest)for(let y=Math.floor(top-3);y<=top+1;y++)for(let x=8;x<10;x++)put(x,y);
    for(let y=0;y<N;y++)for(let x=0;x<10;x++)a[y*N+(N-1-x)]=a[y*N+x];
    const out=a.slice(), at=(x,y)=>x<0||y<0||x>=N||y>=N?255:a[y*N+x];
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      if(a[y*N+x]===255)continue;
      if(at(x-1,y)===255||at(x+1,y)===255||at(x,y-1)===255||at(x,y+1)===255){out[y*N+x]=3;continue;}
      let v=front?1:2;
      if(y>cy+ry*.5)v=2;
      const bx=(x-9.5)/(rx*.5), by=(y-(cy+ry*.3))/(ry*.55);
      if(front&&bx*bx+by*by<=1)v=0;
      if(hash(seed*5.3+x*1.7+y*9.1)>.94&&x<N/2)v=front?2:1;
      if(!front&&x+y<cy+4&&hash(x+y*3+seed)>.6)v=1;
      out[y*N+x]=v;
    }
    for(let x=0;x<N;x++)for(let y=1;y<N;y++){const m=hash(seed*5.3+(N-1-x)*1.7+y*9.1)>.94&&(N-1-x)<N/2;if(m&&out[y*N+x]!==3&&out[y*N+x]!==255)out[y*N+x]=front?2:1;}
    if(front){
      const ey=Math.round(cy-1), exl=Math.round(9.5-rx*.42);
      for(const ex2 of [exl,N-1-exl])for(let k=0;k<2;k++){out[(ey+k)*N+ex2]=3;}
      out[(ey)*N+exl+1]=0;out[ey*N+N-1-exl-1]=0;
      out[Math.round(cy+2)*N+9]=3;out[Math.round(cy+2)*N+10]=3;
    }
    return out;
  }
  // Draws an N x N sprite scaled with nearest sampling, anchored bottom-centre; vs squashes it vertically.
  function sprite(arr,cx,by,scale,vs=1,hflip=false){
    const dw=Math.max(0,Math.round(N*scale)), dh=Math.max(0,Math.round(N*scale*vs));
    for(let dy=0;dy<dh;dy++){
      const sy=Math.min(N-1,Math.floor(dy/(scale*vs)));
      for(let dx=0;dx<dw;dx++){
        let sx=Math.min(N-1,Math.floor(dx/scale));if(hflip)sx=N-1-sx;
        const v=arr[sy*N+sx];if(v!==255)px(cx-dw/2+dx,by-dh+dy,v);
      }
    }
  }
  const MONS=[{name:'FUZZLE',lv:5,seed:23},{name:'GLIMMIT',lv:6,seed:37}], HERO_MON={name:'EMBRA',lv:7,seed:11};
  const SPR={};
  const sprites=()=>{if(SPR.ready)return;SPR.ready=true;SPR.back=monster(HERO_MON.seed,false);SPR.front=MONS.map(m=>monster(m.seed,true));};
  function hero(x,y,dir,step){
    const legA=step?3:2, legB=step?2:3;
    if(dir==='D'||dir==='U'){
      const back=dir==='U';
      rect(x+5,y+1,6,3,3);rect(x+4,y+3,8,2,3);
      rect(x+4,y+5,8,3,back?3:0);
      if(!back){rect(x+4,y+5,1,3,3);rect(x+11,y+5,1,3,3);px(x+6,y+6,3);px(x+9,y+6,3);rect(x+5,y+8,6,1,1);}
      rect(x+4,y+8,8,5,2);rect(x+4,y+10,8,1,1);
      if(back)rect(x+6,y+9,4,3,3);
      rect(x+3,y+9,1,3,3);rect(x+12,y+9,1,3,3);
      rect(x+5,y+13,2,legA,3);rect(x+9,y+13,2,legB,3);
    }else{
      rect(x+5,y+1,6,3,3);rect(dir==='L'?x+3:x+11,y+3,2,1,3);rect(x+5,y+3,6,2,3);
      rect(x+5,y+5,6,3,0);rect(x+5,y+5,6,1,3);px(dir==='L'?x+6:x+9,y+6,3);
      rect(x+5,y+8,6,5,2);rect(x+5,y+10,6,1,1);rect(dir==='L'?x+10:x+5,y+9,1,3,3);
      rect(x+5+(step?1:0),y+13,2,3,3);rect(x+9-(step?1:0),y+13,2,3,3);
    }
  }
  function ball(cx,cy){
    for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){
      const d=dx*dx+dy*dy;if(d>18)continue;
      px(cx+dx,cy+dy,d>=13?3:dy===0?3:dy<0?2:0);
    }
    px(cx,cy,0);px(cx-1,cy,0);px(cx+1,cy,0);
  }

  // ---- overworld -------------------------------------------------------------------------------
  const MW=24, MH=20, map=Array.from({length:MH},()=>Array(MW).fill('.'));
  const fill=(ch,x0,y0,x1,y1)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)map[y][x]=ch;};
  fill('T',0,0,23,0);fill('T',0,19,23,19);fill('T',0,0,0,19);fill('T',23,0,23,19);
  fill('T',9,1,11,2);fill('T',13,2,14,3);fill('T',16,1,17,2);fill('T',20,11,22,15);fill('T',10,14,12,17);fill('T',2,9,4,10);fill('T',5,1,6,1);fill('T',1,17,1,18);
  fill('"',6,7,11,11);fill('"',13,9,19,14);
  fill('~',2,14,7,17);for(const [x,y] of [[2,14],[7,14],[2,17],[7,17]])map[y][x]='.';
  fill('#',1,12,8,12);fill('#',17,5,17,5);
  fill('R',2,2,5,3);map[4][2]='W';map[4][3]='D';map[4][4]='H';map[4][5]='W';
  fill('R',19,2,22,3);map[4][19]='W';map[4][20]='H';map[4][21]='D';map[4][22]='W';
  fill('=',3,5,3,6);fill('=',3,6,21,6);fill('=',21,5,21,6);
  for(const [x,y] of [[7,2],[8,4],[12,5],[13,7],[18,8],[2,12],[10,12],[20,9],[5,5],[15,16],[13,18],[19,18],[9,10],[22,7]])if(map[y][x]==='.')map[y][x]='f';
  function tile(ch,x,y,tx,ty,t){
    const hv=hash(x*3.1+y*7.7+tx*13.3+ty*29.9), grass=hv>.93?0:hv<.03?2:1;
    switch(ch){
      case '.':return grass;
      case 'f':{const ox=5+(tx*7+ty*3)%5, dx=x-ox, dy=y-8-(tx+ty)%3;if(dx===0&&dy===0)return 2;if(Math.abs(dx)+Math.abs(dy)===1)return 0;return grass;}
      case '=':return hv>.93?1:0;
      case '"':{const u=(x+((y>>2)&1)*2)&3, v=y&3;if(u===1&&v<3)return 3;if(u===3&&v>0&&v<3)return 2;if(v===3&&(u===0||u===2))return 2;return 1;}
      case 'T':{const dx=x-7.5,dy=y-6.5,d=dx*dx+dy*dy;
        if(d<=49){if(d>36)return 3;if(d<14&&dx<1&&dy<1)return 1;return ((x+y)&1)&&dx+dy>2?3:2;}
        if(x>=6&&x<=9&&y>=11)return 3;return grass;}
      case '~':{const wave=(y+((x>>3)&1)*2+((t*2)|0))%8===0&&(x&7)<5;return wave?1:((y*3+x*5+((t*3)|0))%29===0?0:2);}
      case 'R':{if(y===15||y===0)return 3;const band=y&3;return band===3?2:(((x+((y>>2)&1)*4)&7)===0?2:3);}
      case 'H':case 'W':case 'D':{
        const wall=(y&3)===3?1:((((x+((y>>2)&1)*4)&7)===0)?1:0);
        if(ch==='W'&&x>=3&&x<=12&&y>=3&&y<=11){const edge=x===3||x===12||y===3||y===11;return edge?3:(x===7||x===8||y===7?3:1);}
        if(ch==='D'&&x>=3&&x<=12&&y>=2){const edge=x===3||x===12||y===2;if(edge)return 3;if(x===10&&y===10)return 0;return 2;}
        return y===15?2:wall;}
      case '#':{const post=(x>=1&&x<=2||x>=9&&x<=10)&&y>=4&&y<=14, rail=(y>=6&&y<=7)||(y>=10&&y<=11);return post?3:rail?2:grass;}
    }
    return 1;
  }

  const STEP=.38;
  const SEGS=[];let TOTAL=0;
  const DIRS={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
  function add(o){o.t0=TOTAL;TOTAL+=o.dur;SEGS.push(o);return o;}
  function walk(from,moves,extra={}){
    const pts=[from.slice()];for(const m of moves){const p=pts[pts.length-1];pts.push([p[0]+DIRS[m][0],p[1]+DIRS[m][1]]);}
    add({type:'walk',moves,pts,dur:moves.length*STEP,...extra});return pts[pts.length-1];
  }
  const BEND=24.6, BEND2=27.6, TRANS=2.2;
  {
    let at=[3,5];
    add({type:'idle',at,dur:1.2});
    at=walk(at,'DRRRRRDDD');
    add({type:'battle',at,face:'D',mon:0,kind:0,dur:TRANS+BEND});
    at=walk(at,'UUURRRRRRRDDDDDD',{afterBattle:true});
    add({type:'battle',at,face:'D',mon:1,kind:1,dur:TRANS+BEND2});
    at=walk(at,'UUUUUURRRRRRUU',{afterBattle:true});
    add({type:'exit',at,dur:2.2});
  }

  function heroPose(s,e){
    if(s.type!=='walk')return {x:s.at[0],y:s.at[1],dir:s.face||'D',step:0};
    const n=s.moves.length, k=Math.min(n,Math.floor(e/STEP)), f=k<n?e/STEP-k:0, a=s.pts[k], b=s.pts[Math.min(n,k+1)];
    return {x:mix(a[0],b[0],f),y:mix(a[1],b[1],f),dir:s.moves[Math.min(n-1,k)],step:k<n&&(Math.floor(e/STEP*2)&1)===1};
  }
  function overworld(s,e,t){
    const p=heroPose(s,e);
    const cx=clamp(Math.round(p.x*16+8-LW/2),0,MW*16-LW), cy=clamp(Math.round(p.y*16+8-LH/2),0,MH*16-LH);
    for(let sy=0;sy<LH;sy++){
      const wy=cy+sy, ty=wy>>4, row=map[ty];
      for(let sx=0;sx<LW;sx++){const wx=cx+sx, tx=wx>>4;FB[sy*LW+sx]=tile(row[tx],wx&15,wy&15,tx,ty,t);}
    }
    const hidden=s.type==='exit'&&e>.25;
    if(!hidden)hero(Math.round(p.x*16-cx),Math.round(p.y*16-cy)-3,p.dir,p.step);
    return {p,cx,cy};
  }
  const invert=()=>{for(let i=0;i<FB.length;i++)FB[i]=3-FB[i];};
  function curtain(prog){const hh=Math.round(LH*.5*clamp(prog,0,1));rect(0,0,LW,hh,3);rect(0,LH-hh,LW,hh,3);}

  // ---- battle --------------------------------------------------------------------------------
  function typed(lines,t0,tb,cps=22){
    let left=Math.max(0,Math.floor((tb-t0)*cps));
    lines.forEach((ln,i)=>{text(ln,10,105+i*16,3,left);left-=ln.length;});
  }
  function hpBar(x,y,frac){
    text('HP',x,y-2,3);rect(x+14,y,50,5,3);rect(x+15,y+1,48,3,0);
    const fw=Math.round(48*clamp(frac,0,1));if(fw>0)rect(x+15,y+1,fw,3,frac<.25?2:3);
  }
  function battle(tb,s){
    const E=MONS[s.mon], front=SPR.front[s.mon], back=SPR.back, catching=s.kind===1;
    FB.fill(0);
    ell(116,52,34,5,1);ell(46,94,42,6,1);
    const slide=smooth(tb/1.4);
    // health over time
    let eHP=1,pHP=1;
    eHP-=.45*smooth((tb-10.5)/.7);pHP-=.22*smooth((tb-12.3)/.6);
    eHP-=catching?.4*smooth((tb-17.4)/.7):.55*smooth((tb-17.4)/.7);
    // positions and effects
    const ex=116+(1-slide)*70;let evs=1, eVisible=true, eScale=2, eBy=50;
    const lungeX=-26*Math.sin(clamp((tb-11.8)/.6,0,1)*Math.PI);
    const shake=(tb>12.2&&tb<12.7)?Math.round(Math.sin(tb*60)*3):0;
    if(tb>10.4&&tb<11)eVisible=((tb*14)|0)%2===0;
    if(!catching&&tb>18.2)evs=1-smooth((tb-18.2)/.9);
    if(!catching&&tb>19.1)eVisible=false;
    if(tb>16.9&&tb<17.5)eVisible=eVisible&&((tb*14)|0)%2===0;
    let ballShow=false,bx=0,by=0,wob=0;
    if(catching){
      if(tb>20.9&&tb<21.4){eScale=2*(1-smooth((tb-20.9)/.4));eBy=50-(1-(1-smooth((tb-20.9)/.4)))*20;}
      if(tb>=21.4)eVisible=false;
      if(tb>=20.0){ballShow=true;
        if(tb<20.9){const u=(tb-20)/.9;bx=mix(50,116,u);by=mix(76,30,u)-Math.sin(u*Math.PI)*26;}
        else if(tb<21.4){bx=116;by=30;}
        else if(tb<21.9){bx=116;by=mix(30,47,smooth((tb-21.4)/.5));}
        else{bx=116;by=47;if(tb<24.2){wob=Math.round(Math.sin((tb-21.9)*Math.PI*2.5/.8*1)*2*(1-Math.floor((tb-21.9)/.8)*.25));}}
      }
    }
    // sprites
    if(eVisible&&(!catching||tb<21.4))sprite(front,ex+lungeX,eBy,eScale,evs);
    const pop=smooth((tb-3.8)/.55);
    if(pop>0)sprite(back,46+shake-(1-slide)*0,92,3*pop);
    if(ballShow)ball(bx+wob,by);
    if(catching&&tb>24.2){for(let k=0;k<4;k++){const a=k*TAU/4+tb*2,r=10+Math.sin(tb*6+k)*2;px(116+Math.cos(a)*r,47-3+Math.sin(a)*r,3);px(116+Math.cos(a)*r+1,47-3+Math.sin(a)*r,3);}}
    // attack effects
    if(tb>9.6&&tb<10.6){
      for(let k=0;k<7;k++){
        const u=clamp((tb-9.6)/.8-k*.05,0,1);if(u<=0||u>=1)continue;
        const fx=mix(60,112,u), fy=mix(70,32,u)-Math.sin(u*Math.PI)*10+Math.sin(tb*30+k)*2;
        rect(fx-1,fy-1,4,4,2);rect(fx,fy,2,2,3);
      }
    }
    if(tb>16.6&&tb<17.4&&((tb*20)|0)%2===0){
      let bxp=125,byp=4;
      for(let k=0;k<9;k++){const nx=bxp+((k*37+((tb*20)|0)*11)%9)-4, ny=byp+6;rect(Math.min(bxp,nx),byp,2,6,3);rect(nx,ny-3,2,4,3);bxp=nx;byp=ny;}
    }
    // status boxes
    box(4,6,76,26);text(E.name,10,10,3);text('LV'+E.lv,56,10,3);hpBar(10,22,eHP);
    box(82,62,76,32);text(HERO_MON.name,88,65,3);text('LV'+HERO_MON.lv,128,65,3);hpBar(88,76,pHP);
    const cur=Math.max(0,Math.round(23*pHP));text(String(cur).padStart(2,' ')+'/ 23',112,83,3);
    // bottom panel
    box(0,96,LW,48);
    const menu=(t0,t1)=>tb>=t0&&tb<t1;
    const main=(t0,t1,sel)=>{if(!menu(t0,t1))return false;rect(78,96,82,48,3);rect(80,98,78,44,0);
      text('WHAT WILL',10,105,3);text(HERO_MON.name+' DO?',10,121,3);
      text('FIGHT',96,106,3);text('PETS',126,106,3);text('ITEM',96,124,3);text('RUN',126,124,3);
      const pos=[[88,105],[118,105],[88,123],[118,123]][sel];cursor(pos[0],pos[1]);return true;};
    const moves=(t0,t1,sel)=>{if(!menu(t0,t1))return false;
      text('EMBER',18,104,3);text('SPARK',18,114,3);text('TACKLE',18,124,3);text('-',18,134,3);
      rect(88,96,72,48,3);rect(90,98,68,44,0);text('TYPE/',98,106,3);text(sel===0?'FIRE':sel===1?'VOLT':'NORMAL',98,118,3);text(sel===0?'PP 14/15':sel===1?'PP 9/10':'PP 30/35',98,130,3);
      cursor(9,103+sel*10);return true;};
    const say=(t0,t1,lines)=>{if(!menu(t0,t1))return false;typed(lines,t0,tb);return true;};
    if(tb<1.4)return;
    if(!say(1.4,3.6,['WILD '+E.name,'APPEARED!'])&&!say(3.6,5.2,['GO! '+HERO_MON.name+'!',''])&&
       !main(5.2,7.6,0)&&!moves(7.6,9.0,0)&&
       !say(9.0,11.4,[HERO_MON.name+' USED','EMBER!'])&&!say(11.4,13.4,[E.name+' USED','TACKLE!'])&&
       !main(13.4,14.8,0)&&!moves(14.8,16.0,1)&&!say(16.0,18.0,[HERO_MON.name+' USED','SPARK!'])){
      if(!catching){
        say(19.2,21.4,['WILD '+E.name,'FAINTED!'])||say(21.4,24.2,[HERO_MON.name+' GAINED','48 EXP. POINTS!']);
      }else{
        main(18.0,19.6,2)||say(19.6,21.9,['YOU THREW A','BALL!'])||say(24.4,27.2,['GOTCHA! '+E.name,'WAS CAUGHT!']);
      }
    }
  }

  // ---- console ------------------------------------------------------------------------------
  let layerKey='', layer=null;
  const BW=600, BH=970;
  function rr(g,x,y,rw,rh,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+rw,y,x+rw,y+rh,r);g.arcTo(x+rw,y+rh,x,y+rh,r);g.arcTo(x,y+rh,x,y,r);g.arcTo(x,y,x+rw,y,r);g.closePath();}
  function buildBackdrop(){
    const key=`${w}x${h}|${on(settings.frame)}`;if(key===layerKey)return;layerKey=key;
    layer=document.createElement('canvas');layer.width=w;layer.height=h;
    const g=layer.getContext('2d');
    const bgG=g.createLinearGradient(0,0,0,h);bgG.addColorStop(0,'#232c40');bgG.addColorStop(.6,'#151a28');bgG.addColorStop(1,'#0b0e16');g.fillStyle=bgG;g.fillRect(0,0,w,h);
    // desk surface
    const dg=g.createLinearGradient(0,h*.78,0,h);dg.addColorStop(0,'rgba(60,46,40,0)');dg.addColorStop(1,'rgba(70,52,44,.55)');g.fillStyle=dg;g.fillRect(0,h*.78,w,h*.22);
    if(!on(settings.frame))return;
    const {k,x0,y0}=geom();
    g.save();g.translate(x0,y0);g.scale(k,k);
    g.shadowColor='rgba(0,0,0,.55)';g.shadowBlur=50;g.shadowOffsetY=18;
    const bodyG=g.createLinearGradient(0,0,BW,BH);bodyG.addColorStop(0,'#d9d6c8');bodyG.addColorStop(.5,'#cbc8b9');bodyG.addColorStop(1,'#b5b2a3');
    g.fillStyle=bodyG;g.beginPath();g.moveTo(30,0);g.lineTo(BW-30,0);g.arcTo(BW,0,BW,30,30);g.lineTo(BW,BH-120);g.arcTo(BW,BH,BW-120,BH,120);g.lineTo(30,BH);g.arcTo(0,BH,0,BH-30,30);g.lineTo(0,30);g.arcTo(0,0,30,0,30);g.fill();
    g.shadowColor='transparent';
    g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=3;g.stroke();
    g.fillStyle='rgba(0,0,0,.08)';g.fillRect(8,38,BW-16,4);
    // screen bezel
    g.fillStyle='#5d5b6a';rr(g,40,50,BW-80,392,22);g.fill();
    g.fillStyle='#4a4857';g.beginPath();g.moveTo(40,72);g.arcTo(40,50,62,50,22);g.lineTo(BW-62,50);g.arcTo(BW-40,50,BW-40,72,22);g.lineTo(BW-40,84);g.lineTo(40,84);g.fill();
    g.fillStyle='#26281f';rr(g,112,78,376,340,6);g.fill();
    g.fillStyle='#a9a8b8';g.font='bold 15px Arial, sans-serif';g.textAlign='center';g.fillText('DOT MATRIX WITH STEREO SOUND',BW/2,70);
    g.fillStyle='#3a1114';g.beginPath();g.arc(76,230,8,0,TAU);g.fill();g.fillStyle='#a9a8b8';g.font='bold 12px Arial';g.fillText('BATTERY',76,262);
    // logo
    g.textAlign='left';g.font='italic 900 46px Arial Black, Arial, sans-serif';g.fillStyle='#37337a';g.fillText('POCKET QUEST',44,508);
    g.fillStyle='#8a2a5c';g.fillRect(44,520,330,5);g.fillStyle='#2a6a8a';g.fillRect(44,529,330,5);
    // d-pad
    g.fillStyle='rgba(0,0,0,.18)';rr(g,76,588,148,50,12);g.fill();
    g.fillStyle='#2b2b30';rr(g,86,588,128,46,12);g.fill();rr(g,126,552,46,128,12);g.fill();
    g.fillStyle='#17171a';g.beginPath();g.arc(149,611,15,0,TAU);g.fill();
    // a/b buttons
    for(const [bx,by,l] of [[505,606,'A'],[418,650,'B']]){
      g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.arc(bx+3,by+5,42,0,TAU);g.fill();
      const bg2=g.createRadialGradient(bx-10,by-12,4,bx,by,44);bg2.addColorStop(0,'#c35a8e');bg2.addColorStop(1,'#8c2358');g.fillStyle=bg2;g.beginPath();g.arc(bx,by,41,0,TAU);g.fill();
      g.fillStyle='#37337a';g.font='bold 26px Arial';g.fillText(l,bx+34,by+66);
    }
    // start / select
    for(const [sx,l] of [[212,'SELECT'],[318,'START']]){
      g.save();g.translate(sx,780);g.rotate(-.42);g.fillStyle='#8c8a82';rr(g,0,0,76,22,11);g.fill();g.fillStyle='#37337a';g.font='bold 13px Arial';g.fillText(l,6,44);g.restore();
    }
    // speaker
    g.strokeStyle='#8d8a7f';g.lineWidth=9;g.lineCap='round';
    for(let i=0;i<6;i++){g.beginPath();g.moveTo(414+i*22,912);g.lineTo(472+i*22-30,812+30);g.stroke();}
    g.restore();
  }
  function geom(){
    if(!on(settings.frame)){const sc=Math.min(w/LW,h/LH)*.92;return {k:1,x0:0,y0:0,sc,lx:(w-LW*sc)/2,ly:(h-LH*sc)/2,lw:LW*sc,lh:LH*sc};}
    const Hd=Math.min(h*.95,(w*.96)/(BW/BH)), k=Hd/BH, x0=(w-BW*k)/2, y0=(h-Hd)/2;
    return {k,x0,y0,sc:k*376/LW,lx:x0+112*k,ly:y0+78*k+(340-376*LH/LW)*k/2,lw:376*k,lh:376*LH/LW*k};
  }

  // ---- frame -------------------------------------------------------------------------------
  const input={dir:null,a:false};
  function game(){
    sprites();
    const tm=mod(time,TOTAL);
    let s=SEGS[0];for(const q of SEGS)if(tm>=q.t0)s=q;
    const e=tm-s.t0, t=time;
    input.dir=null;input.a=false;
    if(s.type==='battle'&&e>=TRANS){
      const tb=e-TRANS;battle(tb,s);
      input.a=[[6.9,7.2],[8.6,8.9],[14.4,14.7],[15.6,15.9],[19.1,19.4],[3.2,3.4],[4.9,5.1]].some(([a,b])=>tb>a&&tb<b);
      const endT=s.kind?BEND2:BEND, f=smooth((tb-(endT-.5))/.5);if(f>0)curtain(f);
      const o=smooth(1-tb/.3);if(o>0&&tb<.3)curtain(o);
    }else{
      const r=overworld(s,e,t);
      if(s.type==='walk'||s.type==='exit'){input.dir=s.type==='walk'?r.p.dir:null;}
      if(s.type==='battle'){
        const hx=Math.round(r.p.x*16-r.cx), hy=Math.round(r.p.y*16-r.cy);
        if(e<.7){const bounce=Math.round(Math.abs(Math.sin(e*9))*2);box(hx+3,hy-17-bounce,10,12);text('!',hx+5,hy-15-bounce,3);}
        else if(e<1.7){if(((e-.7)/.12|0)%2===0)invert();}
        else curtain((e-1.7)/.5);
      }
      if(s.type==='walk'&&s.afterBattle&&e<.4)curtain(1-e/.4);
      if(s.type==='idle')curtain(1-e/.9);
      if(s.type==='exit')curtain((e-.4)/1.6);
    }
    present();
  }

  function draw(){
    buildBackdrop();game();
    const g=geom(), d=PALETTES[paletteIndex()];
    main.drawImage(layer,0,0);
    if(on(settings.glow)){
      main.save();main.globalCompositeOperation='lighter';
      const cx=g.lx+g.lw/2, cy=g.ly+g.lh/2, r=Math.max(g.lw,g.lh)*1.15;
      const rg=main.createRadialGradient(cx,cy,0,cx,cy,r);rg.addColorStop(0,css(d[0],.26));rg.addColorStop(.5,css(d[1],.08));rg.addColorStop(1,css(d[1],0));
      main.fillStyle=rg;main.fillRect(cx-r,cy-r,r*2,r*2);main.restore();
    }
    main.imageSmoothingEnabled=false;
    main.drawImage(lcd,g.lx,g.ly,g.lw,g.lh);
    if(on(settings.grid)){
      main.fillStyle='rgba(0,0,0,.14)';
      // a full pixel grid when the screen is large enough, otherwise just every other scanline
      if(g.sc>=2.5)for(let x=1;x<LW;x++)main.fillRect(g.lx+x*g.sc-.5,g.ly,1,g.lh);
      for(let y=1;y<LH;y+=g.sc>=2.5?1:2)main.fillRect(g.lx,g.ly+y*g.sc-.5,g.lw,1);
    }
    const gl=main.createLinearGradient(g.lx,g.ly,g.lx+g.lw,g.ly+g.lh);gl.addColorStop(0,'rgba(255,255,255,.10)');gl.addColorStop(.35,'rgba(255,255,255,0)');gl.addColorStop(1,'rgba(0,0,0,.12)');
    main.fillStyle=gl;main.fillRect(g.lx,g.ly,g.lw,g.lh);
    if(on(settings.frame)){
      const {k,x0,y0}=g;
      // pressed buttons and power light
      main.save();main.translate(x0,y0);main.scale(k,k);
      main.fillStyle='#e0342d';main.beginPath();main.arc(76,230,8,0,TAU);main.fill();
      const lg=main.createRadialGradient(76,230,0,76,230,34);lg.addColorStop(0,'rgba(255,60,50,.45)');lg.addColorStop(1,'rgba(255,60,50,0)');main.fillStyle=lg;main.fillRect(36,190,80,80);
      if(input.dir){
        main.fillStyle='rgba(255,255,255,.28)';const o={U:[126,552,46,50],D:[126,630,46,50],L:[86,588,50,46],R:[164,588,50,46]}[input.dir];rr(main,o[0],o[1],o[2],o[3],10);main.fill();
      }
      if(input.a){main.fillStyle='rgba(0,0,0,.28)';main.beginPath();main.arc(505,606,41,0,TAU);main.fill();}
      main.restore();
    }
    const v=main.createRadialGradient(w*.5,h*.5,Math.min(w,h)*.4,w*.5,h*.5,Math.max(w,h)*.75);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.45)');
    main.fillStyle=v;main.fillRect(0,0,w,h);
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
    layerKey='';draw();
  }
  addEventListener('resize',resize);
  document.addEventListener('visibilitychange',start);
  reduced.addEventListener?.('change',()=>{draw();start();});
  api?.onSettingsChanged(value=>{settings={...settings,...value};draw();start();});
  api?.onPause(()=>{paused=true;stop();});
  api?.onResume(()=>{paused=false;start();});
  api?.onPerformanceChanged(value=>{fps=clamp(Number(value)||30,1,60);start();});
  resize();canvas.dataset.ready='true';start();
})();
