/* Articulated guard renderer using seeWallpaper's original Emberwatch armor. */
(() => {
  'use strict';
  function gait(time,velocity,scale,offset=0){
    const stride=44,stance=.62,period=stride*scale/(Math.max(.1,velocity)*stance);
    const phase=((time/period+offset)%1+1)%1;
    if(phase<stance)return{x:22-stride*phase/stance,y:337,grounded:true,period};
    const u=(phase-stance)/(1-stance),tangent=-stride*(1-stance)/stance;
    const x=(2*u**3-3*u*u+1)*-22+(u**3-2*u*u+u)*tangent+(-2*u**3+3*u*u)*22+(u**3-u*u)*tangent;
    return{x,y:337-Math.sin(u*Math.PI)*17,grounded:false,period};
  }
  function draw(c,image,parts,t,x,ground,scale,velocity){
    const sprite=(name,px,py,width,height,angle=0,pivot=.5)=>{
      c.save();c.translate(px,py);c.rotate(angle);c.drawImage(image,...parts[name],-width*.5,-height*pivot,width,height);c.restore();
    };
    const bone=(name,a,b,width,extra=0)=>sprite(name,a.x,a.y,width,Math.hypot(b.x-a.x,b.y-a.y)+extra,Math.atan2(b.y-a.y,b.x-a.x)-Math.PI*.5,0);
    const end=(p,angle,len)=>({x:p.x+Math.sin(angle)*len,y:p.y+Math.cos(angle)*len});
    const knee=(hip,ankle)=>{
      const dx=ankle.x-hip.x,dy=ankle.y-hip.y,d=Math.min(128.99,Math.max(1,Math.hypot(dx,dy)));
      const angle=Math.atan2(dy,dx)-Math.acos(Math.max(-1,Math.min(1,(63*63+d*d-66*66)/(126*d))));
      return{x:hip.x+Math.cos(angle)*63,y:hip.y+Math.sin(angle)*63};
    };
    const left=gait(t,velocity,scale),right=gait(t,velocity,scale,.5);
    const stride=t/left.period*Math.PI*2,step=Math.sin(stride),bob=-(step*step)*.8;
    c.save();c.translate(x,ground);c.scale(scale,scale);c.translate(0,-360);
    sprite('cape',-18,218+bob,104,226);
    for(const side of[-1,1]){
      const foot=side<0?left:right,hip={x:side*23,y:211+bob},ankle={x:side*23+foot.x,y:foot.y},joint=knee(hip,ankle);
      bone('thigh',hip,joint,40);bone('shin',joint,ankle,42,20);
    }
    const shoulder={x:-44,y:125+bob},elbow=end(shoulder,-.25-step*.18,55),hand=end(elbow,-.18,48);
    bone('upperArm',shoulder,elbow,36);bone('forearm',elbow,hand,34);
    sprite('chest',0,150+bob,108,114);sprite('hips',0,211+bob,106,59);sprite('helmet',0,65+bob,76,84);
    sprite('farShoulder',-47,124+bob,47,47);
    const near={x:44,y:125+bob},nearElbow=end(near,.1+step*.22,55),nearHand=end(nearElbow,-.12,48);
    bone('upperArm',near,nearElbow,36);bone('forearm',nearElbow,nearHand,34);sprite('shoulder',47,124+bob,53,51);
    sprite('shield',hand.x-12,hand.y-17,88,113,-.08);sprite('sword',nearHand.x,nearHand.y,30,141,.08,.88);c.restore();
  }
  window.seeRoyalGuard={draw,gait};
})();
