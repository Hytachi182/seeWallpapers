import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtime = await readFile(path.join(root, 'build/shader-scene.js'), 'utf8');
const common = `precision highp float;
uniform vec2 resolution;uniform float time;uniform vec3 accent;uniform float intensity;
#define PI 3.14159265359
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
`;
const horizon = `${common}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*resolution)/resolution.y;uv.x-=.12;
 float r=length(uv),angle=atan(uv.y,uv.x);
 vec3 col=vec3(.005,.008,.014);
 // Sparse stars distorted by the gravity well; an artistic lens, not a simulation.
 vec2 sky=uv*(1.+.020/(r*r+.025));vec2 cell=floor(sky*260.);
 float star=pow(max(0.,1.-length(fract(sky*260.)-.5)*2.),14.)*step(.993,hash(cell));
 col+=vec3(.65,.77,.92)*star*smoothstep(.22,.32,r);
 float neb=noise(sky*4.+vec2(.3,0))*noise(sky*11.-vec2(0,time*.003));
 col+=accent*neb*.075*smoothstep(.23,.9,r);
 // Tilted accretion disk, filament turbulence and Doppler-side brightness.
 vec2 disk=vec2(uv.x,uv.y*4.8);float dr=length(disk);float da=atan(disk.y,disk.x);
 float mask=smoothstep(.245,.285,dr)*(1.-smoothstep(.52,.95,dr));
 float turbulence=noise(vec2(da*8.+time*.24,dr*55.-time*.16));
 float filaments=.35+.65*pow(.5+.5*sin(dr*180.+turbulence*7.-time*.65),2.);
 float diskLight=mask*filaments/(.09+abs(uv.y)*10.);
 float visibility=uv.y>0.?smoothstep(.223,.25,r):1.;
 vec3 heat=mix(accent,vec3(1.,.92,.74),pow(max(0.,1.-(dr-.24)*2.8),3.));
 col+=heat*diskLight*visibility*(.10+.25*smoothstep(-.5,.6,uv.x))*intensity;
 // Secondary image of the disk wrapped above and below the event horizon.
 float photon=exp(-abs(r-.245)*150.);
 float halo=exp(-abs(r-.253)*30.);
 float arc=.5+.5*sin(angle*3.+noise(vec2(angle*6.,time*.08))*3.);
 col+=mix(accent,vec3(1.,.89,.65),.6)*photon*(.65+arc*.65)*intensity;
 col+=accent*halo*.12*intensity;
 col+=accent*exp(-abs(uv.y)*35.)*exp(-abs(uv.x)*1.8)*.055;
 col*=smoothstep(.224,.239,r);
 col=vec3(1.)-exp(-col*1.4);col=pow(col,vec3(.88));
 float vignette=1.-smoothstep(.5,1.3,length(uv*vec2(.65,1.)));col*=vignette;
 col+=(hash(gl_FragCoord.xy+mod(time,10.))-.5)*.007;
 gl_FragColor=vec4(max(col,0.),1.);
}`;
const forge = `${common}
float shape(vec3 p){
 p.xy=rot(.40+time*.04)*p.xy;p.yz=rot(.85+sin(time*.08)*.18)*p.yz;p.xz=rot(.35+time*.1)*p.xz;
 float a=atan(p.z,p.x);
 vec2 q=vec2(length(p.xz)-1.05,p.y);
 float twist=a*3.+time*.38;q=rot(twist)*q;
 float wobble=.045*sin(p.x*8.+time)*sin(p.z*7.-time*.6);
 return length(q)-(.28+.045*sin(a*5.+time*.3)+wobble);
}
vec3 normalAt(vec3 p){vec2 e=vec2(.001,0);return normalize(vec3(shape(p+e.xyy)-shape(p-e.xyy),shape(p+e.yxy)-shape(p-e.yxy),shape(p+e.yyx)-shape(p-e.yyx)));}
vec3 environment(vec3 d){
 float strip=pow(max(0.,1.-abs(d.y-.45)*2.4),12.);
 float top=pow(max(0.,dot(d,normalize(vec3(-.4,1.,.6)))),7.);
 float side=pow(max(0.,dot(d,normalize(vec3(1.,.1,-.3)))),18.);
 return vec3(.025,.035,.065)+vec3(.9,.95,1.)*strip*1.6+accent*top*1.6+vec3(1.,.32,.12)*side*1.5;
}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*resolution)/resolution.y;uv.x-=.10;
 vec3 ro=vec3(0,0,5.6),rd=normalize(vec3(uv,-1.65));
 float travel=0.;bool hit=false;
 for(int i=0;i<72;i++){vec3 p=ro+rd*travel;float d=shape(p);if(d<.0015){hit=true;break;}travel+=d*.75;if(travel>8.)break;}
 vec3 col=vec3(.007,.012,.022)+accent*.026*exp(-length(uv-vec2(.25,.1))*1.7);
 if(hit){
  vec3 p=ro+rd*travel,n=normalAt(p),reflection=reflect(rd,n);
  float facing=max(0.,dot(n,-rd)),fresnel=pow(1.-facing,3.);
  float wave=dot(n,normalize(vec3(.3,.8,1.)))*3.8+length(p)*1.4+time*.08;
  vec3 iridescence=.5+.5*cos(vec3(0.,2.1,4.2)+wave*2.4);
  vec3 metal=mix(accent*.45+vec3(.15),iridescence,.68);
  col=environment(reflection)*metal*(.55+.65*intensity)+environment(reflection)*fresnel*.48;
  float spec=pow(max(0.,dot(reflection,normalize(vec3(-.5,.8,1.)))),70.);
  col+=vec3(1.,.94,.85)*spec*2.;
  col*=.65+.35*smoothstep(-.9,.9,p.y);
 }else{
  float bloom=exp(-length(uv)*4.5);col+=accent*bloom*.05;
 }
 col=vec3(1.)-exp(-col*1.6);col=pow(col,vec3(.9));
 col*=1.-smoothstep(.7,1.6,length(uv));col+=(hash(gl_FragCoord.xy)-.5)*.005;
 gl_FragColor=vec4(max(col,0.),1.);
}`;
const templates = [
  { id: 'event-horizon', name: 'Event Horizon', color: '#ffb35c', description: 'A cinematic black hole with a turbulent accretion disk, gravitational lens artwork and a luminous photon ring.', shader: horizon },
  { id: 'spectral-forge', name: 'Spectral Forge', color: '#71d9ff', description: 'A ray-marched liquid-metal sculpture with iridescent chrome, rotating studio reflections and a slowly deforming surface.', shader: forge }
];
for (const template of templates) {
  const directory = path.join(root, 'templates', template.id); await mkdir(directory, { recursive: true });
  const manifest = { schemaVersion: 1, id: template.id, name: template.name, description: template.description, author: 'seeWallpaper', version: '1.0.0', category: 'Tech', engine: 'web', entry: 'index.html', preview: 'preview.jpg', performance: 'high', settings: [
    { id: 'color', type: 'color', label: 'Light color', default: template.color },
    { id: 'speed', type: 'slider', label: 'Animation speed', min: 0.1, max: 2, step: 0.1, default: 1 },
    { id: 'intensity', type: 'slider', label: 'Light intensity', min: 0.3, max: 2, step: 0.1, default: 1 }
  ] };
  const defaults = Object.fromEntries(manifest.settings.map(s => [s.id, s.default]));
  await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(path.join(directory, 'scene.js'), runtime);
  await writeFile(path.join(directory, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${template.name}</title>
<style>:root{color-scheme:dark}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#03060b}canvas{display:block;width:100%;height:100%}[hidden]{display:none!important}#fallback{position:fixed;inset:0;display:grid;place-content:center;color:#dbe9f7;background:#07101d;font:16px 'Segoe UI',sans-serif;padding:32px}#fallback img{width:min(80vw,960px);max-height:70vh;object-fit:contain}#fallback p{max-width:60ch}::selection{background:${template.color};color:#03060b}</style></head>
<body><canvas aria-label="${template.name} animated wallpaper"></canvas><div id="fallback" hidden><img src="preview.jpg" alt="${template.name} static preview"><p>WebGL is unavailable. Enable graphics acceleration to animate this wallpaper.</p></div>
<script type="application/json" id="defaults">${JSON.stringify(defaults)}</script><script id="fragment" type="x-shader/x-fragment">${template.shader}</script><script src="scene.js"></script></body></html>`);
  console.log(`Generated ${template.name}`);
}
