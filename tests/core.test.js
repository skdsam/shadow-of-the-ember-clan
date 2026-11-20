const assert=require('node:assert/strict');
const {Game,LEVELS,path,walkable,dist}=require('../core.js');
let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
for(let level=0;level<5;level++){
 const g=new Game();g.loadLevel(level);
 for(const o of g.map.objects){check(walkable(g.map,o.x,o.y),`level ${level} object ${o.id} is walkable`);check(path(g.map,g.player,o).length>0,`level ${level} ${o.id} reachable`);}
 check(!walkable(g.map,-1,-1),'bounds collide');
 const initial={x:g.player.x,y:g.player.y};for(let i=0;i<60;i++)g.update(1/60,{x:1,y:0});check(g.player.x>initial.x+.5,'movement responds');
 // Real sword timing and range; hit must be delayed until the windup passes.
 const enemy=g.enemies[0];g.player.x=enemy.x-.7;g.player.y=enemy.y;enemy.cooldown=10;const hp=enemy.hp;g.attack();check(enemy.hp===hp,'sword has windup');for(let i=0;i<15;i++)g.update(1/60,{});check(enemy.hp<hp,'sword hits a nearby enemy');
 const oldHP=g.player.hp;g.player.state='guard';g.player.angle=0;g.player.invuln=0;g.hurtPlayer(20,{x:g.player.x+1,y:g.player.y});check(g.player.hp===oldHP,'directional guard stops frontal hit');check(g.player.stamina<100,'guard consumes stamina');
 g.player.state='idle';g.player.stamina=100;g.dodge({x:0,y:1});check(g.player.invuln>0,'dodge grants invulnerability');g.hurtPlayer(20,{x:0,y:0});check(g.player.hp===oldHP,'dodge avoids damage');
 // Wrong puzzle input resets only puzzle progress.
 const node=g.map.objects.find(o=>o.id==='node'+((LEVELS[level].order[0]+1)%3));Object.assign(g.player,{x:node.x,y:node.y});g.interact();check(g.puzzle.length===0,'incorrect puzzle resets');
 for(const n of LEVELS[level].order){const o=g.map.objects.find(o=>o.id==='node'+n);Object.assign(g.player,{x:o.x,y:o.y});g.interact();}check(g.solved,'ordered puzzle solves');
 for(let n=0;n<3;n++){const o=g.map.objects.find(o=>o.id==='relic'+n);Object.assign(g.player,{x:o.x,y:o.y});g.interact();}check(g.relics.length===3,'relics collect once');g.interact();check(g.relics.length===3,'relic duplication prevented');
 const altar=g.map.objects.find(o=>o.type==='altar');Object.assign(g.player,{x:altar.x,y:altar.y});g.interact();check(g.bossStarted,'guardian unlocked by objectives');const boss=g.enemies.find(e=>e.kind==='boss');check(boss&&boss.hp>0,'guardian spawns');
 // Fight with the actual sword simulation, not direct health mutation.
 g.enemies=g.enemies.filter(e=>e.kind==='boss');Object.assign(g.player,{x:boss.x-.8,y:boss.y,hp:100,invuln:1,state:'idle',cooldown:0});
 let frames=0;while(boss.hp>0&&!g.dead&&frames++<3600){g.attack();g.update(1/60,{});}check(boss.hp===0&&!g.dead,'guardian can be beaten with timed sword attacks');
 Object.assign(g.player,{x:altar.x,y:altar.y});g.interact();check(g.transitionReady,'victory allows travel');check(g.advance(),'travel succeeds');check(level===4?g.completed:g.level===level+1,'correct next level / ending');
}
const g=new Game();g.player.x=4.5;g.player.y=21.5;g.player.hp=30;g.player.stars=0;g.interact();check(g.player.hp===100&&g.player.stars===8,'shrine heals and refills');
const snap=JSON.parse(JSON.stringify(g.checkpoint));check(Game.validSave(snap),'snapshot schema valid');g.hurtPlayer(999,{x:3,y:3});check(g.dead,'lethal damage causes death');g.retry();check(!g.dead&&g.player.hp===100&&g.deaths===1,'retry restores shrine and death counter');
const restored=new Game();check(restored.restore(snap),'checkpoint round-trips');check(dist(restored.player,snap.player)===0,'position persists');check(!restored.restore({version:1,level:99}),'corrupt save rejected');
const locked=new Game();const altar=locked.map.objects.find(o=>o.type==='altar');Object.assign(locked.player,{x:altar.x,y:altar.y});locked.interact();check(!locked.bossStarted,'altar cannot skip objectives');
console.log(`PASS: ${checks} campaign, connectivity, combat, puzzle, checkpoint and progression checks.`);
