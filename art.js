/* Pixel assets: deterministic tiles, scenery and a complete direction/pose atlas. */
(function(){
'use strict';
const {rng,LEVELS}=EmberCore;
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
const palettes={
 ren:['#182b43','#304869','#58758a','#d98245','#e7b28a','#0d1729'],
 ren_c64:['#000000','#000000','#202020','#d8d8d8','#000000','#000000'],
 enemy_c64:['#382058','#7858c8','#a890f0','#d86050','#d8b090','#000000'],
 sword:['#522b2c','#8d4438','#b5674e','#c2a376','#ddb18b','#211c29'],
 spear:['#394737','#687450','#9a9d6b','#d5ad68','#d9b491','#1b272a'],
 archer:['#514733','#8c7950','#b6a06c','#b35c45','#deb38d','#292b2b'],
 armour:['#353d4b','#626b78','#9c9d9c','#a94536','#d2ac8c','#1b2130'],
 guide:['#515450','#9b9b7b','#c9c1a0','#608b86','#d6ab86','#293c3e'],
 boss0:['#372d3c','#795664','#b48a77','#df944a','#dab58e','#171d29'],
 boss1:['#253c37','#4c7563','#9db084','#cda665','#d8ad85','#142b2c'],
 boss2:['#464b60','#848a9d','#d5d8cf','#94c8d5','#d4b292','#252b42'],
 boss3:['#432e2e','#885344','#bd8d5c','#fa9c43','#c9a383','#261e26'],
 boss4:['#382533','#823f40','#bf775d','#ffc279','#d3a78a','#1a1a2a'],
 boss5:['#401820','#a83038','#e87060','#f0d060','#d8b090','#000000']
};
const types=Object.keys(palettes),CW=48,CH=64,FRAMES=12;
const atlas=canvas(CW*8*types.length,CH*FRAMES),a=atlas.getContext('2d');a.imageSmoothingEnabled=false;
function poly(c,pts,color){c.fillStyle=color;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
function line(c,x,y,xx,yy,color,w=1){c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();}
function sprite(c,type,dir,frame){
 const p=palettes[type],boss=type.startsWith('boss'),guide=type==='guide';let [dark,base,light,accent,skin,ink]=p;
 const angle=dir*Math.PI/4,fx=Math.cos(angle),fy=Math.sin(angle),back=fy<-.2,side=Math.abs(fx)>.4,walk=frame<6?Math.sin(frame/6*Math.PI*2):0,attack=frame===6||frame===7,dodge=frame===9,dead=frame===11;
 c.save();c.translate(24,53);if(dead){c.rotate(-Math.PI/2);c.scale(.8,.8);c.translate(4,0);}if(dodge){c.translate(fx*3,3);c.scale(1,.78);}if(boss)c.scale(1.18,1.16);
 // Weapons behind the shoulders give every role a separate silhouette.
 if(type==='spear'){line(c,-13,-30,14,4,ink,3);line(c,-13,-30,14,4,'#a58a63',1);poly(c,[[-15,-34],[-15,-26],[-9,-28]],'#c5d3cf');}
 if(type==='archer'){line(c,-9,-24,-14,-7,'#c6ae79',2);line(c,-14,-7,-6,3,'#c6ae79',2);line(c,-9,-24,-6,3,ink);}
 if(type==='ren_c64'||type==='enemy_c64'||type==='boss5'){
  // Razor-sharp C64 2x2 pixel-grid martial-arts sprites (zero anti-aliased lines)
  const px=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  const dirX=fx>=0?1:-1,step=Math.round(walk*4),isBoss=type==='boss5',isPlayer=type==='ren_c64';
  const body=isPlayer?'#000000':base,shade=isPlayer?'#000000':dark,hi=isPlayer?'#282828':light,trim=isPlayer?'#000000':accent,out='#000000';
  if(dead){
   // Curled foetal silhouette lying flat on the ground
   c.restore();c.save();c.translate(24,53);
   px(-10,-9,16,8,out);px(-8,-8,11,5,body);px(-12,-7,5,6,out);px(3,-5,6,5,out);
   c.restore();return;
  }
  if(isBoss)c.scale(1.15,1.15);
  // Boots & stride legs
  px(-6-step,-14,5,14,out);px(-5-step,-13,3,10,shade);px(-6-step,-3,6,3,out);
  px(2+step,-14,5,14,out);px(3+step,-13,3,10,body);px(2+step,-3,6,3,out);
  // Gi / Armour torso
  px(-7,-32,14,19,out);px(-5,-31,10,16,body);px(-5,-31,4,15,hi);
  // Sash / Belt
  px(-6,-18,12,3,trim);
  // Head / Ninja Hood / Samurai Kabuto
  px(-5,-44,10,11,out);px(-3,-42,6,7,isPlayer?'#000000':skin);
  if(isPlayer){
   px(-5,-44,10,4,'#000000');px(-3,-43,6,1,'#404040'); // Hood rim
   px(-5-dirX*4,-42,5,2,'#000000');px(-6-dirX*6,-40,4,2,'#000000'); // Headband tails
  }else if(isBoss){
   px(-7,-45,14,4,out);px(-6,-47,3,3,accent);px(3,-47,3,3,accent); // Samurai horns
  }else{
   px(-6,-45,12,4,shade); // Guard helmet
  }
  // Arms & Katana / Weapon
  if(attack){
   px(dirX*4,-30,dirX*10,4,out);px(dirX*13,-31,dirX*13,2,'#e8e8e8'); // Extended katana strike
   px(-dirX*7,-29,4,9,out);
  }else{
   px(-9,-30-Math.round(walk*2),4,11,out);px(-8,-29-Math.round(walk*2),2,8,body);
   px(5,-30+Math.round(walk*2),4,11,out);px(6,-29+Math.round(walk*2),2,8,body);
   if(isPlayer){px(-7,-33,2,4,'#383838');px(6,-18,2,4,'#383838');} // Scabbard hilt
  }
  c.restore();return;
 }
 if(type==='ren'||boss){line(c,-8,-30,9,-8,ink,4);line(c,-7,-30,9,-8,'#7d878c',2);line(c,-9,-32,-4,-27,accent,3);}
 // Articulated legs: dark outline, cloth, knee light and leather tabi.
 const leg=(x,k)=>{const sway=walk*k*3;poly(c,[[x-4,-14],[x+3,-14],[x+4+sway,-3],[x+2+sway,0],[x-4+sway,0]],ink);poly(c,[[x-2,-13],[x+2,-13],[x+2+sway,-4],[x-2+sway,-4]],base);c.fillStyle=light;c.fillRect(Math.round(x-1+sway/2),-10,2,3);c.fillStyle=dark;c.fillRect(Math.round(x-4+sway),-3,8,3);c.fillStyle='#7e7c72';c.fillRect(Math.round(x-4+sway),0,8,1);};
 leg(-4,1);leg(5,-1);
 poly(c,[[-8,-28],[6,-28],[9,-14],[5,-10],[-8,-12],[-10,-20]],ink);
 poly(c,[[-6,-27],[5,-27],[7,-15],[2,-12],[-6,-14],[-8,-20]],base);
 poly(c,[[-6,-27],[-2,-26],[-3,-15],[-6,-16]],light);
 poly(c,[[0,-25],[5,-26],[7,-15],[3,-13]],dark);
 c.fillStyle=ink;c.fillRect(-8,-16,15,3);c.fillStyle=accent;c.fillRect(-6,-16,11,2);c.fillStyle='#c8a371';c.fillRect(0,-16,2,2);
 if(boss||type==='armour'){poly(c,[[-9,-29],[-3,-30],[-2,-24],[-10,-24]],light);poly(c,[[4,-29],[10,-27],[10,-23],[4,-24]],base);for(let j=0;j<3;j++)line(c,-6,-23+j*3,6,-23+j*3,dark);}
 const arm=(x,sgn)=>{let ex=x+sgn*2,ey=-17;if(attack){ex=x+fx*11;ey=-20+fy*7;}if(frame===8){ex=x+fx*7;ey=-28;}poly(c,[[x-3,-27],[x+3,-25],[ex+3,ey],[ex-2,ey+2]],ink);line(c,x,-25,ex,ey,base,4);c.fillStyle=skin;c.fillRect(Math.round(ex-2),Math.round(ey),4,3);return[ex,ey];};
 arm(-8,-1);const hand=arm(8,1);
 if(!guide&&type!=='archer'&&type!=='spear'){
  let ax=attack?fx*24:9,ay=attack?fy*17:-3;if(frame===6){ax=-fy*20;ay=fx*12-8;}
  line(c,hand[0],hand[1],hand[0]+ax,hand[1]+ay,ink,3);line(c,hand[0]+ax*.2,hand[1]+ay*.2,hand[0]+ax,hand[1]+ay,'#b5c8ce',2);line(c,hand[0]+ax*.25-2,hand[1]+ay*.25+2,hand[0]+ax*.25+2,hand[1]+ay*.25-2,accent,2);
 }
 // Head outline, folded hood, narrow eye band. Rear views show tied cloth.
 poly(c,[[-7,-39],[-4,-43],[4,-43],[8,-38],[7,-29],[2,-26],[-6,-29],[-8,-34]],ink);
 poly(c,[[-5,-38],[-3,-41],[3,-41],[6,-37],[5,-30],[-4,-29],[-6,-34]],base);
 poly(c,[[-5,-38],[-3,-41],[1,-41],[-2,-36],[-5,-35]],light);
 if(!back){c.fillStyle=skin;c.fillRect(side&&fx>0?0:-5,-35,side?6:10,3);c.fillStyle=ink;c.fillRect(side&&fx>0?3:-4,-34,2,1);if(!side)c.fillRect(2,-34,2,1);c.fillStyle=dark;c.fillRect(-5,-31,10,3);}else{line(c,-4,-35,5,-35,dark,2);c.fillStyle=accent;c.fillRect(-3,-33,5,2);}
 if(type==='ren'||boss){poly(c,[[-5,-28],[-6,-25],[-15-walk*2,-26+walk],[-20-walk,-23],[-18,-28],[-9,-30]],accent);line(c,-17,-27,-8,-28,'#edb26b');}
 if(type==='archer'||guide){poly(c,[[-13,-37],[-1,-46],[13,-36],[3,-34],[-9,-34]],ink);poly(c,[[-11,-38],[-1,-44],[11,-37],[3,-36]],'#a89460');line(c,-8,-37,9,-37,'#d0bb80');}
 if(guide){line(c,11,-30,12,2,'#c2a075',2);c.fillStyle='#d7d2b0';c.fillRect(-3,-31,6,5);}
 if(boss){poly(c,[[-7,-40],[-10,-47],[-3,-42]],accent);poly(c,[[5,-41],[10,-47],[8,-38]],accent);}
 c.restore();
}
types.forEach((type,i)=>{for(let dir=0;dir<8;dir++)for(let f=0;f<FRAMES;f++){a.save();a.translate(i*8*CW+dir*CW,f*CH);sprite(a,type,dir,f);a.restore();}});
function drawSprite(c,type,x,y,angle,state,step,time,flash){const i=types.indexOf(type);if(i<0)return;const screenAngle=Math.atan2((Math.cos(angle)+Math.sin(angle))*.5,Math.cos(angle)-Math.sin(angle));const dir=(Math.round(screenAngle/(Math.PI/4))+8)%8;let frame=state==='walk'?Math.floor(step)%6:0;if(state==='attack')frame=time>.16?6:7;if(state==='windup')frame=6;if(state==='guard')frame=8;if(state==='dodge')frame=9;if(state==='hurt')frame=10;if(state==='dead')frame=11;
 c.save();if(flash)c.globalAlpha=.45+Math.sin(flash*80)*.25;c.drawImage(atlas,i*8*CW+dir*CW,frame*CH,CW,CH,Math.round(x)-24,Math.round(y)-53,CW,CH);c.restore();}
const tileCache=new Map();
function tile(level,kind,variant){const key=`${level}:${kind}:${variant}`;if(tileCache.has(key))return tileCache.get(key);const c=canvas(50,30),g=c.getContext('2d'),r=rng(level*103+kind*53+variant*719),pal=LEVELS[level];
 const diamond=[[24,0],[48,12],[24,24],[0,12]];poly(g,diamond,kind===1?pal.water:kind===2?'#203039':kind===3?'#665344':pal.floor[variant%3]);
 g.save();g.beginPath();diamond.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.clip();
 if(kind===0){
  // Individually cut isometric cobbles, inset mortar and chipped highlights.
  const stoneSets=level===1?['#394a40','#435247','#35483f','#4d5b49']:level===2?['#77888e','#6e7d87','#84969a','#647983']:level===3?['#433c40','#4a4042','#514447','#3c373e']:level===4?['#4b4249','#594950','#443d46','#615054']:['#39474d','#455156','#3c4b50','#4c575a'];
  if(level!==1){for(const [x,y]of [[24,0],[12,6],[36,6],[24,12]]){
   const cc=stoneSets[Math.floor(r()*4)];poly(g,[[x,y+1],[x+11,y+6],[x,y+11],[x-11,y+6]],cc);line(g,x-9,y+6,x,y+2,level===2?'#acbfc044':'#88958d33');g.fillStyle='#071a251f';g.fillRect(x+2,y+6,3,1);
  }}
  for(let n=0;n<36;n++){g.fillStyle=n%3===0?'#c4c3aa19':'#04152525';g.fillRect(Math.floor(r()*48),Math.floor(r()*24),1+Math.floor(r()*3),1);}
  // Moss and wet fragmented highlights are seeded so tiles never shimmer.
  for(let n=0;n<8;n++){let x=r()*48,y=r()*24;g.fillStyle=level===1?'#73835c66':'#6c805440';g.fillRect(x,y,2+r()*3,1);}
  if(level===0&&variant%2===0){for(let n=0;n<6;n++){g.fillStyle='#8fa1a43b';g.fillRect(r()*48,r()*24,4+r()*5,1);}}
  if(level===2){for(let n=0;n<5;n++){g.fillStyle=n%3?'#c9d6d244':'#e4e9db55';g.fillRect(r()*46,r()*22,3+r()*3,1);}}
 }
 if(kind===1){for(let n=0;n<12;n++){g.fillStyle=level===3?(n%2?'#ffb45b':'#ef703e'):(n%2?'#86aeba33':'#091e3233');g.fillRect(r()*48,r()*24,2+r()*8,1);}if(level===3)line(g,0,12,24,24,'#e98d4c');}
 if(kind===3){for(let n=-20;n<50;n+=5){line(g,n,0,n+42,22,'#352c30');line(g,n+1,0,n+43,22,'#ae95722e');}for(let n=8;n<44;n+=15){g.fillStyle='#bba27a';g.fillRect(n,11,1,1);}}
 g.restore();tileCache.set(key,c);return c;}
window.EmberArt={canvas,poly,line,drawSprite,tile,atlas,types,CW,CH,FRAMES};
})();
