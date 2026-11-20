(function(){
'use strict';
const {poly,line,drawSprite,tile}=EmberArt,{rng,dist}=EmberCore;
class Renderer{
 constructor(canvas){this.canvas=canvas;this.c=canvas.getContext('2d',{alpha:false});this.c.imageSmoothingEnabled=false;this.camera={x:0,y:0};this.ready=false;this.particles=[];this.shake=0;this.reduced=false;this.atlas=EmberArt.atlas;}
 project(x,y,z=0){return{x:(x-y)*24-this.camera.x+384,y:(x+y)*12-this.camera.y+236-z};}
 impact(x,y,color){for(let i=0;i<9;i++){const a=i*2.4;this.particles.push({x,y,z:14,vx:Math.cos(a)*1.5,vy:Math.sin(a)*1.5,vz:8+i,life:.38,color});}if(!this.reduced)this.shake=3;}
 text(text,x,y,color='#e5d4ae',size=10,align='left'){const c=this.c;c.font=`${size}px "Courier New",monospace`;c.textAlign=align;c.textBaseline='top';c.fillStyle='#060f1d';c.fillText(text,Math.round(x)+1,Math.round(y)+1);c.fillStyle=color;c.fillText(text,Math.round(x),Math.round(y));}
 glow(x,y,color,r=40){const c=this.c;c.save();c.globalCompositeOperation='screen';const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color+'45');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();}
 box(x,y,w,h,z,colors){const c=this.c,p1=this.project(x,y),p2=this.project(x+w,y),p3=this.project(x+w,y+h),p4=this.project(x,y+h);poly(c,[[p4.x,p4.y-z],[p3.x,p3.y-z],[p3.x,p3.y],[p4.x,p4.y]],colors[1]);poly(c,[[p2.x,p2.y-z],[p3.x,p3.y-z],[p3.x,p3.y],[p2.x,p2.y]],colors[2]);poly(c,[[p1.x,p1.y-z],[p2.x,p2.y-z],[p3.x,p3.y-z],[p4.x,p4.y-z]],colors[0]);return[p1,p2,p3,p4];}
 building(b,level,player){const c=this.c,near=player.x>b.x-1&&player.x<b.x+b.w+1&&player.y>b.y-2&&player.y<b.y+b.h+1;if(near)c.globalAlpha=.48;
  const snow=level===2,forge=level===3,colors=forge?['#514a4f','#40363e','#302f3a']:['#6d625b','#4e494a','#363f49'];const p=this.box(b.x,b.y,b.w,b.h,29,colors),[p1,p2,p3,p4]=p;
  for(let k=0;k<5;k++){const y=k*6;line(c,p4.x,p4.y-y,p3.x,p3.y-y,'#252e3877');line(c,p2.x,p2.y-y,p3.x,p3.y-y,'#19243177');}
  // Columns, dark doorway, shuttered windows and projecting roof eaves.
  for(let i=0;i<=b.w;i++){const q=this.project(b.x+i,b.y+b.h);line(c,q.x,q.y-28,q.x,q.y,'#272b32',3);line(c,q.x-1,q.y-27,q.x-1,q.y-2,'#82705a');if(i>0&&i<b.w){const w=this.project(b.x+i-.3,b.y+b.h,17);poly(c,[[w.x-5,w.y-7],[w.x+5,w.y-2],[w.x+5,w.y+5],[w.x-5,w.y]],'#14242f');line(c,w.x-3,w.y-5,w.x+3,w.y-2,'#c69c5e',2);line(c,w.x-3,w.y-1,w.x+3,w.y+2,'#7e6248');}}
  const door=this.project(b.x+b.w*.52,b.y+b.h+.01);poly(c,[[door.x-9,door.y-23],[door.x+9,door.y-14],[door.x+9,door.y],[door.x-9,door.y-9]],'#171e2a');
  const r1=this.project(b.x-.3,b.y-.3,32),r2=this.project(b.x+b.w+.3,b.y-.3,32),r3=this.project(b.x+b.w+.3,b.y+b.h+.3,32),r4=this.project(b.x-.3,b.y+b.h+.3,32),ridge1=this.project(b.x-.2,b.y+b.h*.5,59),ridge2=this.project(b.x+b.w+.2,b.y+b.h*.5,59);
  poly(c,[[r1.x,r1.y],[r2.x,r2.y],[ridge2.x,ridge2.y],[ridge1.x,ridge1.y]],snow?'#bac9cb':forge?'#55525a':'#314553');
  poly(c,[[ridge1.x,ridge1.y],[ridge2.x,ridge2.y],[r3.x,r3.y],[r4.x,r4.y]],snow?'#8fa7af':forge?'#433d47':'#263b49');
  for(let i=0;i<24;i++){const t=i/24;line(c,ridge1.x+(ridge2.x-ridge1.x)*t,ridge1.y+(ridge2.y-ridge1.y)*t,r4.x+(r3.x-r4.x)*t,r4.y+(r3.y-r4.y)*t,snow?'#d3dedb':'#59717a88');}
  for(let i=1;i<9;i++){const t=i/9;line(c,ridge1.x+(r4.x-ridge1.x)*t,ridge1.y+(r4.y-ridge1.y)*t,ridge2.x+(r3.x-ridge2.x)*t,ridge2.y+(r3.y-ridge2.y)*t,'#122934aa');line(c,ridge1.x+(r4.x-ridge1.x)*t,ridge1.y+(r4.y-ridge1.y)*t-1,ridge2.x+(r3.x-ridge2.x)*t,ridge2.y+(r3.y-ridge2.y)*t-1,snow?'#eef1df66':'#73949622');}
  line(c,ridge1.x,ridge1.y-1,ridge2.x,ridge2.y-1,snow?'#e7e5d7':'#78898b',2);line(c,r4.x,r4.y,r3.x,r3.y,'#a38d69',2);
  for(const q of [r1,r2,r3,r4]){poly(c,[[q.x-8,q.y-7],[q.x-4,q.y-2],[q.x+5,q.y+1],[q.x+3,q.y+4],[q.x-5,q.y+1]],snow?'#c8d4d0':'#314653');line(c,q.x-8,q.y-7,q.x-5,q.y-2,snow?'#edf0df':'#97a69a');}
  const banner=this.project(b.x+b.w-.7,b.y+b.h+.1,20);c.fillStyle=level===2?'#7e9d9d':'#844637';poly(c,[[banner.x-4,banner.y-5],[banner.x+4,banner.y-1],[banner.x+4,banner.y+18],[banner.x,banner.y+13],[banner.x-4,banner.y+15]],c.fillStyle);poly(c,[[banner.x,banner.y],[banner.x+2,banner.y+4],[banner.x,banner.y+8],[banner.x-2,banner.y+4]],'#d6bb84');c.globalAlpha=1;
  const lantern=this.project(b.x+b.w-.25,b.y+b.h+.1,19);this.lantern(lantern.x,lantern.y);
 }
 lantern(x,y){const c=this.c;this.glow(x,y,'#fb9b43',30);c.fillStyle='#342f32';c.fillRect(x-5,y-7,10,2);c.fillStyle='#d68140';c.fillRect(x-4,y-5,8,10);c.fillStyle='#ffdc8b';c.fillRect(x-2,y-4,4,8);line(c,x-5,y+5,x+5,y+5,'#403139',2);line(c,x,y-11,x,y-7,'#ab855d');}
 prop(p,level,player,time){if(p.type==='building'){this.building(p,level,player);return;}const c=this.c,s=this.project(p.x,p.y),r=rng(Math.floor(p.x*83+p.y*163+level*713));
  c.save();if(dist(p,player)<1.2)c.globalAlpha=.38;
  if(p.type==='lantern'){this.box(p.x-.12,p.y-.12,.24,.24,4,['#898b7b','#616862','#37464a']);line(c,s.x,s.y-3,s.x,s.y-27,'#6d6754',2);this.lantern(s.x,s.y-29);if(level===0){for(let i=0;i<6;i++){c.fillStyle='#d49d5333';c.fillRect(s.x-i*2,s.y+2+i*3,4+i*2,1);}}}
  else if(p.type==='torii'){const color=level===2?'#687d83':level===4?'#a35a44':'#804e3f';for(const x of [-17,17]){line(c,s.x+x,s.y,s.x+x+Math.sign(x)*2,s.y-43,color,5);line(c,s.x+x-1,s.y,s.x+x+Math.sign(x)*2-1,s.y-43,'#c0946a',1);}line(c,s.x-23,s.y-33,s.x+23,s.y-33,color,4);line(c,s.x-27,s.y-43,s.x+27,s.y-43,'#243d48',6);line(c,s.x-27,s.y-46,s.x+27,s.y-46,'#9b8b6f',2);line(c,s.x-27,s.y-43,s.x-33,s.y-48,'#425659',3);line(c,s.x+27,s.y-43,s.x+33,s.y-48,'#425659',3);line(c,s.x-13,s.y-29,s.x+13,s.y-29,'#beaa7b');for(let i=-1;i<=1;i++){poly(c,[[s.x+i*8,s.y-29],[s.x+i*8+2,s.y-26],[s.x+i*8,s.y-22],[s.x+i*8-2,s.y-25]],'#c5be9a');}}
  else if(p.type==='boat'){poly(c,[[s.x-25,s.y-5],[s.x-19,s.y-16],[s.x+31,s.y+8],[s.x+39,s.y+21],[s.x+20,s.y+19]],'#171f2b');poly(c,[[s.x-22,s.y-9],[s.x-16,s.y-13],[s.x+29,s.y+8],[s.x+31,s.y+15],[s.x+18,s.y+14]],'#75624d');for(let i=0;i<8;i++)line(c,s.x-16+i*6,s.y-10+i*2,s.x-20+i*6,s.y-5+i*3,'#ad8c5d');line(c,s.x+6,s.y+2,s.x+6,s.y-43,'#b8a782',2);poly(c,[[s.x+5,s.y-40],[s.x+26,s.y-19],[s.x+6,s.y-17]],'#d1c5a0');line(c,s.x+6,s.y-41,s.x+26,s.y-19,'#7a7c6e');}
  else if(p.type==='chimney'){this.box(p.x-.3,p.y-.3,.6,.6,45,['#71615b','#4a4147','#34333e']);this.glow(s.x,s.y-45,'#f5a158',24);for(let i=0;i<5;i++){c.fillStyle='#85919817';c.fillRect(s.x-5+Math.sin(time+i)*4,s.y-51-i*6,10+i*2,4);}}
  else if(p.type==='crate'){const z=8+p.variant*2;this.box(p.x-.28,p.y-.28,.56,.56,z,['#82715a','#625443','#4a4540']);line(c,s.x-11,s.y-6-z,s.x+11,s.y+5,'#b49a6b');line(c,s.x+11,s.y-6-z,s.x-11,s.y+5,'#342e30');for(let i=0;i<3;i++)line(c,s.x-7+i*5,s.y-5-z+i*2,s.x-7+i*5,s.y+i*2,'#282d3255');}
  else if(p.type==='pipe'){this.box(p.x-.2,p.y-.25,.4,.5,22,['#7f6c60','#55484a','#383843']);for(let i=0;i<3;i++)line(c,s.x-7,s.y-5-i*6,s.x+7,s.y+2-i*6,'#ab805c');this.glow(s.x,s.y-24,'#ef8b43',19);}
  else if(p.type==='boulder'){
   const sc=p.scale||1,w=28*sc,h=22*sc;
   poly(c,[[s.x-w*.4,s.y+2],[s.x+w*.9,s.y-h*.1],[s.x+w*1.1,s.y+6],[s.x+w*.2,s.y+10]],'#4a4a4a');
   poly(c,[[s.x-w*.7,s.y+2],[s.x-w*.55,s.y-h*.65],[s.x-w*.1,s.y-h],[s.x+w*.45,s.y-h*.75],[s.x+w*.65,s.y-2],[s.x+w*.1,s.y+4]],'#7c7c7c');
   poly(c,[[s.x-w*.1,s.y-h*.2],[s.x+w*.45,s.y-h*.75],[s.x+w*.65,s.y-2],[s.x+w*.1,s.y+4]],'#262626');
   for(let i=0;i<18;i++){const dx=(r()-.5)*w*1.1,dy=-r()*h*.8;c.fillStyle=dx>0?'#111111':'#a8a8a8';c.fillRect(Math.round(s.x+dx),Math.round(s.y+dy),2,2);}
  }
  else if(p.type==='c64tree'){
   c.fillStyle='#684020';c.fillRect(Math.round(s.x-3),Math.round(s.y-22),6,22);
   for(let i=0;i<36;i++){const lx=s.x+(r()-.5)*34,ly=s.y-18-r()*34;c.fillStyle=i%3===0?'#205830':i%3===1?'#48a868':'#60c8b0';c.fillRect(Math.round(lx),Math.round(ly),4,3);}
  }
  else if(p.type==='bamboo'){
   for(let k=0;k<5;k++){let xx=s.x-10+k*5,h=35+r()*35;line(c,xx,s.y,xx-4,s.y-h,'#243f3c',4);line(c,xx-1,s.y,xx-5,s.y-h,'#66866a',1);for(let j=0;j<5;j++){let yy=s.y-j*h/5;line(c,xx-2,yy,xx+2,yy,'#9ba57a');poly(c,[[xx,yy-5],[xx+15,yy-13],[xx+5,yy-3]],k%2?'#597d61':'#3d6252');}}
  }else{
   const h=45+p.variant*7;c.fillStyle='#302f32';c.fillRect(s.x-3,s.y-h*.7,6,h*.7);line(c,s.x-2,s.y,s.x-2,s.y-h*.6,'#747161');
   for(let k=0;k<4;k++){const yy=s.y-h+k*11,w=10+k*5;poly(c,[[s.x,yy-10],[s.x+w,yy+15],[s.x+5,yy+10],[s.x-w,yy+16]],level===2?(k%2?'#9db2b1':'#bdcdcb'):level===4?(k%2?'#594d47':'#75644e'):(k%2?'#284c48':'#3f6051'));line(c,s.x,yy-8,s.x-w+3,yy+13,level===2?'#e2e4d5':'#6c80623f');}
  }c.restore();
 }
 object(o,g,time){const c=this.c,s=this.project(o.x,o.y),col=g.data.accent;
  if(o.type==='guide'){drawSprite(c,'guide',s.x,s.y,Math.PI/2,'idle',0,0,0);this.text('SORA',s.x,s.y-56,'#c9ceb0',8,'center');return;}
  if(o.type==='food'){if(g.foods?.includes(o.id))return;const yy=s.y-10;c.fillStyle='#e83838';c.fillRect(s.x-4,yy-4,8,7);c.fillStyle='#68f888';c.fillRect(s.x,yy-7,3,3);return;}
  if(o.type==='relic'){
   if(g.relics.includes(+o.id.slice(-1)))return;const yy=s.y-16+(this.reduced?0:Math.sin(time*3)*2);this.glow(s.x,yy,'#ffc778',28);poly(c,[[s.x,yy-9],[s.x+5,yy],[s.x,yy+9],[s.x-5,yy]],'#f9cf7e');poly(c,[[s.x,yy-7],[s.x+3,yy],[s.x,yy+5]],'#fff1bc');line(c,s.x-9,s.y,s.x+9,s.y,'#dcb77e');return;
  }
  if(o.type==='node'){
   this.box(o.x-.3,o.y-.3,.6,.6,12,['#7c8278','#525d59','#394a4a']);const active=g.puzzle.includes(o.number);this.text(['I','II','III'][o.number],s.x,s.y-18,active?col:'#c2c4ad',9,'center');if(active)this.glow(s.x,s.y-12,col,22);return;
  }
  if(o.type==='shrine'){
   this.box(o.x-.45,o.y-.45,.9,.9,4,['#8b8e7b','#5b645b','#354a4b']);line(c,s.x-9,s.y-3,s.x-9,s.y-36,'#66574a',3);line(c,s.x+9,s.y-3,s.x+9,s.y-36,'#66574a',3);poly(c,[[s.x,s.y-52],[s.x+22,s.y-34],[s.x+12,s.y-32],[s.x,s.y-40],[s.x-12,s.y-32],[s.x-22,s.y-34]],'#344b56');line(c,s.x-21,s.y-34,s.x+21,s.y-34,'#a89067',2);this.lantern(s.x,s.y-24);return;
  }
  if(o.type==='altar'){
   this.box(o.x-.7,o.y-.7,1.4,1.4,4,['#767777','#4e5658','#343f48']);this.box(o.x-.4,o.y-.4,.8,.8,16,['#9c907b','#646663','#4a5156']);const ready=g.relics.length===3&&g.solved;
   for(let i=0;i<3;i++){const x=s.x+(i-1)*8,y=s.y-20;poly(c,[[x,y-6],[x+3,y],[x,y+5],[x-3,y]],g.bossDefeated?'#a7d6c5':ready?col:'#47545a');}if(ready)this.glow(s.x,s.y-20,col,45);
  }
 }
 weather(g,time){if(this.reduced)return;const c=this.c,region=g.data.region;
  if(region==='harbour'){c.strokeStyle='#b9d6de22';c.lineWidth=1;for(let i=0;i<90;i++){const x=(i*127+time*45)%800-15,y=(i*67+time*210)%440;line(c,x,y,x-3,y+9,'#b9d6de22');}}
  else if(region==='snow'){for(let i=0;i<60;i++){c.fillStyle=i%3?'#e8ede3aa':'#d2e0d055';c.fillRect((i*131+Math.sin(time+i)*8)%780,(i*73+time*(12+i%8))%435,1+(i%3===0),1);}}
  else if(region==='forge'||region==='citadel'){for(let i=0;i<40;i++){c.fillStyle=i%3?'#e58f4b99':'#ffcc7f';c.fillRect((i*137+Math.sin(time*.8+i)*15)%780,435-(i*71+time*(10+i%7))%440,1,2);}}
  else{for(let i=0;i<22;i++){c.fillStyle=`rgba(194,218,125,${.25+Math.sin(time*2+i)*.2})`;c.fillRect((i*137+Math.sin(time+i)*5)%780,(i*77+Math.cos(time+i)*10)%430,2,1);}}
 }
 render(g,dt,opts={}){
  const c=this.c,t=g.time,p=g.player;
  if(g.data.c64){
   // Last Ninja page-by-page room snapping (discrete 9x9 tile screens)
   const rx=Math.floor(p.x/9),ry=Math.floor(p.y/9);
   const cx=rx*9+4.5,cy=ry*9+4.5;
   this.camera={x:(cx-cy)*24+100,y:(cx+cy)*12+48};
   this.ready=true;
  }else{
   const tx=Math.max(-270,Math.min(270,(p.x-p.y)*24)),ty=Math.max(130,Math.min(500,(p.x+p.y)*12));
   if(!this.ready){this.camera={x:tx,y:ty};this.ready=true;}
   const follow=1-Math.exp(-dt*7);this.camera.x+=(tx-this.camera.x)*follow;this.camera.y+=(ty-this.camera.y)*follow;
  }
  c.save();if(this.shake>0){if(!this.reduced)c.translate(Math.sin(t*70)*this.shake,Math.cos(t*61)*this.shake);this.shake=Math.max(0,this.shake-dt*18);}
  const rx=g.data.c64?Math.floor(p.x/9):0,ry=g.data.c64?Math.floor(p.y/9):0;
  const minX=rx*9,maxX=Math.min(26,minX+9),minY=ry*9,maxY=Math.min(26,minY+9);
  const inRoom=(ox,oy)=>!g.data.c64||(ox>=minX&&ox<maxX&&oy>=minY&&oy<maxY);
  if(g.data.c64){
   c.save();c.beginPath();c.rect(0,0,568,368);c.clip();
   c.fillStyle='#8ee6a2';c.fillRect(-5,-5,580,380);
   const drawIsoTile=(tx,ty,tVal)=>{
    const s=this.project(tx,ty);
    poly(c,[[s.x,s.y],[s.x+24,s.y+12],[s.x,s.y+24],[s.x-24,s.y+12]],tVal===1?'#4060c0':tVal===3?'#a87848':'#9a9a9a');
   };
   for(let sum=minX+minY;sum<maxX+maxY;sum++)for(let x=minX;x<maxX;x++){
    const y=sum-x;if(y<minY||y>=maxY)continue;
    const tVal=g.map.tiles[y][x];
    if(tVal===4||tVal===1||tVal===3){
     drawIsoTile(x,y,tVal);
     // Extend room-edge paths/rivers off the screen edge so exits look seamless
     if(x===minX)for(let k=1;k<=4;k++)drawIsoTile(x-k,y,tVal);
     if(x===maxX-1)for(let k=1;k<=4;k++)drawIsoTile(x+k,y,tVal);
     if(y===minY)for(let k=1;k<=4;k++)drawIsoTile(x,y-k,tVal);
     if(y===maxY-1)for(let k=1;k<=4;k++)drawIsoTile(x,y+k,tVal);
    }
   }
  }else{
   c.fillStyle='#0d1f2b';c.fillRect(-5,-5,780,490);
   // Fine distant water marks provide a horizon outside the bounded island.
   for(let i=0;i<80;i++){const x=(i*131)%768,y=(i*67)%432;line(c,x,y,x+5+(i%8),y,'#31536333');}
   for(let sum=-16;sum<70;sum++)for(let x=-8;x<34;x++){const y=sum-x;if(y<-8||y>=34)continue;const s=this.project(x,y);if(s.x<-60||s.x>820||s.y<-50||s.y>490)continue;const inside=x>=0&&y>=0&&x<26&&y<26;let k=inside?g.map.tiles[y][x]:1;if(k===2)k=0;c.drawImage(tile(g.level,k,Math.abs(x*13+y*7)%7),Math.round(s.x)-24,Math.round(s.y));
    if(!inside)continue;
    if(g.map.tiles[y][x]===1&&((x+y)%3===0)){const phase=Math.sin(t*2+x+y);line(c,s.x-9,s.y+12,s.x+4+phase*3,s.y+12,g.level===3?'#ffab5d77':'#7da3b344');}
    if((x===0||y===25||x===25)&&g.map.tiles[y][x]!==1){poly(c,[[s.x-24,s.y+12],[s.x,s.y+24],[s.x,s.y+30],[s.x-24,s.y+18]],'#1c303b');}
   }
  }
  // Rails delineate the waterways without hiding bridge entrances.
  for(let y=1;y<25;y++)if(g.map.tiles[y][12]===1){for(const x of [11.85,14.15]){const s=this.project(x,y+.5);line(c,s.x,s.y,s.x,s.y-6,'#aaa082',2);line(c,s.x-10,s.y-10,s.x+10,s.y,'#3c4448',2);}}
  const things=g.map.props.filter(o=>inRoom(o.x,o.y)).map(o=>({type:'prop',o,depth:o.x+o.y+(o.type==='building'?(o.w+o.h)*.7:0)}));
  g.map.objects.filter(o=>inRoom(o.x,o.y)).forEach(o=>things.push({type:'object',o,depth:o.x+o.y}));
  g.enemies.filter(o=>inRoom(o.x,o.y)).forEach(o=>things.push({type:'enemy',o,depth:o.x+o.y}));
  things.push({type:'player',o:p,depth:p.x+p.y});things.sort((a,b)=>a.depth-b.depth);
  for(const v of things){const o=v.o,s=this.project(o.x,o.y);if(s.x<-240||s.x>1000||s.y<-100||s.y>650)continue;
   if(v.type==='prop')this.prop(o,g.level,p,t);else if(v.type==='object')this.object(o,g,t);else{
    if(o.hp<=0&&o.timer===0&&v.type==='enemy')continue;c.save();if(o.hp<=0){if(Math.floor(t*14)%2===0){c.restore();continue;}c.globalAlpha=.85;}c.fillStyle='#07111c80';c.beginPath();c.ellipse(s.x,s.y-1,o.kind==='boss'?13:10,4,0,0,Math.PI*2);c.fill();
    if(v.type==='player'){const jOff=(p.jumpZ||0)*24;poly(c,[[s.x,s.y-5],[s.x+9,s.y],[s.x,s.y+5],[s.x-9,s.y]],g.data.c64?'#00000033':'#dfb77944');if(!(p.invuln>0&&Math.floor(t*18)%2===0))drawSprite(c,g.data.c64?'ren_c64':'ren',s.x,s.y-jOff,p.angle,p.state,p.step,p.timer,0);if(p.state==='attack'){const vx=Math.cos(p.angle)-Math.sin(p.angle),vy=(Math.cos(p.angle)+Math.sin(p.angle))*.5;line(c,s.x+vx*15,s.y-22+vy*15,s.x+vx*26,s.y-18+vy*25,'#f4e4b5',2);}}
    else{const eSprite=g.data.c64?(o.kind==='boss'?'boss5':'enemy_c64'):(o.kind==='boss'?'boss'+g.level:o.kind);drawSprite(c,eSprite,s.x,s.y,o.angle,o.state,o.step,o.timer,o.hitFlash);if(o.hp>0&&o.hp<o.maxHp){c.fillStyle='#17212c';c.fillRect(s.x-13,s.y-54,26,3);c.fillStyle=o.kind==='boss'?'#e39c61':'#ac6653';c.fillRect(s.x-12,s.y-53,24*o.hp/o.maxHp,1);}if(o.state==='windup'){this.text('!',s.x,s.y-63,'#ffd28b',15,'center');this.glow(s.x,s.y-27,'#f6ad59',20);}}
    c.restore();
   }
  }
  for(const q of g.projectiles){const s=this.project(q.x,q.y,20);if(q.kind==='star'){line(c,s.x-4,s.y,s.x+4,s.y,'#e5dcaf');line(c,s.x,s.y-4,s.x,s.y+4,'#c5dbdc');}else line(c,s.x-q.dx,s.y-q.dy*.5,s.x+q.dx*.5,s.y+q.dy*.25,'#d2b383');}
  for(const q of this.particles){q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.z+=q.vz*dt;q.vz-=dt*55;const s=this.project(q.x,q.y,q.z);c.fillStyle=q.color;c.fillRect(Math.round(s.x),Math.round(s.y),2,2);}this.particles=this.particles.filter(q=>q.life>0);
  this.weather(g,t);if(g.data.c64)c.restore();c.restore();
  // Deliberate dark edges retain focus without blurring pixel art.
  if(!g.data.c64){const vignette=c.createRadialGradient(384,230,190,384,230,440);vignette.addColorStop(0,'#030b1600');vignette.addColorStop(1,'#030b1677');c.fillStyle=vignette;c.fillRect(0,0,768,432);}
  this.hud(g);if(opts.map||!g.data.c64)this.map(g,opts.map);
  if(!opts.map){const o=g.nearestObject();if(o){const s=this.project(o.x,o.y,60);const label=o.type==='relic'?'Recover relic':o.type==='shrine'?'Rest & save':o.type==='guide'?'Speak to Sora':o.type==='node'?'Activate '+['I','II','III'][o.number]:g.bossDefeated?'Break seal / travel':g.bossStarted?'Defeat guardian':'Challenge guardian';c.fillStyle='#0b172be8';const w=label.length*6+31;c.fillRect(s.x-w/2,s.y-2,w,16);this.text('[E] '+label,s.x,s.y,'#f0d9ab',9,'center');}}
 }
 hud(g){const c=this.c,p=g.player;
  if(g.data.c64){
   // Classic 1987 C64 Last Ninja beveled grey HUD frame
   const frame=(x,y,w,h)=>{c.fillStyle='#000000';c.fillRect(x,y,w,h);c.strokeStyle='#9a9a9a';c.lineWidth=4;c.strokeRect(x+2,y+2,w-4,h-4);c.strokeStyle='#505050';c.lineWidth=2;c.strokeRect(x+4,y+4,w-8,h-8);};
   frame(568,0,200,130);frame(568,130,200,238);frame(0,368,768,112);
   this.text('· ENEMY ·',668,14,'#d8d8d8',12,'center');
   const activeEnemy=g.enemies.find(e=>e.hp>0&&dist(e,p)<7);
   const eRatio=activeEnemy?activeEnemy.hp/activeEnemy.maxHp:1;
   c.fillStyle='#202020';c.fillRect(584,42,168,14);
   c.fillStyle='#8c78d8';c.fillRect(584,42,Math.round(168*eRatio),14);c.strokeStyle='#88e0a0';c.lineWidth=2;c.strokeRect(584,42,168,14);
   this.text('· WOUNDS ·',668,74,'#d8d8d8',12,'center');
   c.fillStyle='#d86050';c.fillRect(584,100,Math.round(168*p.hp/100),10);
   this.text('· USING ·',668,148,'#d8d8d8',12,'center');
   line(c,648,195,688,175,'#d8d8d8',2);line(c,644,197,650,194,'#e0a060',3); // Katana icon
   this.text('KATANA',668,208,'#88e0a0',10,'center');
   this.text('· HOLDING ·',668,248,'#d8d8d8',12,'center');
   for(let i=0;i<3;i++){const rx=636+i*32;poly(c,[[rx,282],[rx+6,290],[rx,298],[rx-6,290]],g.relics.includes(i)?'#f0d080':'#303030');}
   this.text('RELICS: '+g.relics.length+'/3',668,312,'#f0d080',10,'center');
   // Bottom bar: Power emblem, Weaponry, Logo
   c.fillStyle='#d87868';c.fillRect(24,384,96,60);c.strokeStyle='#ffffff';c.lineWidth=3;c.strokeRect(32,392,80,44);
   this.text('· POWER ·',72,456,'#d8d8d8',11,'center');
   this.text('· WEAPONRY ·',280,456,'#d8d8d8',11,'center');
   this.text('SHURIKEN x'+String(p.stars).padStart(2,'0'),280,410,'#d8d8d8',13,'center');
   this.text('THE',630,384,'#8878d8',12,'center');
   this.text('LAST',630,404,'#808080',16,'center');
   this.text('NINJA',630,428,'#8878d8',26,'center');
   return;
  }
  c.fillStyle='#0a1624';c.fillRect(0,432,768,48);line(c,0,432,768,432,'#7b725c');line(c,0,434,768,434,'#263944');
  drawSprite(c,'ren',24,485,Math.PI/4,'idle',0,0,0);line(c,48,438,48,474,'#4c514d');
  this.text('VITALITY',60,440,'#9aa7a5',8);for(let i=0;i<10;i++){c.fillStyle=p.hp>i*10?'#dba16a':'#263746';c.fillRect(60+i*12,452,10,7);if(p.hp>i*10){c.fillStyle='#f2c488';c.fillRect(61+i*12,452,8,2);}}
  c.fillStyle='#243643';c.fillRect(60,464,118,3);c.fillStyle='#75a8a2';c.fillRect(60,464,118*p.stamina/100,3);
  this.text('SHURIKEN',201,440,'#9aa7a5',8);this.text('✦  '+String(p.stars).padStart(2,'0'),202,453,'#e3d5b5',14);
  this.text('EMBER RELICS',303,440,'#9aa7a5',8);for(let i=0;i<3;i++){const x=315+i*21;poly(c,[[x,452],[x+5,458],[x,464],[x-5,458]],g.relics.includes(i)?'#f1c17b':'#344855');}
  this.text(g.solved?'MECHANISM AWAKE':'MECHANISM '+g.puzzle.length+'/3',400,440,g.solved?'#a6ccad':'#9aa7a5',8);this.text(g.bossDefeated?'SEAL RELEASED':g.bossStarted?'GUARDIAN AWAKE':'SEAL '+(g.level+1)+' OF 5',400,455,'#e4c69a',10);
  this.text('J sword   K throw   SPACE dodge',746,441,'#a6b5b7',9,'right');this.text('SHIFT guard   E interact   TAB map',746,458,'#81979f',9,'right');
  this.text(String(g.level+1).padStart(2,'0')+' / '+g.data.name.toUpperCase(),16,14,'#e6d9b6',11);this.text(g.data.subtitle,16,31,'#8ba5b0',9);
  const boss=g.enemies.find(e=>e.kind==='boss'&&e.hp>0);if(boss){c.fillStyle='#101d2be6';c.fillRect(230,61,308,25);this.text(g.data.boss,384,64,'#e9c28f',9,'center');c.fillStyle='#593d39';c.fillRect(243,78,282,3);c.fillStyle='#e2a16c';c.fillRect(243,78,282*boss.hp/boss.maxHp,3);}
 }
 map(g,full){const c=this.c,scale=full?11:2.6,ox=full?242:682,oy=full?73:17;
  if(full){c.fillStyle='#06121ced';c.fillRect(0,0,768,432);this.text('THE FIVE-SEAL ROAD',384,26,'#f0d9ac',17,'center');this.text(g.data.name,384,49,'#91aaa9',11,'center');}
  else{c.fillStyle='#0a1727dc';c.fillRect(ox-5,oy-5,78,78);}
  for(let y=0;y<26;y++)for(let x=0;x<26;x++){const tile=g.map.tiles[y][x];c.fillStyle=tile===1?'#1d3c4d':tile===2?'#182935':tile===3?'#ad9267':'#52656a';c.fillRect(ox+x*scale,oy+y*scale,Math.ceil(scale),Math.ceil(scale));}
  for(const o of g.map.objects){if(o.type==='guide'||o.type==='relic'&&g.relics.includes(+o.id.slice(-1)))continue;c.fillStyle=o.type==='relic'?'#f9c676':o.type==='shrine'?'#8cc5b6':o.type==='altar'?'#d8846b':'#bdc7bd';const x=ox+o.x*scale,y=oy+o.y*scale;c.fillRect(x-2,y-2,full?6:3,full?6:3);if(full)this.text(o.type==='node'?['I','II','III'][o.number]:o.type==='relic'?'RELIC':o.type==='shrine'?'SAVE':'ALTAR',x+8,y-3,c.fillStyle,8);}
  c.fillStyle='#fff1c0';c.fillRect(ox+g.player.x*scale-2,oy+g.player.y*scale-2,full?6:4,full?6:4);
  if(full){this.text('YOU  ·  pale gold     RELICS  ·  amber     SHRINE  ·  jade',384,371,'#a9b9b4',9,'center');this.text(g.data.clue,384,394,'#e0c79c',10,'center');this.text('TAB / ESC to return',384,414,'#849ba4',9,'center');}
 }
}
window.EmberRenderer=Renderer;
})();
