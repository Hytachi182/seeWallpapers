/* Floodlight Derby: original code-drawn night football match, no external assets or network requests. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'), c=canvas.getContext('2d',{alpha:false});
  const api=window.seeWallpaper, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const params=new URLSearchParams(location.search), preview=params.has('preview');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), on=v=>v!==false&&v!=='false'&&v!==0;
  const hash=n=>{const k=Math.sin(n*127.1+311.7)*43758.5453;return k-Math.floor(k);};
  const TAU=Math.PI*2;
  let settings={speed:1,homeColor:'#d7263d',awayColor:'#1e88e5',attack:1,rain:false,snow:false,fans:true,hud:true,...api?.getSettings?.()};
  const num=(key,fallback,a,b)=>Number.isFinite(Number(settings[key]))?clamp(Number(settings[key]),a,b):fallback;
  const speed=()=>num('speed',1,0,2), attack=()=>num('attack',1,0,2);
  let time=preview?clamp(Number(params.get('preview'))||0,0,86400):12, paused=preview, fps=30;
  let w=1,h=1,u=1,V={},cam=52.5,crowd=null,crowdKey='';

  // Pitch in metres: x along the length (0..105), y across (0 = near touchline, 68 = far), z up.
  const FL=105,FW=68,GH=3.66,GZ=2.44,CYCLE=300,MATCH=285,DT=1/30,DIR=[1,-1];
  const TEAMS=['COMETS','TIDES'],SHORT=['COM','TID'];
  const FORMATION=[['gk',.02,.5,1],['def',.2,.15,2],['def',.18,.38,4],['def',.18,.62,5],['def',.2,.85,3],
    ['mid',.45,.12,7],['mid',.42,.38,8],['mid',.42,.62,6],['mid',.45,.88,11],['fwd',.68,.4,9],['fwd',.7,.6,10]];
  const SKIN=[[241,200,170],[224,172,130],[198,140,98],[160,104,70],[120,78,52],[92,60,42]];
  const HAIR=[[30,22,18],[60,40,24],[18,16,16],[120,80,40],[200,160,90],[40,30,26]];
  const LIGHTS=[[-16,-30],[121,-30],[-16,108],[121,108]];
  const STAND={rows:18,y0:74,y1:104,z0:1.2,z1:23};

  function rgb(hex,fallback){const m=/^#?([0-9a-f]{6})$/i.exec(String(hex||'').trim());const n=m?parseInt(m[1],16):fallback;return[n>>16&255,n>>8&255,n&255];}
  const css=(a,al=1)=>`rgba(${a[0]|0},${a[1]|0},${a[2]|0},${al})`;
  const shade=(a,f)=>a.map(v=>clamp(v*f,0,255));
  const kits=()=>{
    const home=rgb(settings.homeColor,0xd7263d),away=rgb(settings.awayColor,0x1e88e5);
    const far=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])>140;
    const gk=(shirt,first)=>[first,[57,181,74],[242,193,78],[40,40,46]].find(col=>far(col,shirt)&&far(col,home)&&far(col,away))||[240,240,240];
    return [{shirt:home,shorts:[240,240,240],socks:home,gk:gk(home,[242,193,78])},{shirt:away,shorts:[26,34,56],socks:[236,236,236],gk:gk(away,[57,181,74])}];
  };
  function ellipse(x,y,rx,ry,rot=0){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rot,0,TAU);}
  function soft(x,y,rx,ry,color,alpha){
    const g=c.createRadialGradient(x,y,0,x,y,rx);g.addColorStop(0,css(color,alpha));g.addColorStop(1,css(color,0));
    c.save();c.translate(x,y);c.scale(1,ry/rx);c.translate(-x,-y);c.fillStyle=g;c.fillRect(x-rx,y-rx,rx*2,rx*2);c.restore();
  }

  // ---------- Match simulation: deterministic per match, replayed from kick-off when needed ----------
  let S=null;
  function rngFor(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
  const fx=(team,v)=>DIR[team]>0?v:FL-v, fy=(team,v)=>DIR[team]>0?v:FW-v;
  const ownGoal=team=>DIR[team]>0?0:FL, oppGoal=team=>FL-ownGoal(team);
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const inBox=(team,x,y)=>Math.abs(x-ownGoal(team))<16.5&&Math.abs(y-FW/2)<20.16;
  function segDist(q,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy||1,t=clamp(((q.x-a.x)*dx+(q.y-a.y)*dy)/l,0,1);return Math.hypot(q.x-a.x-dx*t,q.y-a.y-dy*t);}

  function newMatch(index){
    const rng=rngFor(index*7919+17),players=[];
    for(let team=0;team<2;team++)FORMATION.forEach(([role,hx,hy,n])=>players.push({team,role,hx,hy,num:n,x:0,y:0,vx:0,vy:0,tx:0,ty:0,run:5,
      face:DIR[team],stride:rng()*TAU,cd:0,decide:0,dribble:null,dive:null,cele:false,kickT:-9,headT:-9,seed:rng()*100,
      skin:SKIN[Math.floor(rng()*SKIN.length)],hair:HAIR[Math.floor(rng()*HAIR.length)]}));
    S={index,rng,t:0,state:'kickoff',stateT:0,kickTeam:index%2,score:[0,0],players,poss:0,setPiece:null,
      ball:{x:FL/2,y:FW/2,z:0,vx:0,vy:0,vz:0,spin:0,owner:null,last:index%2,lastPlayer:null,receiver:null,rx:0,ry:0,shot:null},
      ref:{x:FL/2-6,y:FW/2+12,vx:0,vy:0,tx:0,ty:0,run:6,face:1,stride:0,skin:SKIN[2],hair:HAIR[0],kickT:-9,headT:-9},
      camX:FL/2,goalT:-99,goalTeam:0,scorer:null,celeY:0,netT:-99,postT:-99};
    players.forEach(p=>{[p.x,p.y]=kickoffPos(p);});
  }
  function setState(s){S.state=s;S.stateT=0;}
  function kickoffPos(p){
    if(p.team===S.kickTeam&&p.role==='fwd')return[fx(p.team,FL/2-.6),FW/2+(p.hy<.5?-1.2:1.2)];
    return[fx(p.team,Math.max(1,p.hx*.47*FL)),fy(p.team,p.hy*FW)];
  }
  function shape(p){
    const b=S.ball,attacking=S.poss===p.team,bu=DIR[p.team]>0?b.x:FL-b.x;
    const center=attacking?clamp(bu+4,30,80):clamp(bu-12,22,62),span=attacking?52:38;
    let v=center+(p.hx-.45)*span;
    if(p.role==='fwd'&&attacking)v=Math.max(v,Math.min(bu+8,94));
    if(p.role==='def'&&!attacking)v=Math.min(v,Math.max(5,bu-3));
    v=clamp(v+Math.sin(S.t*.6+p.seed)*1.5,3,101);
    const by=DIR[p.team]>0?b.y:FW-b.y;
    let q=p.hy*FW+(by-FW/2)*(attacking?.25:.4);
    q=FW/2+(q-FW/2)*(attacking?1.05:.8)+Math.cos(S.t*.5+p.seed)*1.5;
    p.tx=fx(p.team,v);p.ty=fy(p.team,clamp(q,2,FW-2));
  }
  function gkTarget(p){
    const b=S.ball,g=ownGoal(p.team),d=Math.hypot(b.x-g,b.y-FW/2);
    p.tx=g+DIR[p.team]*clamp(d/18,.8,5);p.ty=clamp(FW/2+(b.y-FW/2)*.35,FW/2-3.4,FW/2+3.4);p.run=4.5;
  }
  function nearest(team,x,y,filter=p=>p.role!=='gk'){
    let best=null,bd=1e9;
    for(const p of S.players){if(p.team!==team||!filter(p))continue;const d=Math.hypot(p.x-x,p.y-y);if(d<bd){bd=d;best=p;}}
    return best;
  }
  function targets(){
    const b=S.ball,st=S.state;
    S.poss=st==='setpiece'?S.setPiece.team:b.owner?b.owner.team:b.last;
    S.players.forEach((p,i)=>{
      p.run=5.2;p.cele=false;
      if(st==='kickoff'){[p.tx,p.ty]=kickoffPos(p);p.run=4.5;}
      else if(st==='fulltime'){p.tx=FL/2+(p.team?1.4:-1.4);p.ty=20+(i%11)*2.6;p.run=1.6;}
      else if(st==='goal'){
        if(p===S.scorer){p.tx=oppGoal(p.team)-DIR[p.team]*1.5;p.ty=S.celeY;p.run=7;p.cele=true;}
        else if(p.team===S.goalTeam&&p.role!=='gk'){p.tx=S.scorer.x-DIR[p.team]*(2+p.hx*3);p.ty=S.scorer.y+(p.hy-.5)*6;p.run=6.5;p.cele=S.stateT>1.2&&p.hx>.3;}
        else{p.role==='gk'?gkTarget(p):shape(p);p.run=2;}
      }
      else p.role==='gk'?gkTarget(p):shape(p);
    });
    if(st==='play'){
      if(b.owner){
        const o=b.owner;
        if(o.dribble){o.tx=o.dribble.x;o.ty=o.dribble.y;o.run=6.3;}else{o.tx=o.x;o.ty=o.y;}
        if(o.role!=='gk'){
          const opp=S.players.filter(q=>q.team!==o.team&&q.role!=='gk').sort((a,c2)=>dist(a,o)-dist(c2,o));
          opp[0].tx=o.x+o.vx*.3;opp[0].ty=o.y+o.vy*.3;opp[0].run=7.4;
          const g=ownGoal(opp[1].team),vx=g-o.x,vy=FW/2-o.y,d=Math.hypot(vx,vy)||1;
          opp[1].tx=o.x+vx/d*5;opp[1].ty=o.y+vy/d*5;opp[1].run=6.5;
        }
      } else {
        for(const team of [0,1]){
          let best=null,bt=1e9,bp=null;
          for(const p of S.players){
            if(p.team!==team)continue;
            const q=intercept(p);if(p.role==='gk'&&!inBox(team,q[0],q[1]))continue;
            if(q[2]<bt){bt=q[2];best=p;bp=q;}
          }
          if(best){best.tx=bp[0];best.ty=bp[1];best.run=7.6;}
        }
        if(b.receiver){const q=intercept(b.receiver);b.receiver.tx=q[0];b.receiver.ty=q[1];b.receiver.run=7;}
      }
    }
    if(st==='setpiece'){
      const sp=S.setPiece;sp.taker.tx=sp.x+sp.ox;sp.taker.ty=sp.y+sp.oy;sp.taker.run=6;
      if(sp.type==='corner'){
        let k=0;const g=oppGoal(sp.team);
        for(const p of S.players)if(p.team===sp.team&&p!==sp.taker&&(p.role==='fwd'||(p.role==='mid'&&p.hy>.3&&p.hy<.7))){p.tx=g-DIR[sp.team]*(6+k*2.5);p.ty=FW/2+(k-1.5)*4;p.run=5;k++;}
      }
    }
  }
  // Where a player running flat out can meet the rolling ball, and how long it takes.
  function intercept(p){
    const b=S.ball;let t=dist(p,b)/7.4,x=b.x,y=b.y;
    for(let i=0;i<3;i++){const f=(1-Math.exp(-.6*t))/.6;x=clamp(b.x+b.vx*f,-1,FL+1);y=clamp(b.y+b.vy*f,-1,FW+1);t=Math.hypot(x-p.x,y-p.y)/7.4+.05;}
    return [x,y,t];
  }
  function move(p){
    if(p.dive){
      const d=p.dive;d.t+=DT;if(d.t<.55)p.y+=clamp(d.y-p.y,-9*DT,9*DT);
      p.vx=p.vy=0;if(d.t>1.4)p.dive=null;return;
    }
    const dx=p.tx-p.x,dy=p.ty-p.y,d=Math.hypot(dx,dy);let ux=0,uy=0;
    if(d>.2){const s=Math.min(p.run,d*1.4);ux=dx/d*s;uy=dy/d*s;}
    const acc=11*DT;p.vx+=clamp(ux-p.vx,-acc,acc);p.vy+=clamp(uy-p.vy,-acc,acc);
    p.x=clamp(p.x+p.vx*DT,-4,FL+4);p.y=clamp(p.y+p.vy*DT,-3,FW+3);
    p.stride+=Math.hypot(p.vx,p.vy)*DT*1.9;
    if(Math.abs(p.vx)>.4)p.face=p.vx>0?1:-1;else if(S.ball)p.face=S.ball.x>=p.x?1:-1;
  }
  function separate(){
    const P=S.players;
    for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){
      const a=P[i],b=P[j],min=a.team===b.team?1.4:.8,dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
      if(d<min&&d>0&&!a.dive&&!b.dive){const k=(min-d)*.5/d;a.x-=dx*k;a.y-=dy*k;b.x+=dx*k;b.y+=dy*k;}
    }
  }
  function kick(o,tx,ty,{loft=false,speed=0}={}){
    const b=S.ball,dx=tx-b.x,dy=ty-b.y,d=Math.hypot(dx,dy)||1;let vh;
    if(loft){vh=clamp(d/1.4,12,24);b.vz=4.9*d/vh;b.z=Math.max(b.z,.02);}else{vh=speed||clamp(.6*d+6,8,26);b.vz=0;}
    b.vx=dx/d*vh;b.vy=dy/d*vh;b.owner=null;b.last=o.team;b.lastPlayer=o;b.rx=tx;b.ry=ty;b.receiver=null;b.shot=null;
    o.cd=.45;o.kickT=S.t;o.dribble=null;
  }
  function shoot(o){
    const rng=S.rng,b=S.ball,gx=oppGoal(o.team),err=(1.25-attack()*.1)*(.6+Math.hypot(gx-b.x,FW/2-b.y)/30);
    const ty=FW/2+(rng()<.5?-1:1)*(1+rng()*2.4)+(rng()-.5)*3*err,tz=clamp(rng()*2.1+(rng()-.5)*.8,.1,3.2);
    const vh=22+rng()*8,T=Math.hypot(gx-b.x,ty-b.y)/vh;
    kick(o,gx,ty,{speed:vh});
    b.vz=clamp((tz-b.z+4.9*T*T)/T,0,9);b.z=Math.max(b.z,.02);b.shot={team:o.team,decided:false,save:null};
  }
  function decide(o){
    const rng=S.rng,a=attack(),dir=DIR[o.team],b=S.ball;
    if(o.role==='gk'){
      const mates=S.players.filter(p=>p.team===o.team&&(p.role==='mid'||p.role==='fwd')),t=mates[Math.floor(rng()*mates.length)];
      kick(o,t.x+dir*4,t.y,{loft:true});b.receiver=t;return;
    }
    const gx=oppGoal(o.team),dg=Math.hypot(gx-o.x,FW/2-o.y),opps=S.players.filter(q=>q.team!==o.team);
    const press=Math.min(...opps.map(q=>dist(q,o))),range=24+a*6;
    if(dg<range&&Math.abs(o.y-FW/2)<22&&rng()<.3+.45*(1-dg/range)+a*.1){shoot(o);return;}
    if(dg<36&&rng()<.07+a*.05){shoot(o);return;}
    let best=null,bs=-1e9;
    for(const t of S.players){
      if(t.team!==o.team||t===o||t.role==='gk')continue;
      const d=dist(o,t);if(d<5||d>36)continue;
      let lane=1e9;for(const q of opps)lane=Math.min(lane,segDist(q,o,t));
      if(lane<1.4)continue;
      const s=(t.x-o.x)*dir*(.7+a*.25)+Math.min(lane,7)*1.6-d*.12+rng()*6;
      if(s>bs){bs=s;best=t;}
    }
    if(best&&(press<4||rng()<.4)){
      const tx=best.x+best.vx*.6,ty=best.y+best.vy*.6,d=Math.hypot(tx-o.x,ty-o.y);
      kick(o,tx,ty,{loft:d>26&&rng()<.6});b.receiver=best;return;
    }
    o.decide=dg<38?.2+rng()*.3:.35+rng()*.5;
    o.dribble={x:clamp(o.x+dir*12,2,FL-2),y:clamp(o.y+(FW/2-o.y)*.3+(rng()-.5)*10,3,FW-3)};
  }
  function ownerStep(){
    const b=S.ball,o=b.owner,sp=Math.hypot(o.vx,o.vy),f=sp>.4?[o.vx/sp,o.vy/sp]:[DIR[o.team],0];
    b.x=o.x+f[0]*.55;b.y=o.y+f[1]*.55;b.z=o.role==='gk'?1.1:0;b.vx=o.vx;b.vy=o.vy;b.vz=0;b.spin+=sp*DT*3;
    if(o.role!=='gk')for(const q of S.players){
      if(q.team===o.team||q.role==='gk'||q.cd>0||dist(q,o)>1.05)continue;
      if(S.rng()<.035*(q.role==='def'?1.4:1)){
        o.cd=.7;o.dribble=null;b.last=q.team;b.lastPlayer=q;
        if(S.rng()<.55){b.owner=q;q.decide=.3+S.rng()*.4;}
        else{const a=S.rng()*TAU;b.owner=null;b.vx=Math.cos(a)*7;b.vy=Math.sin(a)*7;b.vz=1.5;b.z=.05;q.cd=.35;}
        return;
      }
    }
    o.decide-=DT;if(o.decide<=0)decide(o);
  }
  function goal(team){
    const b=S.ball;S.score[team]++;S.goalTeam=team;S.goalT=S.t;b.owner=null;b.shot=null;
    S.scorer=b.lastPlayer&&b.lastPlayer.team===team&&b.lastPlayer.role!=='gk'?b.lastPlayer:nearest(team,b.x,b.y);
    S.celeY=S.scorer.y<FW/2?1.5:FW-1.5;setState('goal');
  }
  function setPiece(type,team,x,y){
    const b=S.ball,taker=type==='goalkick'?S.players.find(p=>p.team===team&&p.role==='gk'):nearest(team,x,y);
    const ox=type==='corner'?(x<1?-.6:.6):type==='goalkick'?-DIR[team]*.8:0,oy=type==='throw'?(y<1?-.6:.6):0;
    S.setPiece={type,team,x,y,ox,oy,taker};b.shot=null;b.receiver=null;b.owner=null;setState('setpiece');
  }
  function executeSetPiece(sp){
    const t=sp.taker,dir=DIR[sp.team],rng=S.rng,b=S.ball;
    if(sp.type==='throw'){
      const best=nearest(sp.team,t.x,t.y,p=>p!==t&&p.role!=='gk');
      kick(t,best.x+best.vx*.5,best.y+best.vy*.5,{loft:true});b.receiver=best;
    } else {
      const tx=sp.type==='corner'?oppGoal(sp.team)-dir*(6+rng()*6):ownGoal(sp.team)+dir*(42+rng()*18);
      const ty=sp.type==='corner'?FW/2+(rng()-.5)*12:10+rng()*48;
      kick(t,tx,ty,{loft:true});b.receiver=nearest(sp.team,tx,ty);
    }
    setState('play');
  }
  function saves(){
    const b=S.ball,sh=b.shot;if(!sh)return;
    const gk=S.players.find(p=>p.team!==sh.team&&p.role==='gk');
    if(!sh.decided){
      if(Math.abs(b.vx)<1){b.shot=null;return;}
      const t=(gk.x-b.x)/b.vx;
      if(t>0&&t<.5){
        sh.decided=true;
        const py=b.y+b.vy*t,pz=b.z+b.vz*t-4.9*t*t,reach=Math.abs(py-gk.y),onTarget=Math.abs(py-FW/2)<GH+.3&&pz<GZ+.3;
        if(reach<3.4&&pz<2.8&&(onTarget||S.rng()<.5)){
          gk.dive={y:clamp(py,FW/2-GH-.6,FW/2+GH+.6),t:0,dir:Math.sign(py-gk.y)||1,low:pz<.8};
          const chance=clamp(.74-reach*.17-(attack()-1)*.12-(Math.hypot(b.vx,b.vy)-22)*.02,.08,.88);
          if(onTarget&&S.rng()<chance)sh.save=S.rng()<.4?'catch':'parry';
        }
      }
      return;
    }
    if(sh.save&&Math.abs(b.x-gk.x)<1.1&&Math.abs(b.y-gk.y)<1.6){
      if(sh.save==='catch'){b.owner=gk;gk.decide=1.6;}
      else{b.vx=-b.vx*.3;b.vy=(S.rng()-.5)*12;b.vz=3+S.rng()*3;b.z=Math.max(b.z,.3);gk.cd=.5;}
      b.last=gk.team;b.lastPlayer=gk;b.shot=null;
    }
  }
  function control(){
    const b=S.ball;
    for(const p of S.players){
      if(p.cd>0||p.dive)continue;
      const gk=p.role==='gk'&&inBox(p.team,b.x,b.y),d=Math.hypot(b.x-p.x,b.y-p.y);
      if(d>(gk?1.3:1.05))continue;
      if(b.z<(gk?2.4:1)){
        if(!gk&&Math.hypot(b.vx,b.vy)>21&&S.rng()<.5){
          b.vx*=-.3;b.vy=b.vy*.3+(S.rng()-.5)*8;b.vz=2;b.z=.1;b.last=p.team;b.lastPlayer=p;p.cd=.4;b.shot=null;return;
        }
        b.owner=p;b.last=p.team;b.lastPlayer=p;b.receiver=null;b.shot=null;p.decide=gk?1.4:.25+S.rng()*.45;p.dribble=null;return;
      }
      if(b.z<2.6&&b.z>1.2){
        p.cd=.6;p.headT=S.t;b.last=p.team;b.lastPlayer=p;b.receiver=null;
        const gx=oppGoal(p.team);
        if(Math.abs(gx-b.x)<14&&Math.abs(b.y-FW/2)<10){
          const ty=FW/2+(S.rng()-.5)*9,dx=gx-b.x,dy=ty-b.y,dd=Math.hypot(dx,dy);
          b.vx=dx/dd*15;b.vy=dy/dd*15;b.vz=1+S.rng()*2;b.shot={team:p.team,decided:false,save:null};
        } else {b.vx=DIR[p.team]*(9+S.rng()*6);b.vy=(S.rng()-.5)*10;b.vz=4+S.rng()*3;b.shot=null;}
        return;
      }
    }
  }
  function ballStep(){
    const b=S.ball,st=S.state;
    if(st==='kickoff'){
      Object.assign(b,{x:FL/2,y:FW/2,z:0,vx:0,vy:0,vz:0,owner:null,shot:null});
      if(S.stateT>(S.t<2?1.5:4.5)){
        const k=S.players.find(p=>p.team===S.kickTeam&&p.role==='fwd'),mids=S.players.filter(p=>p.team===S.kickTeam&&p.role==='mid'&&p.hy>.3&&p.hy<.7);
        const m=mids[Math.floor(S.rng()*mids.length)];kick(k,m.x,m.y);b.receiver=m;setState('play');
      }
      return;
    }
    if(st==='setpiece'&&S.stateT>1.1){
      const sp=S.setPiece;Object.assign(b,{x:sp.x,y:sp.y,z:0,vx:0,vy:0,vz:0,owner:null});
      if(S.stateT>2.4&&Math.hypot(sp.taker.x-sp.x-sp.ox,sp.taker.y-sp.y-sp.oy)<1.2)executeSetPiece(sp);
      return;
    }
    if(b.owner){if(st==='play')ownerStep();return;}
    const px=b.x;
    b.x+=b.vx*DT;b.y+=b.vy*DT;b.z+=b.vz*DT;
    if(b.z>0){b.vz-=9.8*DT;const k=Math.exp(-.06*DT);b.vx*=k;b.vy*=k;}
    if(b.z<=0){b.z=0;if(b.vz<-1.6)b.vz=-b.vz*.45;else{b.vz=0;const k=Math.exp(-.6*DT);b.vx*=k;b.vy*=k;}}
    b.spin+=Math.hypot(b.vx,b.vy)*DT*3;
    if(st==='goal'){
      const g=S.goalTeam===0?FL:0,back=g?FL+1.8:-1.8;
      if(g?b.x>back:b.x<back){b.x=back;b.vx=0;b.vy*=.4;if(S.netT<S.goalT)S.netT=S.t;}
      if(g?b.x>FL:b.x<0)b.y=clamp(b.y,FW/2-GH+.2,FW/2+GH-.2);
      return;
    }
    if(st!=='play')return;
    for(const g of [0,FL]){
      if(!(g?px<=FL&&b.x>FL:px>=0&&b.x<0))continue;
      const off=Math.abs(b.y-FW/2);
      if(off<GH-.12&&b.z<GZ-.1){goal(g===FL?0:1);return;}
      if((Math.abs(off-GH)<.3&&b.z<GZ+.1)||(off<GH&&Math.abs(b.z-GZ)<.22)){
        b.x=g?FL-.15:.15;b.vx*=-.45;b.vy+=(S.rng()-.5)*6;b.vz=Math.abs(b.vz)*.3;S.postT=S.t;b.shot=null;return;
      }
    }
    if(b.y<-.4||b.y>FW+.4){setPiece('throw',1-b.last,clamp(b.x,1,FL-1),b.y<0?0:FW);return;}
    if(b.x<-.4||b.x>FL+.4){
      const g=b.x<0?0:FL,att=g===FL?0:1;
      if(b.last===att)setPiece('goalkick',1-att,g?FL-5.5:5.5,FW/2+(S.rng()-.5)*12);
      else setPiece('corner',att,g?FL-.3:.3,b.y<FW/2?.3:FW-.3);
      return;
    }
    saves();control();
  }
  function step(){
    S.t+=DT;S.stateT+=DT;
    if(S.state!=='fulltime'&&S.t>=MATCH){setState('fulltime');S.ball.owner=null;S.ball.shot=null;}
    if(S.state==='goal'&&S.stateT>6){S.kickTeam=1-S.goalTeam;setState('kickoff');}
    for(const p of S.players)p.cd=Math.max(0,p.cd-DT);
    targets();
    for(const p of S.players)move(p);
    separate();ballStep();
    const b=S.ball,r=S.ref;
    if(S.state==='fulltime'){r.tx=FL/2;r.ty=FW/2-8;r.run=1.5;}
    else{r.tx=clamp(b.x-6,4,FL-4);r.ty=clamp(b.y>FW/2?b.y-11:b.y+11,4,FW-4);r.run=6;}
    move(r);
    const cx=S.state==='goal'?(S.goalTeam===0?FL-14:14):b.x;
    S.camX+=(cx-S.camX)*(1-Math.exp(-1.6*DT));
  }
  function advance(){
    const idx=Math.floor(time/CYCLE),local=time-idx*CYCLE;
    if(!S||S.index!==idx||S.t>local+1e-6)newMatch(idx);
    for(let n=0;S.t+DT<=local+1e-9&&n<12000;n++)step();
  }

  // ---------- Broadcast camera and drawing ----------
  function layout(){
    const portrait=w/h<1;
    u=portrait?Math.min(w/760,h/1300):Math.min(w/1920,h/1080);
    const D=portrait?60:40,H=portrait?40:22,near=portrait?.84:.93,far=portrait?.45:.33;
    const F=(near-far)*h/(H*(1/D-1/(D+FW)));
    V={portrait,D,H,F,hz:near*h-H*F/D};
    const half=(w/2)*(FW/2+D)/F;V.camMin=half-8;V.camMax=FL-half+8;
    if(V.camMin>V.camMax)V.camMin=V.camMax=FL/2;
  }
  const P=(x,y,z=0)=>{const s=V.F/(y+V.D);return[w/2+(x-cam)*s,V.hz+(V.H-z)*s,s];};
  function quad(x0,y0,x1,y1,fill){
    const a=P(x0,y0),b=P(x1,y0),d=P(x1,y1),e=P(x0,y1);
    c.fillStyle=fill;c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.lineTo(d[0],d[1]);c.lineTo(e[0],e[1]);c.closePath();c.fill();
  }
  function line3(a,b){const p=P(...a),q=P(...b);c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(q[0],q[1]);c.stroke();}
  function path(points){c.beginPath();points.forEach(([x,y,z=0],i)=>{const [sx,sy]=P(x,y,z);i?c.lineTo(sx,sy):c.moveTo(sx,sy);});}

  function buildCrowd(){
    const key=`${settings.homeColor}|${settings.awayColor}|${w}x${h}`;if(key===crowdKey)return;crowdKey=key;
    const k=kits(),X0=-40,X1=145,ppm=Math.max(4,Math.ceil(V.F/(V.D+STAND.y0))),tw=Math.min(4096,(X1-X0)*ppm),rh=Math.max(6,Math.round(ppm*1.15));
    crowd=document.createElement('canvas');crowd.width=tw;crowd.height=STAND.rows*rh;
    const g=crowd.getContext('2d'),sx=tw/(X1-X0);
    for(let r=0;r<STAND.rows;r++){
      const y0=r*rh;g.fillStyle=r%2?'#1a1d25':'#15181f';g.fillRect(0,y0,tw,rh);
      for(let x=X0+.3,i=0;x<X1;x+=.62,i++){
        const seed=r*1000+i*7.3,px=(x-X0)*sx+(hash(seed)-.5)*sx*.15;
        if(((x-X0)%18)<1.1){g.fillStyle=r%2?'#2a2e38':'#252933';g.fillRect(px-sx*.31,y0,sx*.62+1,rh);continue;}
        if(hash(seed+1)<.07){g.fillStyle='#22304a';g.fillRect(px-sx*.22,y0+rh*.38,sx*.44,rh*.5);continue;}
        const away=x>-25&&x<14,pick=hash(seed+2),grey=40+hash(seed+3)*70;
        const col=away?(pick<.8?k[1].shirt:[grey,grey,grey+10]):(pick<.6?k[0].shirt:pick<.72?[232,232,232]:[grey,grey,grey+10]);
        g.fillStyle=css(shade(col,.42+hash(seed+4)*.35));g.fillRect(px-sx*.22,y0+rh*.42,sx*.44,rh*.58);
        g.fillStyle=css(shade(SKIN[Math.floor(hash(seed+5)*SKIN.length)],.55));g.beginPath();g.arc(px,y0+rh*.3,Math.max(1,sx*.13),0,TAU);g.fill();
      }
    }
  }
  function sky(){
    const g=c.createLinearGradient(0,0,0,h*.5);g.addColorStop(0,'#04060c');g.addColorStop(1,'#0d1322');
    c.fillStyle=g;c.fillRect(0,0,w,h);
  }
  function stands(excite){
    const rows=STAND.rows,rh=crowd.height/rows;
    const back=P(0,STAND.y1,STAND.z1),roof=P(0,STAND.y1+5,STAND.z1+7);
    c.fillStyle='#0b0e15';c.fillRect(0,roof[1],w,back[1]-roof[1]+2);
    for(let x=-30;x<=135;x+=15){const a=P(x,STAND.y1+5,STAND.z1+7);soft(a[0],a[1]+4*u,26*u,10*u,[255,250,230],.5);}
    for(let r=0;r<rows;r++){
      const f0=1-r/rows,f1=1-(r+1)/rows,yb=STAND.y0+(STAND.y1-STAND.y0)*f0,yf=STAND.y0+(STAND.y1-STAND.y0)*f1;
      const zb=STAND.z0+(STAND.z1-STAND.z0)*f0,zf=STAND.z0+(STAND.z1-STAND.z0)*f1,ym=(yb+yf)/2;
      const top=P(0,yb,zb)[1],bottom=P(0,yf,zf)[1],xl=P(-40,ym)[0],xr=P(145,ym)[0];
      const dy=-Math.abs(Math.sin(time*9+r*1.3))*2.5*u*excite;
      c.drawImage(crowd,0,r*rh,crowd.width,rh,xl,top+dy,xr-xl,bottom-top+1);
    }
    const a=P(0,STAND.y0,STAND.z0),b=P(0,STAND.y0-1.5,0);
    c.fillStyle='#1b1f2a';c.fillRect(0,a[1],w,b[1]-a[1]+1);
    const k=kits(),xs=P(-40,STAND.y0)[0],xm=P(14,STAND.y0)[0];
    c.fillStyle=css(shade(k[1].shirt,.7));c.fillRect(xs,a[1],xm-xs,3*u);
    c.fillStyle=css(shade(k[0].shirt,.7));c.fillRect(xm,a[1],w-xm,3*u);
  }
  function pylons(){
    for(const [lx,ly] of [[-16,108],[121,108]]){
      const base=P(lx,ly,0),head=P(lx,ly,50);if(head[0]<-200*u||head[0]>w+200*u)continue;
      c.strokeStyle='#1a1e28';c.lineWidth=Math.max(2,.8*head[2]);c.beginPath();c.moveTo(base[0],base[1]);c.lineTo(head[0],head[1]);c.stroke();
      const s=head[2],hw=4*s,hh=2.6*s;
      c.fillStyle='#202533';c.fillRect(head[0]-hw,head[1]-hh,hw*2,hh*1.4);
      for(let i=0;i<6;i++)for(let j=0;j<3;j++){c.fillStyle='#fffbe8';ellipse(head[0]-hw+(i+.5)*hw/3,head[1]-hh+(j+.5)*hh*.45,s*.42,s*.3);c.fill();}
      soft(head[0],head[1]-hh*.4,hw*4,hw*3,[255,248,220],.35);
    }
  }
  function beams(){
    c.save();c.globalCompositeOperation='screen';
    for(const [lx,ly] of LIGHTS){
      const head=P(lx,ly,50),aim=P(FL/2+(lx<0?-12:12),FW/2+(ly<0?-6:6)),half=Math.hypot(aim[0]-head[0],aim[1]-head[1])*.32;
      const ang=Math.atan2(aim[1]-head[1],aim[0]-head[0]),nx=-Math.sin(ang),ny=Math.cos(ang);
      const g=c.createLinearGradient(head[0],head[1],aim[0],aim[1]);g.addColorStop(0,'rgba(255,248,225,.1)');g.addColorStop(1,'rgba(255,248,225,0)');
      c.fillStyle=g;c.beginPath();c.moveTo(head[0],head[1]);c.lineTo(aim[0]+nx*half,aim[1]+ny*half);c.lineTo(aim[0]-nx*half,aim[1]-ny*half);c.closePath();c.fill();
    }
    c.restore();
  }
  const WORDS=['SEEWALLPAPER','FLOODLIGHT DERBY','GO COMETS','TIDES TOGETHER','NIGHT LEAGUE','FAIR PLAY'];
  function boards(){
    const y=71.2,n=10,len=111/n,phase=Math.floor(time/7);
    const k=kits(),themes=[[[12,16,30],[255,214,90]],[shade(k[0].shirt,.55),[255,255,255]],[shade(k[1].shirt,.55),[255,255,255]],[[20,24,30],[120,230,255]]];
    for(let i=0;i<n;i++){
      const x0=-3+i*len,a=P(x0,y,0),b=P(x0+len,y,0),top=P(x0,y,1)[1];if(b[0]<0||a[0]>w)continue;
      const [bg,fg]=themes[(i+phase)%themes.length];
      c.fillStyle=css(bg);c.fillRect(a[0],top,b[0]-a[0]+1,a[1]-top);
      const hgt=a[1]-top;c.font=`800 ${Math.max(6,hgt*.58)}px system-ui, sans-serif`;c.textAlign='center';c.textBaseline='middle';
      c.fillStyle=css(fg);c.fillText(WORDS[(i+phase)%WORDS.length],(a[0]+b[0])/2,top+hgt/2+1,(b[0]-a[0])*.88);
    }
  }
  function pitch(snowy){
    const ny=6-V.D;quad(-80,ny,FL+80,FW+3.2,'#163b1d');
    for(let i=0;i<20;i++){const x0=i*FL/20;quad(x0,ny,x0+FL/20,FW+1.5,i%2?'#2a6f34':'#24632e');}
    c.save();c.globalCompositeOperation='screen';
    for(const [x,y] of [[22,18],[83,18],[22,50],[83,50]]){const [sx,sy,s]=P(x,y);soft(sx,sy,34*s,34*s*V.H/(y+V.D),[200,230,170],.08);}
    c.restore();
    if(snowy)quad(-80,ny,FL+80,FW+3.2,'rgba(232,238,245,.42)');
  }
  function lines(){
    c.strokeStyle='rgba(238,244,236,.85)';c.lineWidth=Math.max(1,2*u);c.lineJoin='round';c.lineCap='round';
    const arc=(cx,cy,r,a0,a1)=>{const pts=[];for(let i=0;i<=36;i++){const a=a0+(a1-a0)*i/36;pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}path(pts);c.stroke();};
    const spot=(x,y)=>{const [sx,sy,s]=P(x,y);c.fillStyle='rgba(238,244,236,.9)';ellipse(sx,sy,.22*s,.22*s*V.H/(y+V.D)+.5);c.fill();};
    path([[0,0],[FL,0],[FL,FW],[0,FW],[0,0]]);c.stroke();
    path([[FL/2,0],[FL/2,FW]]);c.stroke();
    arc(FL/2,FW/2,9.15,0,TAU);spot(FL/2,FW/2);
    for(const s of [0,1]){
      const X=x=>s?FL-x:x,A=Math.acos(5.5/9.15);
      path([[X(0),13.84],[X(16.5),13.84],[X(16.5),54.16],[X(0),54.16]]);c.stroke();
      path([[X(0),24.84],[X(5.5),24.84],[X(5.5),43.16],[X(0),43.16]]);c.stroke();
      spot(X(11),FW/2);
      s?arc(FL-11,FW/2,9.15,Math.PI-A,Math.PI+A):arc(11,FW/2,9.15,-A,A);
      s?(arc(FL,0,1,Math.PI/2,Math.PI),arc(FL,FW,1,Math.PI,Math.PI*1.5)):(arc(0,0,1,0,Math.PI/2),arc(0,FW,1,-Math.PI/2,0));
    }
  }
  function goalFrame(side){
    const gx=side?FL:0,back=side?FL+2:-2,y0=FW/2-GH,y1=FW/2+GH,out=side?1:-1;
    const age=S.t-S.netT,bul=S.netT>0&&age>=0&&(S.goalTeam===0)===!!side?.9*Math.exp(-age*1.4):0;
    const bx=i=>back+out*bul*Math.sin(i/12*Math.PI);
    c.strokeStyle='rgba(235,240,245,.26)';c.lineWidth=Math.max(.6,u);
    for(let i=0;i<=12;i++){const y=y0+(y1-y0)*i/12;line3([bx(i),y,0],[bx(i),y,GZ*.85]);line3([bx(i),y,GZ*.85],[gx,y,GZ]);}
    for(let j=0;j<=5;j++){const z=GZ*.85*j/5;path(Array.from({length:13},(_,i)=>[bx(i),y0+(y1-y0)*i/12,z]));c.stroke();}
    for(const y of [y0,y1])for(let j=0;j<=5;j++){const z=GZ*j/5;line3([gx,y,z],[back,y,z*.85]);}
    c.strokeStyle='#f4f6f8';
    for(const y of [y0,y1]){c.lineWidth=Math.max(1.5,.12*P(gx,y)[2]);line3([gx,y,0],[gx,y,GZ]);}
    c.lineWidth=Math.max(1.5,.12*P(gx,FW/2)[2]);line3([gx,y0,GZ],[gx,y1,GZ]);
  }
  function shadows(list){
    for(const e of list){
      const [sx,sy,s]=P(e.x,e.y),flat=V.H/(e.y+V.D);
      c.fillStyle='rgba(0,0,0,.32)';ellipse(sx,sy,.38*s,.38*s*flat+.5);c.fill();
      if(e.isBall)continue;
      for(const [lx,ly] of LIGHTS){
        const dx=e.x-lx,dy=e.y-ly,d=Math.hypot(dx,dy),q=P(e.x+dx/d*1.7,e.y+dy/d*1.7);
        c.fillStyle='rgba(0,0,0,.11)';ellipse((sx+q[0])/2,(sy+q[1])/2,Math.max(Math.hypot(q[0]-sx,q[1]-sy)/2,.2*s),.13*s,Math.atan2(q[1]-sy,q[0]-sx));c.fill();
      }
    }
  }
  function person(p,kit,shirt){
    const [sx,sy,k]=P(p.x,p.y,0);if(sx<-60*u||sx>w+60*u)return;
    const m=v=>v*k,face=p.face||1,sp=Math.hypot(p.vx,p.vy),run=Math.min(1,sp/5),swing=Math.sin(p.stride)*.6*run;
    const kicking=S.t-p.kickT<.28,heading=S.t-p.headT<.4;
    let lift=0,rot=0;
    if(p.dive){
      const t=p.dive.t,a=P(p.x,p.y),b=P(p.x,p.y+p.dive.dir*1.6);
      rot=(b[0]-a[0]>=0?1:-1)*1.25*clamp(t/.35,0,1);
      lift=(p.dive.low?.25:.75)*Math.sin(Math.min(1,t/.6)*Math.PI*.5)*(t<.9?1:Math.max(0,1-(t-.9)*3));
    }
    if(heading)lift=Math.max(lift,.4*Math.sin((S.t-p.headT)/.4*Math.PI));
    c.save();c.translate(sx,sy-m(lift));c.rotate(rot);
    c.lineCap='round';
    const hipY=-m(.95),skin=p.skin;
    for(const i of [0,1]){
      let a=(i?1:-1)*swing;if(kicking&&i)a=1.15;
      const dim=i?1:.78,kx=Math.sin(a)*m(.46)*face,ky=hipY+Math.cos(a)*m(.47),fx2=Math.sin(a)*m(.92)*face,fy2=hipY+Math.cos(a)*m(.93);
      c.lineWidth=m(.15);c.strokeStyle=css(shade(skin,dim));c.beginPath();c.moveTo(0,hipY);c.lineTo(kx,ky);c.stroke();
      c.strokeStyle=css(shade(kit.socks,dim));c.beginPath();c.moveTo(kx,ky);c.lineTo(fx2,fy2);c.stroke();
      c.fillStyle='#101010';ellipse(fx2+face*m(.07),fy2-m(.02),m(.12),m(.055));c.fill();
    }
    c.fillStyle=css(kit.shorts);c.fillRect(-m(.22),hipY-m(.06),m(.44),m(.28));
    c.fillStyle=css(shirt);c.beginPath();c.moveTo(-m(.25),-m(1.5));c.lineTo(m(.25),-m(1.5));c.lineTo(m(.21),hipY-m(.02));c.lineTo(-m(.21),hipY-m(.02));c.closePath();c.fill();
    c.fillStyle=css(shade(shirt,.72));c.fillRect(-face*m(.25)+(face>0?0:-m(.08)),-m(1.5),m(.08),m(.53));
    if(k>22&&p.num){c.fillStyle=shirt[0]+shirt[1]+shirt[2]>520?'#1a1a1a':'#ffffff';c.font=`800 ${m(.25)}px system-ui, sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(p.num,0,-m(1.24));}
    const up=p.cele||(p.dive&&p.dive.t<1);
    for(const i of [0,1]){
      const a=up?Math.PI-(i?.35:-.35)*face:(i?-1:1)*swing*.9,sx2=Math.sin(a)*m(.62)*face,sy2=-m(1.43)+Math.cos(a)*m(.62);
      c.lineWidth=m(.11);c.strokeStyle=css(shade(shirt,i?1:.75));c.beginPath();c.moveTo(0,-m(1.43));c.lineTo(sx2*.45,-m(1.43)+(sy2+m(1.43))*.45);c.stroke();
      c.strokeStyle=css(shade(p.gloves||skin,i?1:.8));c.beginPath();c.moveTo(sx2*.45,-m(1.43)+(sy2+m(1.43))*.45);c.lineTo(sx2,sy2);c.stroke();
    }
    c.fillStyle=css(skin);ellipse(face*m(.02),-m(1.66),m(.12),m(.13));c.fill();
    c.fillStyle=css(p.hair);c.beginPath();c.arc(-face*m(.01),-m(1.68),m(.125),Math.PI*1.02,Math.PI*1.98);c.fill();
    c.restore();
  }
  function ball(b){
    const [sx,sy,s]=P(b.x,b.y,b.z),r=Math.max(2.6*u,.2*s);
    c.fillStyle='#f4f4f0';ellipse(sx,sy-r,r,r);c.fill();
    c.fillStyle='#22252b';
    for(let i=0;i<3;i++){const a=b.spin+i*TAU/3;ellipse(sx+Math.cos(a)*r*.5,sy-r+Math.sin(a)*r*.5,r*.26,r*.26);c.fill();}
    c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=Math.max(.6,r*.12);ellipse(sx,sy-r,r,r);c.stroke();
  }
  function entities(){
    const k=kits(),b=S.ball,list=[...S.players,{...S.ref,isRef:true},{x:b.x,y:b.y-.01,isBall:true}];
    shadows(list);
    list.sort((a,b2)=>b2.y-a.y);
    for(const e of list){
      if(e.isBall)ball(b);
      else if(e.isRef)person(e,{shorts:[18,18,20],socks:[18,18,20]},[24,24,28]);
      else{const kit=k[e.team];e.gloves=e.role==='gk'?[245,245,245]:null;person(e,kit,e.role==='gk'?kit.gk:kit.shirt);}
    }
  }
  function fans(excite){
    if(!on(settings.fans))return;
    const k=kits();
    c.save();c.globalCompositeOperation='screen';
    const n=40+Math.round(excite*120);
    for(let i=0;i<n;i++){
      const slot=Math.floor(time*4+hash(i)*4),x=-40+hash(i*3.1+slot*.37)*185,f=hash(i*5.7+slot*1.3),y=STAND.y0+(STAND.y1-STAND.y0)*f,z=STAND.z0+(STAND.z1-STAND.z0)*f+.6;
      const [sx,sy,s]=P(x,y,z);if(sx<0||sx>w)continue;soft(sx,sy,Math.max(3*u,.5*s),Math.max(3*u,.5*s),[255,255,255],.85);
    }
    if(S.t-S.goalT<10&&S.goalT>0){
      const age=S.t-S.goalT,team=S.goalTeam,xs=team===0?[38,58,80]:[-18,-4,9],col=k[team].shirt;
      for(const [i,x] of xs.entries()){
        const [sx,sy,s]=P(x,STAND.y0+5,STAND.z0+4),fl=.75+.25*Math.sin(time*23+i*3);
        soft(sx,sy,2.6*s,2.6*s,[255,90,60],.8*fl*Math.min(1,(10-age)/2));
        for(let j=0;j<6;j++){const p=((age*.25+j/6)%1),[px,py,ps]=P(x+Math.sin(j*2+age*.3)*3*p,STAND.y0+5+p*8,STAND.z0+5+p*14);soft(px,py,(2+p*6)*ps,(2+p*5)*ps,shade(col,1.1),.18*(1-p)*Math.min(1,(10-age)/2));}
      }
    }
    c.restore();
    for(const [i,x] of [-6,10,30,47,64,82,100].entries()){
      const team=x>-25&&x<14?1:0,[bx,by,s]=P(x,STAND.y0+.4,STAND.z0+.4),top=by-2.6*s,wav=time*4+i*1.7;
      if(bx<-60||bx>w+60)continue;
      c.strokeStyle='#cfd3da';c.lineWidth=Math.max(1,.06*s);c.beginPath();c.moveTo(bx,by);c.lineTo(bx,top);c.stroke();
      c.fillStyle=css(shade(k[team].shirt,.9));c.beginPath();c.moveTo(bx,top);
      for(let j=1;j<=8;j++)c.lineTo(bx+j/8*1.7*s,top+Math.sin(wav-j*.8)*.18*s*j/8);
      for(let j=8;j>=0;j--)c.lineTo(bx+j/8*1.7*s,top+1.05*s+Math.sin(wav-j*.8)*.18*s*j/8);
      c.closePath();c.fill();
      c.fillStyle='rgba(255,255,255,.85)';c.fillRect(bx+.2*s,top+.42*s+Math.sin(wav-2)*.05*s,1.2*s,.2*s);
    }
  }
  function weather(){
    if(on(settings.rain)){
      c.strokeStyle='rgba(200,215,235,.32)';c.lineWidth=Math.max(1,1.2*u);c.beginPath();
      for(let i=0;i<280;i++){const fall=(900+hash(i)*500)*u,len=(16+hash(i*2)*16)*u,y=((hash(i*3)*(h+60*u)+time*fall)%(h+60*u))-30*u,x=(hash(i*4)*w*1.2+time*fall*.12)%(w*1.2)-w*.1;c.moveTo(x,y);c.lineTo(x+len*.12,y+len);}
      c.stroke();c.fillStyle='rgba(30,40,60,.12)';c.fillRect(0,0,w,h);
    }
    if(on(settings.snow)){
      c.fillStyle='rgba(245,248,255,.85)';
      for(let i=0;i<240;i++){const r=(1+hash(i*5)*2.4)*u,fall=(40+hash(i)*60)*u,y=((hash(i*3)*(h+20)+time*fall)%(h+20))-10,x=(hash(i*4)*w+Math.sin(time*.8+i)*20*u+w)%w;ellipse(x,y,r,r);c.fill();}
    }
  }
  function roundRect(x,y,ww,hh,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+ww,y,x+ww,y+hh,r);c.arcTo(x+ww,y+hh,x,y+hh,r);c.arcTo(x,y+hh,x,y,r);c.arcTo(x,y,x+ww,y,r);c.closePath();}
  function hud(){
    if(!on(settings.hud))return;
    const k=kits(),s=u*(V.portrait?1.5:1),x=28*s,y=26*s,H=44*s;
    c.save();c.textBaseline='middle';
    c.fillStyle='rgba(8,10,16,.84)';roundRect(x,y,318*s,H,8*s);c.fill();
    c.fillStyle=css(k[0].shirt);c.fillRect(x+10*s,y+10*s,8*s,H-20*s);
    c.fillStyle=css(k[1].shirt);c.fillRect(x+188*s,y+10*s,8*s,H-20*s);
    c.fillStyle='#eef2f8';c.font=`800 ${18*s}px system-ui, sans-serif`;c.textAlign='left';
    c.fillText(SHORT[0],x+26*s,y+H/2);c.fillText(SHORT[1],x+204*s,y+H/2);
    c.textAlign='center';c.font=`800 ${21*s}px system-ui, sans-serif`;c.fillText(`${S.score[0]} - ${S.score[1]}`,x+130*s,y+H/2+1);
    const minute=Math.min(90,Math.floor(S.t/MATCH*90));
    c.fillStyle='rgba(255,255,255,.12)';roundRect(x+250*s,y+8*s,60*s,H-16*s,5*s);c.fill();
    c.fillStyle='#ffd166';c.font=`800 ${16*s}px system-ui, sans-serif`;c.fillText(S.state==='fulltime'?'FT':`${minute}'`,x+280*s,y+H/2+1);
    const a=attack(),label=a<.67?'DEFENSIVE':a>1.33?'ATTACKING':'BALANCED';
    c.fillStyle='rgba(8,10,16,.7)';roundRect(x,y+H+6*s,200*s,22*s,5*s);c.fill();
    c.fillStyle='#b8c2d4';c.font=`700 ${11*s}px system-ui, sans-serif`;c.textAlign='left';c.fillText(`TACTICS · ${label}`,x+10*s,y+H+17*s);
    c.fillStyle='rgba(255,255,255,.15)';c.fillRect(x+132*s,y+H+14*s,58*s,6*s);c.fillStyle='#ffd166';c.fillRect(x+132*s,y+H+14*s,58*s*a/2,6*s);
    const banner=(text,sub,col,age,dur)=>{
      const slide=Math.min(1,age*4,(dur-age)*4),cx=w/2,cy=(V.portrait?.2:.17)*h,bw=Math.min(w-40*s,520*s);
      c.globalAlpha=clamp(slide,0,1);
      c.fillStyle='rgba(8,10,16,.86)';roundRect(cx-bw/2,cy-34*s,bw,sub?78*s:54*s,10*s);c.fill();
      c.fillStyle=css(col);c.fillRect(cx-bw/2,cy-34*s,bw,5*s);
      c.textAlign='center';c.fillStyle='#ffffff';c.font=`900 ${34*s}px system-ui, sans-serif`;c.fillText(text,cx,cy-4*s,bw-30*s);
      if(sub){c.fillStyle=css(col.map(v=>Math.min(255,v+60)));c.font=`700 ${16*s}px system-ui, sans-serif`;c.fillText(sub,cx,cy+28*s,bw-30*s);}
      c.globalAlpha=1;
    };
    const ga=S.t-S.goalT,pa=S.t-S.postT;
    if(S.state==='fulltime')banner('FULL TIME',`${TEAMS[0]} ${S.score[0]} - ${S.score[1]} ${TEAMS[1]}`,[255,209,102],Math.min(S.stateT,1),99);
    else if(ga>=0&&ga<4.5&&S.scorer)banner('GOAL!',`#${S.scorer.num}  ${TEAMS[S.goalTeam]}`,k[S.goalTeam].shirt,ga,4.5);
    else if(pa>=0&&pa<2.2)banner('OFF THE POST!','',[255,209,102],pa,2.2);
    c.restore();
  }
  function draw(){
    advance();
    cam=clamp(S.camX,V.camMin,V.camMax);
    buildCrowd();
    const ga=S.t-S.goalT,excite=S.goalT>0&&ga>=0&&ga<8?1-ga/8:0;
    sky();stands(excite);pylons();boards();
    pitch(on(settings.snow));lines();
    goalFrame(0);goalFrame(1);
    entities();
    beams();fans(excite);weather();hud();
    const v=c.createRadialGradient(w*.5,h*.55,Math.min(w,h)*.35,w*.5,h*.55,Math.max(w,h)*.8);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.45)');
    c.fillStyle=v;c.fillRect(0,0,w,h);
    canvas.dataset.score=S.score.join('-');canvas.dataset.state=S.state;
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
    layout();draw();
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
