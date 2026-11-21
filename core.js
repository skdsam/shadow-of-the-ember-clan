/* Original deterministic campaign simulation. No DOM or rendering dependencies. */
(function(root){
'use strict';
const LEVELS = [
 {name:'The Drowned Harbour',subtitle:'Where the sea keeps its secrets',region:'harbour',clue:'Open the sluices from sea to shore: II, I, III.',order:[1,0,2],boss:'Harbour Warden',story:'The floodgates yield. Beyond the quay, the bamboo road waits.',floor:['#465558','#3c4c50','#536164'],water:'#183e50',accent:'#ed9c51',music:[50,57,60,62,65,62,60,57]},
 {name:'The Whispering Bamboo',subtitle:'Listen to the wind between the leaves',region:'bamboo',clue:'The wind bends the tallest reed first: III, I, II.',order:[2,0,1],boss:'Reed Stalker',story:'The forest breathes again. Snow gathers on the monastery steps.',floor:['#3d5446','#344b40','#49604c'],water:'#1b4343',accent:'#9fca8b',music:[52,59,62,64,67,64,62,59]},
 {name:'The Bell Monastery',subtitle:'A vow beneath the falling snow',region:'snow',clue:'Ring the bells from earth to sky: I, II, III.',order:[0,1,2],boss:'Silent Abbot',story:'One clear bell breaks the silence. Far below, the Hollow Forge answers.',floor:['#727d87','#65727e','#829099'],water:'#2b5366',accent:'#c9e7ee',music:[45,52,57,59,60,59,57,52]},
 {name:'The Hollow Forge',subtitle:'The mountain has a burning heart',region:'forge',clue:'Cool the heart, then the veins, then the crown: II, III, I.',order:[1,2,0],boss:'Furnace Keeper',story:'The great furnace gutters. Akuro retreats to his citadel.',floor:['#51484a','#423e43','#605052'],water:'#9a3d26',accent:'#ffac4b',music:[43,50,55,58,62,58,55,50]},
 {name:'The Ember Citadel',subtitle:'Before the last light becomes ash',region:'citadel',clue:'Recall our oath in reverse: III, II, I.',order:[2,1,0],boss:'Akuro, the Ash Regent',story:'The last seal breaks. The fire belongs to no master.',floor:['#594d50','#493f47','#65565a'],water:'#512f38',accent:'#f4aa64',music:[48,55,58,60,63,60,58,55]},
 {name:'The Wastelands (C64)',subtitle:'Classic 1987 Isometric Tribute',region:'wastelands',c64:true,clue:'Follow the grey path. Recover 3 relics, activate I, II, III, then challenge the Shogun.',order:[0,1,2],boss:'Shadow Shogun',story:'The classic road is cleared.',floor:['#8ee6a2','#8ee6a2','#9a9a9a'],water:'#4060c0',accent:'#e08878',music:[52,55,57,59,62,64,62,59]}
];
const SIZE=26, TAU=Math.PI*2;
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function createMap(index){
 if(index===5){
  const tiles=Array.from({length:SIZE},(_,y)=>Array.from({length:SIZE},(_,x)=>0));
  const props=[];
  // 3x3 grid of 9x9 rooms connected internally; NO paths lead off the outer world edges
  for(let x=2;x<=22;x++){for(const y of [22,23])tiles[y][x]=4;}
  for(let x=4;x<=22;x++){for(const y of [4,5,12,13])tiles[y][x]=4;}
  for(let y=4;y<=23;y++){for(const x of [4,5,12,13,21,22])tiles[y][x]=4;}
  // River at x=18 with wooden/stone bridges (tile 3) where paths cross
  for(let y=0;y<SIZE;y++)tiles[y][18]=(y===4||y===5||y===12||y===13||y===22||y===23)?3:1;
  // Place boulders and C64 pixel trees strictly on the grass off-path
  const boulders=[[2,20,1.2],[7,19,0.9],[2,10,1.3],[7,15,0.8],[10,10,1.1],[15,15,0.9],[10,2,1.2],[15,7,0.8],[20,19,1.0],[24,20,0.7],[20,10,1.1],[24,2,1.3]];
  boulders.forEach(([x,y,s])=>{props.push({x:x+.5,y:y+.5,type:'boulder',scale:s,w:1,h:1});});
  const trees=[[1,24,0],[8,21,1],[1,15,0],[7,9,1],[10,19,0],[16,24,1],[9,16,0],[16,9,1],[10,7,0],[16,1,1],[19,24,0],[24,15,1],[19,9,0],[24,7,1]];
  trees.forEach(([x,y,v])=>{props.push({x:x+.5,y:y+.5,type:'c64tree',variant:v,w:1,h:1});});
  const objects=[{id:'shrine',type:'shrine',x:2.5,y:21.2},{id:'guide',type:'guide',x:6.5,y:22.5},
  {id:'relic0',type:'relic',x:4.5,y:4.5},{id:'relic1',type:'relic',x:21.5,y:22.5},{id:'relic2',type:'relic',x:21.5,y:12.5},
  {id:'node0',type:'node',number:0,x:3.2,y:13.5},{id:'node1',type:'node',number:1,x:11.2,y:11.2},{id:'node2',type:'node',number:2,x:20.2,y:14.5},
  {id:'food0',type:'food',x:6.1,y:19.5},{id:'food1',type:'food',x:14.1,y:16.5},{id:'food2',type:'food',x:23.1,y:8.5},
  {id:'stars0',type:'stars',x:4.5,y:18.5},{id:'stars1',type:'stars',x:12.5,y:22.5},{id:'stars2',type:'stars',x:13.5,y:4.5},
  {id:'key0',type:'key',x:6.1,y:13.5},{id:'claws0',type:'claws',x:15.5,y:22.5},
  {id:'altar',type:'altar',x:21.5,y:4.5}];
  const spawns=[
   {x:4.5,y:12.5,kind:'sword'},{x:6.5,y:4.5,kind:'archer'},
   {x:12.5,y:22.5,kind:'sword'},{x:14.5,y:13.5,kind:'spear'},{x:12.5,y:4.5,kind:'armour'},
   {x:21.5,y:20.5,kind:'spear'},{x:22.5,y:12.5,kind:'sword'}
  ];
  return{tiles,props,objects,spawns,pathOnly:true};
 }
 const random=rng(8734+index*311), tiles=Array.from({length:SIZE},(_,y)=>Array.from({length:SIZE},(_,x)=>x===0||y===0||x===SIZE-1||y===SIZE-1?2:0));
 const props=[];
 const bridges=index===1?[5,6,17,18]:index===2?[7,8,20,21]:index===3?[6,7,17,18]:index===4?[4,5,16,17]:[7,8,18,19];
 for(let y=1;y<SIZE-1;y++)for(let x=12;x<=13;x++)tiles[y][x]=bridges.includes(y)?3:1;
 if(index===2)for(let y=11;y<16;y++)for(let x=11;x<15;x++)tiles[y][x]=1;
 if(index===3)for(let x=3;x<9;x++)tiles[10][x]=1;
 const layouts=[[[3,6,4,3],[17,6,5,3],[6,11,4,3],[17,21,5,3]],[[2,7,3,2],[17,6,5,3],[6,11,3,3],[17,20,4,2]],[[2,6,6,3],[17,6,6,3],[6,11,4,3],[17,22,5,2]],[[2,6,5,3],[17,6,5,3],[6,12,4,3],[17,22,5,2]],[[2,7,5,3],[17,6,5,3],[6,12,4,3],[19,21,4,3]]];
 const buildings=layouts[index].map(([x,y,w,h])=>({x,y,w,h}));
 buildings.forEach((b,i)=>{props.push({...b,type:'building',variant:i});for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)tiles[y][x]=2;});
 const objects=[{id:'shrine',type:'shrine',x:4.5,y:21.5},{id:'guide',type:'guide',x:6.5,y:22.5},
 {id:'relic0',type:'relic',x:4.5,y:3.5},{id:'relic1',type:'relic',x:21.5,y:19.5},{id:'relic2',type:'relic',x:21.5,y:11.5},
 {id:'node0',type:'node',number:0,x:5.5,y:16.5},{id:'node1',type:'node',number:1,x:9.5,y:8.5},{id:'node2',type:'node',number:2,x:18.5,y:15.5},
 {id:'altar',type:'altar',x:21.5,y:3.5}];
 const objectiveLayouts=[null,[[3.5,4.5],[22.5,22.5],[18.5,10.5],[8.5,20.5],[3.5,12.5],[20.5,15.5]],[[8.5,3.5],[22.5,18.5],[3.5,13.5],[8.5,17.5],[17.5,11.5],[20.5,20.5]],[[3.5,3.5],[22.5,19.5],[18.5,11.5],[9.5,19.5],[3.5,11.5],[22.5,14.5]],[[8.5,4.5],[16.5,19.5],[23.5,10.5],[4.5,16.5],[10.5,10.5],[18.5,14.5]]];
 if(objectiveLayouts[index]){const selected=objects.filter(o=>o.type==='relic'||o.type==='node');selected.forEach((o,i)=>{[o.x,o.y]=objectiveLayouts[index][i];});}
 const spawns=[{x:8.5,y:16.5,kind:'sword'},{x:8.5,y:4.5,kind:'archer'},{x:18.5,y:12.5,kind:'spear'},{x:21.5,y:16.5,kind:index>1?'armour':'sword'},{x:16.5,y:3.5,kind:index>0?'armour':'spear'},{x:4.5,y:15.5,kind:index>0?'spear':'sword'}];
 // Authored decorative silhouettes supplement the seeded small props.
 for(let y=3;y<24;y+=4)for(const x of [1.4,10.7,14.9,24.3])props.push({x,y:y+.5,type:'lantern',w:1,h:1});
 if(index===0){props.push({x:1.4,y:19,type:'boat',w:1,h:1},{x:24.5,y:13,type:'boat',w:1,h:1});}
 for(const [x,y]of [[10.6,7],[14.5,18],[20.5,2]])props.push({x,y,type:index===3?'chimney':'torii',w:1,h:1});
 for(let i=0;i<95;i++){
  let x=1+Math.floor(random()*24),y=1+Math.floor(random()*24);
  if(tiles[y][x]!==0||objects.some(o=>Math.hypot(o.x-x-.5,o.y-y-.5)<2)||spawns.some(o=>Math.hypot(o.x-x-.5,o.y-y-.5)<1.5)||Math.hypot(x-2,y-22)<3)continue;
  // Decorations never seal off navigable tiles; only buildings/water collide.
   props.push({x:x+.5,y:y+.5,type:index===1?'bamboo':index===3?'pipe':random()<.45?'tree':'crate',variant:Math.floor(random()*4),w:1,h:1});
 }
 objects.forEach(o=>{tiles[Math.floor(o.y)][Math.floor(o.x)]=0;});
 return{tiles,props,objects,spawns};
}
function walkable(map,x,y,r=.22){
 for(const dx of [-r,r])for(const dy of [-r,r]){
  const row=map.tiles[Math.floor(y+dy)],t=row&&row[Math.floor(x+dx)];
  if(map.pathOnly){if(t!==3&&t!==4)return false;}
  else if(t!==0&&t!==3&&t!==4)return false;
 }
 return true;
}
function path(map,from,to){
 const sx=Math.floor(from.x),sy=Math.floor(from.y),tx=Math.floor(to.x),ty=Math.floor(to.y);
 if(sx===tx&&sy===ty)return[{x:to.x,y:to.y}];
 const queue=[[sx,sy]],seen=new Set([sy*SIZE+sx]),parent=new Map();let found=false;
 for(let n=0;n<queue.length;n++){
  const [x,y]=queue[n];if(x===tx&&y===ty){found=true;break;}
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,key=ny*SIZE+nx;
   if(nx<0||ny<0||nx>=SIZE||ny>=SIZE||seen.has(key)||!walkable(map,nx+.5,ny+.5))continue;
   seen.add(key);parent.set(key,y*SIZE+x);queue.push([nx,ny]);}
 }
 if(!found)return[];let cur=ty*SIZE+tx,result=[];
 while(cur!==sy*SIZE+sx){result.push({x:cur%SIZE+.5,y:Math.floor(cur/SIZE)+.5});cur=parent.get(cur);if(cur===undefined)return[];}
 return result.reverse();
}
class Game{
 constructor(options={}){this.difficulty=options.difficulty||'normal';this.events=[];this.time=0;this.totalKills=0;this.deaths=0;this.lives=3;this.completed=false;this.loadLevel(0);}
 emit(type,data={}){this.events.push({type,...data});}
 loadLevel(index){
  this.level=index;this.map=createMap(index);this.data=LEVELS[index];this.relics=[];this.foods=[];this.starCaches=[];this.inventory=[];this.puzzle=[];this.shrineCooldown=0;if(index===0||index===5)this.lives=3;this.solved=false;this.bossStarted=false;this.bossDefeated=false;this.projectiles=[];this.effects=[];this.dead=false;this.transitionReady=false;
  this.player={x:index===5?4.5:2.5,y:22.5,jumpZ:0,hp:100,maxHp:100,stamina:100,stars:index===5?0:8,foodBag:0,weapon:'katana',angle:-Math.PI/2,state:'idle',timer:0,cooldown:0,throwCD:0,invuln:0,combo:0,step:0,kills:0};
  this.enemies=this.map.spawns.map((s,i)=>this.enemy(s,i));this.checkpoint=this.snapshot();this.emit('level',{index});
 }
 enemy(s,i){const boss=s.kind==='boss',hp=(boss?145+this.level*22:s.kind==='armour'?70:s.kind==='spear'?48:38)*(this.difficulty==='story'?.7:this.difficulty==='hard'?1.25:1);
  return{...s,id:i,homeX:s.x,homeY:s.y,hp,maxHp:hp,angle:1,state:'idle',timer:0,cooldown:1+i*.3,path:[],pathTimer:0,step:0,hitFlash:0,alert:false,patrol:0,hitDone:false};}
 snapshot(){return{version:1,level:this.level,difficulty:this.difficulty,time:this.time,totalKills:this.totalKills,deaths:this.deaths,player:{...this.player,state:'idle',timer:0,invuln:0},relics:[...this.relics],inventory:[...(this.inventory||[])],foods:[...(this.foods||[])],starCaches:[...(this.starCaches||[])],puzzle:[...this.puzzle],solved:this.solved,bossStarted:this.bossStarted,bossDefeated:this.bossDefeated,enemies:this.enemies.map(e=>({...e,path:[],state:e.hp<=0?'dead':'idle',timer:0,cooldown:1}))};}
 restore(s){
  if(!Game.validSave(s))return false;
  this.difficulty=s.difficulty;this.loadLevel(s.level);this.time=s.time||0;this.totalKills=s.totalKills||0;this.deaths=s.deaths||0;
  this.player={...this.player,...s.player,state:'idle',timer:0,invuln:1};this.relics=[...s.relics];this.inventory=[...(s.inventory||[])];this.foods=[...(s.foods||[])];this.starCaches=[...(s.starCaches||[])];this.puzzle=[...s.puzzle];this.solved=!!s.solved;this.bossStarted=!!s.bossStarted;this.bossDefeated=!!s.bossDefeated;
  this.enemies=s.enemies.map(e=>({...e,path:[],pathTimer:0,state:e.hp<=0?'dead':'idle',timer:0,cooldown:1}));this.checkpoint=JSON.parse(JSON.stringify(s));return true;
 }
 static validSave(s){return !!(s&&s.version===1&&Number.isInteger(s.level)&&s.level>=0&&s.level<=5&&['story','normal','hard'].includes(s.difficulty)&&s.player&&Number.isFinite(s.player.x)&&Number.isFinite(s.player.y)&&s.player.x>0&&s.player.x<25&&s.player.y>0&&s.player.y<25&&Number.isFinite(s.player.hp)&&Array.isArray(s.enemies)&&s.enemies.length<=10&&s.enemies.every(e=>e&&Number.isFinite(e.x)&&Number.isFinite(e.y)&&Number.isFinite(e.hp))&&Array.isArray(s.relics)&&s.relics.every(x=>Number.isInteger(x)&&x>=0&&x<=2)&&Array.isArray(s.puzzle)&&s.puzzle.length<=3&&s.puzzle.every(x=>Number.isInteger(x)&&x>=0&&x<=2));}
 move(e,dx,dy){
  const shrine=e!==this.player&&this.map.objects.find(o=>o.type==='shrine');
  const lockedBridge=e===this.player&&this.map.pathOnly&&!this.inventory?.includes('key');
  if(walkable(this.map,e.x+dx,e.y)&&(!shrine||Math.hypot(e.x+dx-shrine.x,e.y-shrine.y)>=3.5)&&(!lockedBridge||e.x+dx<17.6))e.x+=dx;
  else if(lockedBridge&&e.x+dx>=17.6&&!this._keyWarned){this._keyWarned=true;this.emit('message',{text:'Bridge locked · Find the Iron Key to cross East'});}
  if(walkable(this.map,e.x,e.y+dy)&&(!shrine||Math.hypot(e.x-shrine.x,e.y+dy-shrine.y)>=3.5))e.y+=dy;
 }
 nearestObject(){return this.map.objects.filter(o=>!(o.type==='relic'&&this.relics.includes(+o.id.slice(-1)))&&!(o.type==='food'&&this.foods.includes(o.id))&&!(o.type==='stars'&&this.starCaches.includes(o.id))&&!(o.type==='key'&&this.inventory.includes('key'))&&!(o.type==='claws'&&this.inventory.includes('claws'))).map(o=>({o,d:dist(o,this.player)})).filter(v=>v.d<(v.o.type==='food'||v.o.type==='shrine'||v.o.type==='key'||v.o.type==='claws'||v.o.type==='node'?1.9:1.55)).sort((a,b)=>a.d-b.d)[0]?.o;}
 interact(){
  if(this.dead)return;const o=this.nearestObject();if(!o){this.emit('message',{text:'Explore the path for relics, Iron Key, Dragon Nails, or apples.'});return;}
  if(o.type==='food'){if(!this.foods.includes(o.id)){this.foods.push(o.id);this.player.foodBag=(this.player.foodBag||0)+1;this.emit('effect',{name:'relic'});this.emit('message',{text:`Stored apple in HOLDING (${this.player.foodBag}) · Press [H] to eat`});}return;}
  if(o.type==='stars'){if(!this.starCaches.includes(o.id)){this.starCaches.push(o.id);this.player.stars=Math.min(15,this.player.stars+5);this.emit('effect',{name:'relic'});this.emit('message',{text:`Found Ninja Stars (+5) · ${this.player.stars} total [K]`});}return;}
  if(o.type==='key'){if(!this.inventory.includes('key')){this.inventory.push('key');this.emit('effect',{name:'relic'});this.emit('message',{text:'Found Iron Key! You can now cross the eastern river bridges.'});}return;}
  if(o.type==='claws'){if(!this.inventory.includes('claws')){this.inventory.push('claws');this.emit('effect',{name:'relic'});this.emit('message',{text:'Found Dragon Nails! Added to WEAPONRY & HOLDING.'});}return;}
  if(o.type==='guide'){this.emit('dialogue',{title:'Sora · shrine keeper',text:this.data.clue+' Recover the three ember relics, then challenge the guardian at the northern altar. Rest at the lantern shrine to save your journey.'});return;}
  if(o.type==='shrine'){
   if(this.shrineCooldown>0){const m=Math.floor(this.shrineCooldown/60),s=Math.ceil(this.shrineCooldown%60);this.emit('effect',{name:'error'});this.emit('message',{text:`The shrine rests · Pray again in ${m}:${String(s%60).padStart(2,'0')} (or next level)`});return;}
   this.player.hp=100;this.player.stamina=100;if(this.level!==5)this.player.stars=8;this.shrineCooldown=300;this.checkpoint=this.snapshot();this.emit('save');this.emit('message',{text:'You pray at the shrine · Full health restored (5:00 cooldown)'});this.emit('effect',{name:'save'});return;
  }
  if(o.type==='relic'){const n=+o.id.slice(-1);if(!this.relics.includes(n)){this.relics.push(n);this.emit('effect',{name:'relic'});this.emit('message',{text:`Ember relic recovered · ${this.relics.length} / 3`});}return;}
  if(o.type==='node'){
   if(this.solved){this.emit('message',{text:'The seal mechanism is awake.'});return;}
   if(this.data.order[this.puzzle.length]===o.number){this.puzzle.push(o.number);this.emit('effect',{name:'bell',note:o.number});if(this.puzzle.length===3){this.solved=true;this.emit('message',{text:'The mechanism awakens. Recover all three relics and seek the northern altar.'});this.emit('effect',{name:'success'});}else this.emit('message',{text:`The stone answers · ${this.puzzle.length} / 3`});}
   else{this.puzzle=[];this.emit('effect',{name:'error'});this.emit('message',{text:'The stones fall silent. '+this.data.clue});}return;
  }
  if(o.type==='altar'){
   if(this.bossDefeated){this.transitionReady=true;this.emit('travel',{text:this.data.story});return;}
   if(this.level===5&&!this.inventory.includes('claws')){this.emit('message',{text:'Need Dragon Nails to break the northern altar seal!'});return;}
   if(this.relics.length<3||!this.solved){this.emit('message',{text:`Altar sealed. Relics ${this.relics.length}/3 · mechanism ${this.solved?'awake':'asleep'}. ${this.data.clue}`});return;}
   if(!this.bossStarted){this.bossStarted=true;this.enemies.push(this.enemy({x:22.5,y:4.5,kind:'boss'},99));this.emit('boss',{name:this.data.boss});this.emit('message',{text:this.data.boss+' awakens. Keep moving. Watch the windup.'});}
  }
 }
 advance(){if(!this.transitionReady)return false;if(this.level===4){this.completed=true;this.emit('complete');}else this.loadLevel(this.level+1);return true;}
 retry(){if(this.lives<=0){const lvl=this.level;this.loadLevel(lvl);this.lives=3;this.emit('message',{text:'All lives lost · Restarting level with 3 lives.'});return;}const s=JSON.parse(JSON.stringify(this.checkpoint)),deaths=this.deaths,lives=this.lives;this.restore(s);this.deaths=deaths;this.lives=lives;this.player.invuln=2;this.emit('message',{text:`The ember endures · ${this.lives} ${this.lives===1?'life':'lives'} remaining.`});}
 target(e,range){return this.enemies.filter(n=>n.hp>0&&dist(n,e)<range&&(!this.map.pathOnly||(Math.floor(n.x/9)===Math.floor(e.x/9)&&Math.floor(n.y/9)===Math.floor(e.y/9)))).sort((a,b)=>dist(a,e)-dist(b,e))[0];}
 switchWeapon(){
  const p=this.player,avail=['katana'];
  if(p.stars>0)avail.push('stars');
  if(this.inventory?.includes('claws'))avail.push('claws');
  p.weapon=avail[(avail.indexOf(p.weapon||'katana')+1)%avail.length];
  const names={katana:'Katana Sword',stars:'Ninja Stars (Shuriken)',claws:'Dragon Nails'};
  this.emit('effect',{name:'guard'});
  this.emit('message',{text:`Equipped: ${names[p.weapon]}`});
  return p.weapon;
 }
 eatFood(){
  const p=this.player;if(this.dead)return false;
  if(!p.foodBag){this.emit('effect',{name:'error'});this.emit('message',{text:'No food stored in HOLDING.'});return false;}
  if(p.hp>=100){this.emit('message',{text:'Health is already full.'});return false;}
  p.foodBag--;p.hp=Math.min(100,p.hp+25);this.emit('effect',{name:'relic'});this.emit('message',{text:`Ate fruit · +25% health (${p.foodBag} left)`});return true;
 }
 attack(){const p=this.player;if(this.dead||p.cooldown>0||p.state==='dodge')return;if(p.weapon==='stars'&&p.stars>0){this.throwStar();if(p.stars<=0)p.weapon='katana';return;}const target=this.target(p,2.1);if(target)p.angle=Math.atan2(target.y-p.y,target.x-p.x);p.state='attack';p.timer=.34;p.cooldown=.43;p.combo=(p.combo+1)%3;p.hitDone=false;this.emit('effect',{name:'sword'});}
 throwStar(){const p=this.player;if(this.dead||p.throwCD>0||p.state==='dodge')return;if(!p.stars){this.emit('message',{text:'No shuriken. Rest at a shrine to replenish them.'});return;}
  const target=this.target(p,8);if(target)p.angle=Math.atan2(target.y-p.y,target.x-p.x);p.stars--;p.throwCD=.45;this.projectiles.push({x:p.x,y:p.y,rx:Math.floor(p.x/9),ry:Math.floor(p.y/9),dx:Math.cos(p.angle)*10,dy:Math.sin(p.angle)*10,life:1.2,owner:'player',kind:'star',damage:24});this.emit('effect',{name:'throw'});}
 dodge(input={}){const p=this.player;if(this.dead||p.stamina<30||p.state==='dodge'||p.state==='attack')return;const moving=Math.hypot(input.x||0,input.y||0)>.01;let dx=moving?input.x:Math.cos(p.angle),dy=moving?input.y:Math.sin(p.angle),len=Math.hypot(dx,dy);p.dodgeX=dx/len;p.dodgeY=dy/len;p.angle=Math.atan2(p.dodgeY,p.dodgeX);p.state='dodge';p.timer=.42;p.dodgeDur=.42;p.jumpZ=0;p.invuln=.45;p.stamina-=30;this.emit('effect',{name:'dodge'});}
 hurtPlayer(amount,source){const p=this.player;if(p.invuln>0||this.dead)return false;
  const a=Math.atan2(source.y-p.y,source.x-p.x),dot=Math.cos(a-p.angle);
  if(p.state==='guard'&&dot>-.2&&p.stamina>=12){p.stamina=Math.max(0,p.stamina-12);this.emit('effect',{name:'guard'});this.emit('impact',{x:p.x,y:p.y,color:'#eed8a3'});return false;}
  p.hp=Math.max(0,p.hp-amount*(this.difficulty==='story'?.5:this.difficulty==='hard'?1.35:1));p.invuln=.7;this.emit('effect',{name:'hurt'});this.emit('impact',{x:p.x,y:p.y,color:'#e57952'});if(p.state!=='attack'){p.state='hurt';p.timer=.18;}
  if(p.hp<=0){this.dead=true;p.state='dead';this.deaths++;this.lives=Math.max(0,(this.lives??3)-1);this.emit('death');}return true;
 }
 hurtEnemy(e,amount){if(e.hp<=0)return;e.hp=Math.max(0,e.hp-amount);e.hitFlash=.15;e.alert=true;this.emit('impact',{x:e.x,y:e.y,color:e.kind==='boss'?'#ffc778':'#d38c69'});this.emit('effect',{name:'hit'});
  if(e.hp<=0){e.state='dead';e.timer=1.6;this.player.kills++;this.totalKills++;this.player.stamina=Math.min(100,this.player.stamina+12);if(e.kind==='boss'){this.bossDefeated=true;this.player.hp=Math.min(100,this.player.hp+35);this.emit('bossDefeated');this.emit('message',{text:'The guardian falls. Return to the altar [E] to break the seal.'});this.emit('effect',{name:'victory'});}else if(e.id%2===0){this.player.stars=Math.min(12,this.player.stars+1);}}
 }
 update(dt,input={}){
  dt=Math.min(.04,Math.max(0,dt));if(this.dead||this.completed||this.transitionReady)return;this.time+=dt;this.shrineCooldown=Math.max(0,this.shrineCooldown-dt);const p=this.player;
  p.cooldown=Math.max(0,p.cooldown-dt);p.throwCD=Math.max(0,p.throwCD-dt);p.invuln=Math.max(0,p.invuln-dt);p.timer=Math.max(0,p.timer-dt);p.stamina=Math.min(100,p.stamina+dt*(p.state==='guard'?4:23));
  if(p.state==='attack'){
   if(!p.hitDone&&p.timer<.2){p.hitDone=true;const mult=p.weapon==='claws'?1.4:1;for(const e of this.enemies){const d=dist(p,e),a=Math.atan2(e.y-p.y,e.x-p.x);if(d<1.65&&Math.cos(a-p.angle)>-.1&&this.lineClear(p,e))this.hurtEnemy(e,Math.round((p.combo===0?29:22)*mult));}}
   if(p.timer===0)p.state='idle';
  }else if(p.state==='dodge'){
   const prog=1-p.timer/(p.dodgeDur||.42);p.jumpZ=Math.sin(prog*Math.PI)*1.15;
   const nx=p.x+p.dodgeX*dt*6.2,ny=p.y+p.dodgeY*dt*6.2;
   const row=this.map.tiles[Math.floor(ny)],t=row&&row[Math.floor(nx)];
   const overWater=this.map.pathOnly&&t===1&&p.jumpZ>.25;
   if(walkable(this.map,nx,ny)||(!this.map.pathOnly&&nx>1&&nx<SIZE-1&&ny>1&&ny<SIZE-1&&p.jumpZ>.28)||overWater){p.x=nx;p.y=ny;}
   else this.move(p,p.dodgeX*dt*6.2,p.dodgeY*dt*6.2);
   if(!p.timer){p.state='idle';p.jumpZ=0;if(!walkable(this.map,p.x,p.y)){for(const [ox,oy] of [[.5,0],[-.5,0],[0,.5],[0,-.5],[1,0],[-1,0],[0,1],[0,-1]])if(walkable(this.map,p.x+ox,p.y+oy)){p.x+=ox;p.y+=oy;break;}}}
  }
  else if(p.state==='hurt'){if(!p.timer)p.state='idle';}
  else{
   const ix=input.x||0,iy=input.y||0,len=Math.hypot(ix,iy);if(input.guard){p.state='guard';const t=this.target(p,4);if(t)p.angle=Math.atan2(t.y-p.y,t.x-p.x);}
   else p.state=len>.01?'walk':'idle';if(len>.01){if(!input.guard)p.angle=Math.atan2(iy,ix);this.move(p,ix/Math.max(1,len)*dt*(input.guard?1.15:3.1),iy/Math.max(1,len)*dt*(input.guard?1.15:3.1));p.step+=dt*9;}
  }
  for(const e of this.enemies){
   e.hitFlash=Math.max(0,e.hitFlash-dt);if(e.hp<=0){e.timer=Math.max(0,e.timer-dt);continue;}e.timer=Math.max(0,e.timer-dt);e.cooldown=Math.max(0,e.cooldown-dt);e.pathTimer-=dt;
   const shrine=this.map.objects.find(o=>o.type==='shrine');
   const inSanctuary=shrine&&dist(shrine,p)<3.5;
   const sameRoom=!this.map.pathOnly||(Math.floor(e.x/9)===Math.floor(p.x/9)&&Math.floor(e.y/9)===Math.floor(p.y/9));
   const d=dist(e,p);
   if(shrine&&dist(e,shrine)<3.5){const a=Math.atan2(e.y-shrine.y,e.x-shrine.x);e.x=shrine.x+Math.cos(a)*3.55;e.y=shrine.y+Math.sin(a)*3.55;e.alert=false;}
   if(!sameRoom||inSanctuary){e.alert=false;e.state='idle';continue;}
   else if((d<7.5&&this.lineClear(e,p))||this.map.pathOnly)e.alert=true;if(d>13)e.alert=false;
   if(e.state==='windup'){
    if(e.timer===0){e.state='attack';e.timer=.22;if(e.kind==='archer'){let a=Math.atan2(p.y-e.y,p.x-e.x);this.projectiles.push({x:e.x,y:e.y,rx:Math.floor(e.x/9),ry:Math.floor(e.y/9),dx:Math.cos(a)*6,dy:Math.sin(a)*6,life:1.8,owner:'enemy',kind:'arrow',damage:12});this.emit('effect',{name:'arrow'});}else if(d<(e.kind==='boss'?2.1:e.kind==='spear'?1.9:1.45)&&this.lineClear(e,p))this.hurtPlayer(e.kind==='boss'?22:e.kind==='armour'?19:13,e);e.cooldown=e.kind==='boss'?.45:.65;}continue;
   }
   if(e.state==='attack'){if(!e.timer)e.state='idle';continue;}
   if(e.alert){e.angle=Math.atan2(p.y-e.y,p.x-e.x);const range=e.kind==='archer'?5.5:e.kind==='boss'?1.7:e.kind==='spear'?1.55:1.15;
    if(d<range&&e.cooldown===0&&this.lineClear(e,p)){e.state='windup';e.timer=e.kind==='boss'?.42:.35;continue;}
    if(d>range*.65){if(e.pathTimer<=0){e.path=path(this.map,e,p);e.pathTimer=.2;}let target=e.path[0]||(this.lineClear(e,p)?p:null);if(target){if(e.path.length&&dist(e,target)<.18){e.path.shift();target=e.path[0]||p;}if(target){const dx=target.x-e.x,dy=target.y-e.y,l=Math.hypot(dx,dy),speed=e.kind==='boss'?2.15:e.kind==='armour'?1.4:1.85;e.angle=Math.atan2(dy,dx);this.move(e,dx/(l||1)*dt*speed,dy/(l||1)*dt*speed);e.state='walk';e.step+=dt*7;}}}else e.state='idle';
   }else{e.state='idle';e.patrol+=dt;if(e.patrol>3.8){e.patrol=0;e.angle+=Math.PI/2;}}
  }
  for(const q of this.projectiles){q.life-=dt;const steps=3;for(let i=0;i<steps;i++){
   q.x+=q.dx*dt/steps;q.y+=q.dy*dt/steps;
   if(!walkable(this.map,q.x,q.y,.05)||(this.map.pathOnly&&(Math.floor(q.x/9)!==q.rx||Math.floor(q.y/9)!==q.ry||Math.floor(q.x/9)!==Math.floor(p.x/9)||Math.floor(q.y/9)!==Math.floor(p.y/9)))){q.life=0;break;}
   if(q.owner==='player'){const e=this.enemies.find(e=>e.hp>0&&dist(e,q)<.45);if(e){this.hurtEnemy(e,q.damage);q.life=0;break;}}
   else if(dist(p,q)<.4){this.hurtPlayer(q.damage,q);q.life=0;break;}
  }}this.projectiles=this.projectiles.filter(q=>q.life>0);
 }
 lineClear(a,b){const d=dist(a,b),steps=Math.ceil(d*4);for(let i=1;i<steps;i++){const t=i/steps;if(!walkable(this.map,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,.05))return false;}return true;}
}
const api={Game,LEVELS,SIZE,rng,dist,path,walkable,clamp,TAU};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.EmberCore=api;
})(typeof window!=='undefined'?window:globalThis);
