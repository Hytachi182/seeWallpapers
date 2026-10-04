import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtime = await readFile(path.join(root, 'build/shader-scene.js'), 'utf8');
const common = `precision highp float;
uniform vec2 resolution;uniform float time;uniform vec3 accent;uniform float intensity;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec2(7.2,4.1);a*=.5;}return v;}
vec3 finish(vec3 c,vec2 uv){c*=1.-.2*smoothstep(.3,.9,length(uv-.5));return pow(max(c,0.),vec3(.93));}
`;
const aurora = `${common}
void main(){
 vec2 uv=gl_FragCoord.xy/resolution, p=(gl_FragCoord.xy-.5*resolution)/resolution.y;
 vec3 col=mix(vec3(.012,.027,.052),vec3(.016,.052,.08),uv.y);
 vec2 cell=floor(p*260.);float star=pow(max(0.,1.-length(fract(p*260.)-.5)*2.),18.)*step(.988,hash(cell));
 col+=vec3(.65,.8,1.)*star*smoothstep(.28,.7,uv.y);
 for(int i=0;i<4;i++){
  float f=float(i),x=p.x*1.4+f*.8;
  float ribbon=.44+.14*sin(x*2.1+time*.13+f)+.045*sin(x*7.-time*.21);
  float dist=uv.y-ribbon;
  float curtain=exp(-abs(dist)*10.)*smoothstep(-.018,.09,dist);
  float strands=.45+.55*pow(noise(vec2(x*95.+time*.12,f*5.)),2.);
  vec3 hue=mix(accent,vec3(.38,.23,.78),smoothstep(.02,.28,dist));
  col+=hue*curtain*strands*(.55-.07*f)*intensity;
 }
 for(int i=0;i<4;i++){
  float f=float(i);float ridge=.14+f*.035+fbm(vec2(p.x*3.+f*11.,f*3.))*(.11-f*.018);
  float snow=pow(noise(vec2(p.x*48.,uv.y*75.)),2.);
  vec3 mountain=mix(vec3(.009,.023,.03),vec3(.038,.075,.09),f/4.);
  mountain+=vec3(.09,.15,.18)*snow*smoothstep(ridge-.035,ridge,uv.y);
  col=mix(col,mountain,1.-smoothstep(ridge-.001,ridge+.001,uv.y));
 }
 gl_FragColor=vec4(finish(col,uv),1.);
}`;
const ocean = `${common}
void main(){
 vec2 uv=gl_FragCoord.xy/resolution,p=(gl_FragCoord.xy-.5*resolution)/resolution.y;
 float horizon=.49;vec2 sun=vec2(.27,.16);float sunDist=length(p-sun);
 vec3 sky=mix(vec3(.88,.36,.2),vec3(.12,.18,.3),smoothstep(horizon,1.,uv.y));
 sky+=vec3(.75,.38,.1)*exp(-sunDist*5.);
 float cloud=fbm(vec2(p.x*3.-time*.012,uv.y*9.));
 sky=mix(sky,vec3(.32,.19,.28),smoothstep(.53,.73,cloud)*smoothstep(.56,.83,uv.y)*.48);
 sky+=vec3(1.,.82,.48)*(1.-smoothstep(.054,.057,sunDist))*intensity;
 vec3 col=sky;
 if(uv.y<horizon){
  float depth=horizon-uv.y;vec2 sea=vec2(p.x/(depth+.035),1./(depth+.035));
  float wave=sin(sea.y*2.2-time*.8+noise(sea*.6)*4.)*.5+.5;
  float ripples=pow(wave,14.)*(.45+.55*noise(vec2(sea.x*3.,sea.y)));
  vec3 water=mix(accent*.13,vec3(.045,.06,.085),depth*1.3);
  float reflection=exp(-pow((p.x-sun.x)/(depth*.7+.04),2.))*ripples;
  water+=vec3(1.,.59,.23)*reflection*1.5*intensity;
  water+=accent*ripples*.10;
  float foam=pow(fbm(sea*2.+vec2(time*.05,time*.18)),12.)*8.;
  water+=vec3(.35,.5,.57)*foam*smoothstep(.05,.4,depth);
  col=water;
 }
 gl_FragColor=vec4(finish(col,uv),1.);
}`;
const dunes = `${common}
void main(){
 vec2 uv=gl_FragCoord.xy/resolution,p=(gl_FragCoord.xy-.5*resolution)/resolution.y;
 vec3 col=mix(vec3(.075,.065,.14),vec3(.008,.016,.04),uv.y);
 vec2 stars=p*300.;float star=pow(max(0.,1.-length(fract(stars)-.5)*2.),20.)*step(.993,hash(floor(stars)));
 col+=vec3(.65,.73,.95)*star*smoothstep(.48,.8,uv.y);
 vec2 moon=p-vec2(.3,.22);float disk=1.-smoothstep(.061,.063,length(moon));
 float shadow=1.-smoothstep(.06,.063,length(moon-vec2(.026,.009)));
 col+=vec3(.86,.86,1.)*max(disk-shadow,0.)*intensity;
 col+=accent*.04*exp(-length(moon)*5.);
 for(int i=0;i<7;i++){
  float f=float(i),ridge=.45-f*.075+.055*sin(p.x*(2.+f*.14)+f*1.7)+.015*sin(p.x*7.+f);
  float slope=clamp((ridge-uv.y)*8.,0.,1.);
  vec3 sand=mix(accent*.11,accent*(.37+.075*f),pow(1.-slope,2.));
  float grains=noise(vec2(p.x*260.,uv.y*240.));
  float ripples=sin(p.x*105.+uv.y*88.+noise(p*10.)*7.-time*.055);
  sand*=.90+.10*grains+.04*ripples;
  sand+=accent*exp(-abs(uv.y-ridge)*220.)*.14;
  col=mix(col,sand,1.-smoothstep(ridge-.001,ridge+.001,uv.y));
 }
 float dust=pow(fbm(p*7.+vec2(time*.012,-time*.006)),4.);
 col+=accent*dust*.07*intensity;
 gl_FragColor=vec4(finish(col,uv),1.);
}`;
const fireflies = `${common}
void main(){
 vec2 uv=gl_FragCoord.xy/resolution,p=(gl_FragCoord.xy-.5*resolution)/resolution.y;
 vec3 col=vec3(.008,.024,.027)+vec3(.035,.085,.076)*exp(-length(p-vec2(.13,.15))*3.);
 float shafts=pow(.5+.5*sin(p.x*9.+p.y*3.),7.)*smoothstep(-.4,.35,p.y);
 col+=vec3(.07,.13,.105)*shafts;
 for(int i=0;i<12;i++){
  float f=float(i),x=(hash(vec2(f,1.))-.5)*2.8,layer=hash(vec2(f,2.));
  float trunk=abs(p.x-x-.015*sin(p.y*3.+f));
  float silhouette=1.-smoothstep(.018+.025*layer,.024+.025*layer,trunk);
  float canopy=1.-smoothstep(.06,.20,abs(p.x-x)*.6+abs(p.y-.3-layer*.1)*.3);
  col=mix(col,vec3(.006,.016,.017)+vec3(.013,.033,.027)*layer,max(silhouette,canopy*.8)*(.5+.4*layer));
 }
 float mist=fbm(p*4.+vec2(time*.018,0.));
 col+=vec3(.04,.08,.065)*mist*exp(-abs(p.y+.15)*7.);
 for(int i=0;i<32;i++){
  float f=float(i),phase=hash(vec2(f,4.))*6.283;
  vec2 pos=vec2((hash(vec2(f,1.))-.5)*2.4,(hash(vec2(f,2.))-.5)*.8);
  pos+=vec2(sin(time*.21+phase),cos(time*.17+phase*2.))*.045;
  float r=length(p-pos),pulse=.2+.8*pow(.5+.5*sin(time*.8+phase),3.);
  col+=accent*(exp(-r*125.)*.45+exp(-r*420.)*2.)*pulse*intensity;
 }
 float floorLine=-.35+.035*sin(p.x*3.);
 col=mix(col,vec3(.004,.013,.011),1.-smoothstep(floorLine-.005,floorLine+.005,p.y));
 gl_FragColor=vec4(finish(col,uv),1.);
}`;
const templates = [
 {id:'aurora-borealis',name:'Aurora Borealis',color:'#54e8ad',shader:aurora,description:'Northern lights ripple above a silent mountain range and a crisp star field.'},
 {id:'ocean-dusk',name:'Ocean Dusk',color:'#4e9cbb',shader:ocean,description:'A low sun, slowly rolling waves and a shimmering golden reflection across the ocean.'},
 {id:'moonlit-dunes',name:'Moonlit Dunes',color:'#cda978',shader:dunes,description:'Sculpted dunes, wind-blown sand and a crescent moon in a quiet desert night.'},
 {id:'firefly-grove',name:'Firefly Grove',color:'#b3ef78',shader:fireflies,description:'Fireflies drift between shadowed trees and soft shafts of light in a misty grove.'}
];
for (const template of templates) {
 const directory=path.join(root,'templates',template.id); await mkdir(directory,{recursive:true});
 const settings=[{id:'color',type:'color',label:'Scene accent',default:template.color},{id:'speed',type:'slider',label:'Animation speed',min:.1,max:2,step:.1,default:1},{id:'intensity',type:'slider',label:'Light intensity',min:.3,max:2,step:.1,default:1}];
 const manifest={schemaVersion:1,id:template.id,name:template.name,description:template.description,author:'seeWallpaper',version:'1.0.0',category:'Nature',engine:'web',entry:'index.html',preview:'preview.jpg',performance:'medium',settings};
 await writeFile(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 await writeFile(path.join(directory,'scene.js'),runtime);
 await writeFile(path.join(directory,'index.html'),`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${template.name}</title>
<style>:root{color-scheme:dark}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#03060b}canvas{display:block;width:100%;height:100%}[hidden]{display:none!important}#fallback{position:fixed;inset:0;display:grid;place-content:center;background:#07101d;color:#dbe9f7;font:16px 'Segoe UI',sans-serif;padding:32px}#fallback img{width:min(80vw,960px);max-height:70vh;object-fit:contain}::selection{background:${template.color};color:#03060b}</style></head>
<body><canvas aria-label="${template.name} animated wallpaper"></canvas><div id="fallback" hidden><img src="preview.jpg" alt="${template.name} static preview"><p>WebGL is unavailable. Enable graphics acceleration to animate this wallpaper.</p></div>
<script type="application/json" id="defaults">${JSON.stringify(Object.fromEntries(settings.map(setting=>[setting.id,setting.default])))}</script><script id="fragment" type="x-shader/x-fragment">${template.shader}</script><script src="scene.js"></script></body></html>`);
 console.log('Generated '+template.name);
}
