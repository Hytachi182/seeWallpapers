(() => {
  'use strict';
  const canvas=document.querySelector('canvas'),c=canvas.getContext('2d',{alpha:false}),api=window.seeWallpaper;
  let settings={...JSON.parse(document.getElementById('defaults').textContent),...api?.getSettings?.()};
  const STEP=1/240,R=10,G=285,preview=new URLSearchParams(location.search).get('preview'),motion=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),on=v=>v!==false&&v!=='false';
  let seed=97421;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  const walls=[
    [-252,940,-252,170],[-252,170,-224,90],[-224,90,-165,37],[-165,37,-75,14],[-75,14,75,14],
    [75,14,163,37],[163,37,220,87],[220,87,252,145],[252,145,252,942],
    [213,205,213,912],
    [-235,525,-215,660],[-215,660,-153,771],[-153,771,-139,809],
    [196,525,179,660],[179,660,133,770],[133,770,126,805],
    [-233,665,-224,802],[-224,802,-178,865],[197,665,189,802],[189,802,153,865],
    [-208,170,-181,113],[-181,113,-160,99],[133,99,168,122],[168,122,192,171]
  ].map((v,i)=>({ax:v[0],ay:v[1],bx:v[2],by:v[3],radius:4,e:.79,id:i,flash:0}));
  const bumpers=[{x:-78,y:234,r:31},{x:58,y:230,r:31},{x:-10,y:342,r:33}].map(b=>({...b,cool:0,flash:0}));
  const posts=[[-160,150],[143,154],[-115,102],[-30,98],[57,98],[-136,755],[111,755],[-190,606],[163,608],[-110,795],[110,795]].map(([x,y])=>({x,y,r:8}));
  const slings=[[-209,639,-145,701],[-145,701,-194,729],[174,639,111,701],[111,701,163,729]].map(v=>({ax:v[0],ay:v[1],bx:v[2],by:v[3],radius:4,e:1.08,flash:0,cool:0}));
  const targets=[[-198,337,-174,359],[-179,382,-155,404],[-159,427,-135,449],[156,337,179,314],[135,382,158,359],[115,427,138,404]].map(v=>({ax:v[0],ay:v[1],bx:v[2],by:v[3],radius:6,e:.9,flash:0,cool:0,down:false}));
  const flippers=[-1,1].map(side=>({side,x:side*110,y:801,length:88,radius:11,rest:side<0?.27:Math.PI-.27,raised:side<0?-.57:Math.PI+.57,angle:side<0?.27:Math.PI-.27,omega:0,hold:0,cool:0,flash:0}));
  let ball={x:236,y:900,vx:0,vy:0,spin:0},time=0,phase='ready',age=0,ballNumber=1,score=0,high=0,games=1,multiplier=1;
  let bumperHits=0,flipperHits=0,slingHits=0,targetHits=0,launches=0,drains=0,nudges=0,collisions=0,stuck=0,lastContact=0;
  let particles=[],rollovers=[false,false,false],rollFlash=0,bankTimer=0;
  let paused=false,last=0,accumulator=0,fps=30,frame=0,timer=0,w=1200,h=1000,scale=1,ox=0,oy=0;
  function addScore(points){score+=points*multiplier;high=Math.max(high,score);}
  function newGame(){score=0;ballNumber=1;multiplier=1;games++;targets.forEach(t=>t.down=false);rollovers=[false,false,false];prepare();}
  function prepare(){ball={x:236,y:900,vx:0,vy:0,spin:0};phase='ready';age=0;stuck=0;particles=[];flippers.forEach(f=>{f.angle=f.rest;f.hold=0;f.omega=0;});}
  function launch(){ball.vy=-1060-random()*75;ball.vx=-2+random()*4;phase='play';age=0;launches++;}
  function drain(){drains++;phase='drain';age=0;high=Math.max(high,score);}
  function burst(x,y,color){
    for(let i=0;i<8;i++){const a=random()*Math.PI*2;particles.push({x,y,vx:Math.cos(a)*50,vy:Math.sin(a)*50,life:.3,color});}
    particles=particles.slice(-64);
  }
  // Capsule contact: project onto the segment and respond in its local surface frame.
  function segmentContact(s,surfaceVx=0,surfaceVy=0){
    const dx=s.bx-s.ax,dy=s.by-s.ay,len=dx*dx+dy*dy;
    const t=clamp(((ball.x-s.ax)*dx+(ball.y-s.ay)*dy)/Math.max(1,len),0,1),px=s.ax+t*dx,py=s.ay+t*dy;
    let nx=ball.x-px,ny=ball.y-py,d=Math.hypot(nx,ny),reach=R+s.radius;
    if(d>=reach)return null;
    if(d<.001){nx=-dy;ny=dx;d=Math.hypot(nx,ny)||1;}
    nx/=d;ny/=d;ball.x=px+nx*(reach+.02);ball.y=py+ny*(reach+.02);
    const relative=(ball.vx-surfaceVx)*nx+(ball.vy-surfaceVy)*ny;
    if(relative>=0)return null;
    const impulse=-(1+s.e)*relative;ball.vx+=nx*impulse;ball.vy+=ny*impulse;ball.spin+=(ball.vx*ny-ball.vy*nx)*.0003;
    collisions++;lastContact=time;return {nx,ny,px,py,relative};
  }
  function circleContact(o,powered=false){
    let nx=ball.x-o.x,ny=ball.y-o.y,d=Math.hypot(nx,ny),reach=R+o.r;
    if(d>=reach)return false;
    if(d<.001){nx=1;ny=0;d=1;}nx/=d;ny/=d;
    ball.x=o.x+nx*(reach+.02);ball.y=o.y+ny*(reach+.02);
    const velocity=ball.vx*nx+ball.vy*ny;
    if(velocity>=0)return false;
    const impulse=-(1+.86)*velocity+(powered&&o.cool<=0?165:0);ball.vx+=nx*impulse;ball.vy+=ny*impulse;
    collisions++;lastContact=time;
    if(powered&&o.cool<=0){o.cool=.15;o.flash=.22;bumperHits++;addScore(100);burst(o.x,o.y,settings.color);}
    return true;
  }
  function driveFlippers(dt){
    for(const f of flippers){
      f.cool=Math.max(0,f.cool-dt);f.hold=Math.max(0,f.hold-dt);f.flash=Math.max(0,f.flash-dt);
      // React only to descending balls above the bat; anticipation is imperfect.
      const predicted=ball.x+ball.vx*.10,nearSide=f.side<0?predicted<35:predicted>-35;
      if(phase==='play'&&f.cool<=0&&f.hold<=0&&ball.vy>45&&ball.y>699&&ball.y<815&&nearSide&&Math.abs(predicted-f.x)<144){f.hold=.14;f.cool=.28;}
      const previous=f.angle,target=f.hold>0?f.raised:f.rest;
      const delta=target-f.angle;f.angle+=clamp(delta,-15*dt,15*dt);f.omega=(f.angle-previous)/dt;
      if(phase!=='play')continue;
      const bx=f.x+Math.cos(f.angle)*f.length,by=f.y+Math.sin(f.angle)*f.length;
      const dx=bx-f.x,dy=by-f.y,t=clamp(((ball.x-f.x)*dx+(ball.y-f.y)*dy)/(f.length*f.length),0,1);
      const px=f.x+t*dx,py=f.y+t*dy,surfaceVx=-f.omega*(py-f.y),surfaceVy=f.omega*(px-f.x);
      const hit=segmentContact({ax:f.x,ay:f.y,bx,by,radius:f.radius,e:.82},surfaceVx,surfaceVy);
      if(hit){flipperHits++;f.flash=.15;}
    }
  }
  function update(dt){
    time+=dt;age+=dt;rollFlash=Math.max(0,rollFlash-dt);
    for(const obj of [...bumpers,...targets,...walls,...slings]){obj.flash=Math.max(0,obj.flash-dt);if('cool' in obj)obj.cool=Math.max(0,obj.cool-dt);}
    for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}particles=particles.filter(p=>p.life>0);
    if(bankTimer>0){bankTimer-=dt;if(bankTimer<=0)targets.forEach(t=>t.down=false);}
    if(phase==='ready'){driveFlippers(dt);if(age>1.35)launch();return;}
    if(phase==='drain'){driveFlippers(dt);if(age>1.5){if(ballNumber<3){ballNumber++;prepare();}else{phase='over';age=0;}}return;}
    if(phase==='over'){if(age>3)newGame();return;}
    ball.vy+=G*dt;ball.vx*=Math.pow(.986,dt);ball.vy*=Math.pow(.986,dt);ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.spin+=ball.vx*dt/R;
    for(const wall of walls){const hit=segmentContact(wall);if(hit)wall.flash=.10;}
    for(const post of posts)circleContact(post);
    for(const b of bumpers)circleContact(b,true);
    for(const s of slings){const hit=segmentContact(s);if(hit&&s.cool<=0){ball.vx+=hit.nx*90;ball.vy+=hit.ny*90;s.flash=.18;s.cool=.18;slingHits++;addScore(10);}}
    for(const t of targets){if(t.down)continue;const hit=segmentContact(t);if(hit&&t.cool<=0){t.down=true;t.flash=.35;t.cool=.2;targetHits++;addScore(250);}}
    if(targets.every(t=>t.down)&&bankTimer<=0){addScore(2000);multiplier=Math.min(5,multiplier+1);bankTimer=1.8;}
    driveFlippers(dt);
    // Three upper rollover lanes light once per pass; all lanes award a multiplier.
    if(ball.y<125&&ball.y>65&&ball.vy>0&&ball.x>-150&&ball.x<105){
      const index=clamp(Math.floor((ball.x+150)/85),0,2);
      if(!rollovers[index]){rollovers[index]=true;addScore(50);rollFlash=.25;}
      if(rollovers.every(Boolean)){addScore(500);multiplier=Math.min(5,multiplier+1);rollovers=[false,false,false];}
    }
    // A small physical cabinet nudge frees a genuinely resting ball, never relocates it.
    stuck=Math.hypot(ball.vx,ball.vy)<28?stuck+dt:0;
    if(stuck>2.5){ball.vx+=(random()-.5)*100;ball.vy-=65;stuck=0;nudges++;}
    const speed=Math.hypot(ball.vx,ball.vy);if(speed>1450){ball.vx*=1450/speed;ball.vy*=1450/speed;}
    if(ball.y>945||ball.x<-280||ball.x>280)drain();
  }
  // Perspective projection of the physical board, with raised hardware above it.
  function P(x,y,z=0){const depth=.67+y*.00037;return {x:600+x*depth,y:185+y*.65-z*(.75+y*.00012),depth};}
  function path(points,z=0,close=true){c.beginPath();points.forEach(([x,y],i)=>{const p=P(x,y,z);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);});if(close)c.closePath();}
  function boardPoly(points,fill,z=0,stroke=null,width=1){path(points,z);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
  function boardLine(ax,ay,bx,by,color,width=1,z=0){const a=P(ax,ay,z),b=P(bx,by,z);c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
  function ellipse(x,y,rx,ry,fill){c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
  function boardCircle(x,y,r,fill,z=0){const p=P(x,y,z);ellipse(p.x,p.y,r*p.depth,r*.66,fill);}
  function text(value,x,y,size,color,align='center',font="'Segoe UI',sans-serif"){c.font=`600 ${size}px ${font}`;c.textAlign=align;c.fillStyle=color;c.fillText(value,x,y);}
  function roundRect(x,y,width,height,r,fill){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,width,height,r);c.fill();}
  function glow(x,y,r,alpha,color=settings.color,z=0){
    const p=P(x,y,z),g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,r*p.depth);g.addColorStop(0,color);g.addColorStop(1,'#0000');c.save();c.globalCompositeOperation='screen';c.globalAlpha=alpha;c.fillStyle=g;c.fillRect(p.x-r,p.y-r,r*2,r*2);c.restore();
  }
  function insert(x,y,r,label,lit){
    boardCircle(x,y,r+3,'#0a1017');boardCircle(x,y,r,lit&&on(settings.lights)?settings.color:'#725a39');boardCircle(x,y,r-3,lit&&on(settings.lights)?'#fce6ae':'#a18450');
    if(lit&&on(settings.lights))glow(x,y,r*2,.18);
    if(label){const p=P(x,y);text(label,p.x,p.y+3,Math.max(6,r*.6),'#27221d');}
  }
  function rail(s){
    boardLine(s.ax,s.ay,s.bx,s.by,'#0009',10,-4);boardLine(s.ax,s.ay,s.bx,s.by,'#394750',7,8);boardLine(s.ax,s.ay,s.bx,s.by,'#a9b5b7',3,10);boardLine(s.ax,s.ay,s.bx,s.by,'#f7efdb',.9,12);
  }
  function drawBumper(b){
    boardCircle(b.x+4,b.y+9,b.r+8,'#0008');boardCircle(b.x,b.y,b.r+3,'#bcc5bf',3);boardCircle(b.x,b.y,b.r,'#545961',9);
    boardCircle(b.x,b.y,b.r-3,'#b58748',18);boardCircle(b.x,b.y,b.r-4,'#d1b280',27);
    const p=P(b.x,b.y,29),g=c.createLinearGradient(p.x-b.r,p.y-b.r,p.x+b.r,p.y+b.r);g.addColorStop(0,'#fff2c8');g.addColorStop(.45,on(settings.lights)?settings.color:'#b19363');g.addColorStop(1,'#745637');
    ellipse(p.x,p.y,(b.r-5)*p.depth,(b.r-5)*.65,g);ellipse(p.x-4,p.y-4,(b.r-12)*p.depth,2,'#fff0ca88');
    boardCircle(b.x,b.y,9,'#22343b',30);text('100',p.x,p.y+3,8,'#f4ddb7');
    if(on(settings.lights)){glow(b.x,b.y,b.r+20,.08+b.flash*1.6,settings.color,27);if(b.flash>0)boardCircle(b.x,b.y,b.r-7,'#fff2d388',31);}
    // Four screws give the mechanical cap a stable, machined silhouette.
    for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5])boardCircle(b.x+Math.cos(angle)*(b.r-9),b.y+Math.sin(angle)*(b.r-9),1.7,'#4d5659',30);
  }
  function drawFlipper(f){
    const bx=f.x+Math.cos(f.angle)*f.length,by=f.y+Math.sin(f.angle)*f.length;
    boardLine(f.x+5,f.y+8,bx+5,by+8,'#0009',20,-2);
    boardLine(f.x,f.y,bx,by,'#9b684d',21,9);boardLine(f.x,f.y,bx,by,'#cf754f',18,14);boardLine(f.x,f.y,bx,by,'#e6dbbd',13,17);boardLine(f.x+3,f.y-2,bx,by-2,'#fff2cc',2,19);
    boardCircle(f.x,f.y,7,'#56666b',20);boardCircle(f.x,f.y,3,'#f2e7ce',21);
    const mid=P((f.x+bx)/2,(f.y+by)/2,19);c.save();c.translate(mid.x,mid.y);c.rotate(Math.atan2(P(bx,by).y-P(f.x,f.y).y,P(bx,by).x-P(f.x,f.y).x));text('CIRCUIT',0,2,5,'#735a47');c.restore();
  }
  function drawBall(){
    const p=P(ball.x,ball.y,13),r=R*p.depth;
    boardCircle(ball.x+4,ball.y+8,R,'#0008');
    const g=c.createRadialGradient(p.x-r*.35,p.y-r*.45,r*.05,p.x+r*.12,p.y+r*.1,r);
    g.addColorStop(0,'#ffffff');g.addColorStop(.16,'#e6f2f2');g.addColorStop(.3,'#92a6b1');g.addColorStop(.47,'#253342');g.addColorStop(.6,'#d9d2b8');g.addColorStop(.79,'#53616a');g.addColorStop(1,'#101d2b');
    ellipse(p.x,p.y,r,r,g);ellipse(p.x-r*.31,p.y-r*.46,r*.24,r*.13,'#fff');
    c.strokeStyle='#f6ead6aa';c.lineWidth=.65;c.beginPath();c.arc(p.x,p.y,r*.88,Math.PI*1.1,Math.PI*1.72);c.stroke();
  }
  function draw(){
    const room=c.createLinearGradient(0,0,0,h);room.addColorStop(0,'#07090f');room.addColorStop(.7,'#162026');room.addColorStop(1,'#080a10');c.fillStyle=room;c.fillRect(0,0,w,h);
    c.save();c.translate(ox,oy);c.scale(scale,scale);
    // Soft pool of light beneath a machine that occupies the whole shot.
    const ambient=c.createRadialGradient(600,610,80,600,610,670);ambient.addColorStop(0,'#42525344');ambient.addColorStop(1,'#0000');c.fillStyle=ambient;c.fillRect(-800,-100,2800,1600);
    c.save();c.filter='blur(22px)';ellipse(602,933,340,28,'#000b');c.restore();
    // Cabinet sidewalls and front panel carry the depth beneath the playfield.
    boardPoly([[-277,-15],[-277,969],[-277,1046],[-277,62]],'#192c37',-30);
    boardPoly([[277,-15],[277,969],[277,1046],[277,62]],'#0f1e28',-30);
    const cabinet=c.createLinearGradient(0,760,0,944);cabinet.addColorStop(0,'#243a45');cabinet.addColorStop(.6,'#11212c');cabinet.addColorStop(1,'#080f17');
    const left=P(-277,970),right=P(277,970);c.fillStyle=cabinet;c.beginPath();c.moveTo(left.x,left.y);c.lineTo(right.x,right.y);c.lineTo(right.x-12,950);c.lineTo(left.x+12,950);c.closePath();c.fill();
    c.strokeStyle='#52616a';c.lineWidth=2;c.stroke();
    // Two chrome legs and a recessed coin door.
    for(const x of [left.x+24,right.x-24]){const leg=c.createLinearGradient(x,0,x+12,0);leg.addColorStop(0,'#17232c');leg.addColorStop(.5,'#adb8b9');leg.addColorStop(1,'#2c3b47');c.fillStyle=leg;c.fillRect(x,915,11,68);ellipse(x+5,985,12,3,'#3c464b');}
    roundRect(553,871,94,58,5,'#080d14');roundRect(560,877,80,45,3,'#25333d');roundRect(579,889,43,9,2,'#090f17');text('FREE PLAY',600,913,8,'#abb1a3');
    roundRect(815,866,32,23,5,'#88958f');roundRect(818,870,26,13,4,'#c1c6b1');
    // Continuous playfield geometry beneath all physical objects.
    const wood=c.createLinearGradient(0,160,0,840);wood.addColorStop(0,'#28414a');wood.addColorStop(.6,'#17303e');wood.addColorStop(1,'#10222e');
    boardPoly([[-265,-5],[265,-5],[265,952],[-265,952]],wood);
    for(let i=0;i<105;i++){const y=i*9;boardLine(-260,y,260,y,i%3?'#dce8df03':'#dce8df07',.6);}
    // Printed copper paths, orbit marks and cream lettering are original table art.
    for(const side of [-1,1]){
      boardPoly([[side*230,235],[side*176,265],[side*121,450],[side*51,518],[side*61,642],[side*106,724]],null,0,'#c8a56e88',2);
      boardPoly([[side*237,240],[side*187,285],[side*138,455],[side*71,529],[side*80,620],[side*126,716]],null,0,'#9f826033',5);
    }
    for(let r=48;r<155;r+=22){c.beginPath();for(let i=0;i<=60;i++){const a=i/60*Math.PI*2,p=P(-10+Math.cos(a)*r,440+Math.sin(a)*r*.8);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);}c.strokeStyle=r%2?'#c8a16b33':'#d5b88244';c.lineWidth=1;c.stroke();}
    const title=P(-10,511);text('VELVET',title.x,title.y,24,'#e2c596');text('C I R C U I T',title.x,title.y+22,10,'#b6c6c4');text('PRECISION / MOMENTUM',title.x,title.y+39,6,'#829ea5');
    const badge=P(-10,608);text(`${multiplier}X`,badge.x,badge.y,18,'#d9be88');text('BONUS MULTIPLIER',badge.x,badge.y+15,6,'#b7c4b9');
    for(let i=0;i<3;i++)insert(-110+i*85,78,10,String.fromCharCode(65+i),rollovers[i]||rollFlash>0);
    for(let i=0;i<5;i++)insert(-82+i*36,670,7,String(i+1),multiplier>i);
    insert(-176,788,6,'',phase==='play');insert(151,788,6,'',phase==='play');
    // Shooter lane, steel spring and guide rails.
    boardLine(236,250,236,920,'#152731',18);boardLine(231,220,231,866,'#64727244',1);boardLine(243,220,243,866,'#f2d9a633',1);
    const compress=phase==='ready'?Math.min(1,age/1.35):0;
    for(let i=0;i<12;i++)boardLine(230,913+i*(2.7-compress*.8),242,915+i*(2.7-compress*.8),'#bcc2b5',1.5,4);
    boardLine(236,922,236,950,'#7e8c8c',5,3);
    for(const wall of walls)rail(wall);
    for(const t of targets){
      boardLine(t.ax,t.ay,t.bx,t.by,'#0009',13,1);boardLine(t.ax,t.ay,t.bx,t.by,t.down?'#54615c':'#e8d9b8',10,t.down?2:17);
      if(!t.down)boardLine(t.ax,t.ay,t.bx,t.by,t.flash>0&&on(settings.lights)?settings.color:'#bc6c4d',5,19);
      insert((t.ax+t.bx)/2-6,(t.ay+t.by)/2+35,6,'',t.down);
    }
    for(const side of [-1,1]){
      const points=side<0?[[-209,639],[-145,701],[-194,729]]:[[174,639],[111,701],[163,729]];
      boardPoly(points,'#0008',-2);boardPoly(points,'#705247',13,'#ded1ad',2);boardPoly(points,'#a86a4d',17,'#e8c491',1);
      const flash=slings.filter(s=>Math.sign(s.ax)===side).some(s=>s.flash>0);if(flash&&on(settings.lights))glow(side*165,697,49,.23);
      const label=P(side<0?-182:145,693,19);text('10',label.x,label.y,10,'#f0dec0');
    }
    for(const post of posts){boardCircle(post.x+2,post.y+5,post.r+1,'#0008');boardCircle(post.x,post.y,post.r,'#7d8f93',12);boardCircle(post.x,post.y,post.r-2,'#d8e1d6',18);boardCircle(post.x,post.y,2,'#374a57',19);}
    bumpers.forEach(drawBumper);flippers.forEach(drawFlipper);
    if(phase==='play'||phase==='ready')drawBall();
    if(on(settings.lights))for(const p of particles){const point=P(p.x,p.y,22);c.globalAlpha=Math.max(0,p.life/.3);ellipse(point.x,point.y,1.4,1.4,p.color);}c.globalAlpha=1;
    // Rails and lock bar sit above the glass, never beneath the rolling ball.
    for(const x of [-270,270]){boardLine(x,-8,x,954,'#02070bcc',13,16);boardLine(x,-8,x,954,'#7b8b91',8,22);boardLine(x-1,-8,x-1,954,'#d7dfd4',2,26);}
    const bar=c.createLinearGradient(0,805,0,850);bar.addColorStop(0,'#e7e3d3');bar.addColorStop(.3,'#91a2a8');bar.addColorStop(.65,'#3e505b');bar.addColorStop(1,'#9ba7a5');
    boardPoly([[-276,919],[276,919],[276,963],[-276,963]],bar,18,'#a0aca5',1);
    if(on(settings.glass)){
      boardPoly([[-251,150],[-228,70],[157,854],[113,868]],'#d8f0ef07',32);
      boardPoly([[-218,59],[-205,46],[226,848],[213,857]],'#f8ebc709',32);
      boardLine(-245,173,-236,824,'#bde0e21a',1,34);
    }
    // Backbox and warm segmented score display, separate from the board physics.
    c.save();c.shadowColor='#0009';c.shadowBlur=16;c.shadowOffsetY=8;roundRect(374,25,452,151,9,'#080f17');c.restore();
    const back=c.createLinearGradient(0,30,0,175);back.addColorStop(0,'#344854');back.addColorStop(.4,'#192c36');back.addColorStop(1,'#101923');roundRect(379,29,442,142,5,back);
    c.strokeStyle='#9ca89b';c.lineWidth=1;c.strokeRect(385,35,430,130);
    for(const x of [391,786])for(let i=0;i<15;i++){c.fillStyle='#080f17';c.fillRect(x,51+i*6,22,2);}
    text('VELVET CIRCUIT',600,63,21,'#e9d3a6');text('AUTOMATIC PINBALL',600,79,7,'#9caeab');roundRect(427,87,346,49,4,'#080b0d');
    if(on(settings.stats)){
      text(String(score).padStart(8,'0'),600,116,28,'#efb969','center','Consolas,monospace');text(`BALL ${ballNumber} / 3`,441,129,7,'#c49f64','left');text(`HIGH ${String(high).padStart(8,'0')}`,758,129,7,'#c49f64','right');
    }else text('VELVET',600,118,22,'#836f51');
    text(phase==='over'?'GAME OVER  /  NEW GAME':phase==='ready'?'SPRING LAUNCH':phase==='drain'?'BALL DRAINED':'FREE PLAY  /  AUTO FLIPPERS',600,151,8,'#c7b892');
    c.restore();
  }
  function resize(){
    const density=Math.min(devicePixelRatio||1,1920/Math.max(1,innerWidth),1080/Math.max(1,innerHeight));
    w=canvas.width=Math.max(1,Math.round(innerWidth*density));h=canvas.height=Math.max(1,Math.round(innerHeight*density));
    scale=Math.min(w/660,h/1000)*.96;ox=w/2-600*scale;oy=(h-1000*scale)/2;draw();
  }
  function stop(){clearTimeout(timer);cancelAnimationFrame(frame);last=0;accumulator=0;}
  function speed(){return clamp(Number.isFinite(Number(settings.speed))?Number(settings.speed):1,0,2);}
  function animate(now){
    if(paused||document.hidden||motion.matches||speed()===0){stop();return;}
    const dt=last?Math.min(.1,(now-last)/1000):0;last=now;accumulator+=dt*speed();
    while(accumulator>=STEP){update(STEP);accumulator-=STEP;}draw();timer=setTimeout(()=>{frame=requestAnimationFrame(animate);},Math.max(0,1000/fps-4));
  }
  function start(){stop();if(!paused&&!document.hidden&&!motion.matches&&speed()>0)frame=requestAnimationFrame(animate);}
  addEventListener('resize',resize);document.addEventListener('visibilitychange',start);motion.addEventListener?.('change',start);
  api?.onSettingsChanged(v=>{settings={...settings,...v};draw();start();});api?.onPause(()=>{paused=true;stop();});api?.onResume(()=>{paused=false;start();});api?.onPerformanceChanged(v=>{fps=clamp(Number(v)||30,1,60);start();});
  prepare();
  if(preview!==null||motion.matches){const seconds=clamp(Number(preview??12)||0,0,120);for(let i=0;i<seconds/STEP;i++)update(STEP);paused=true;}
  resize();start();
})();
