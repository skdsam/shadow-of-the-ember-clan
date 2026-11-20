/* Original procedural score: no recordings, samples, or third-party melodies. */
(function(){
'use strict';
class Score{
 constructor(){this.ctx=null;this.musicVolume=.5;this.effectsVolume=.65;this.mode='title';this.level=0;this.step=0;this.next=0;this.timer=null;this.paused=false;this.voices=0;this.c64Version=-1;this.c64State='explore';}
 async start(){if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=.45;this.master.connect(this.ctx.destination);this.music=this.ctx.createGain();this.music.connect(this.master);this.fx=this.ctx.createGain();this.fx.connect(this.master);this.apply();this.noise=this.ctx.createBuffer(1,this.ctx.sampleRate*.22,this.ctx.sampleRate);const d=this.noise.getChannelData(0);let s=9123;for(let i=0;i<d.length;i++){s=(s*16807)%2147483647;d[i]=s/1073741824-1;}}
  if(this.ctx.state==='suspended')await this.ctx.resume();if(!this.timer){this.next=this.ctx.currentTime+.05;this.timer=setInterval(()=>this.schedule(),40);}}
 apply(){if(this.ctx){this.music.gain.setTargetAtTime(this.paused?0:this.musicVolume*.85,this.ctx.currentTime,.08);this.fx.gain.setTargetAtTime(Math.min(1,this.effectsVolume*1.25),this.ctx.currentTime,.03);}}
 setMode(mode,level=0){if(this.mode!==mode||this.level!==level){this.mode=mode;this.level=level;this.step=0;if(this.ctx)this.next=this.ctx.currentTime+.04;}}
 note(midi,start,duration,type='square',volume=.12,bus=this.music,slide=0){if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(440*2**((midi-69)/12),start);if(slide)o.frequency.exponentialRampToValueAtTime(440*2**((midi+slide-69)/12),start+duration);g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(volume,start+.008);g.gain.exponentialRampToValueAtTime(.001,start+duration);o.connect(g);g.connect(bus);o.start(start);o.stop(start+duration+.02);}
 drum(t,vol=.1){if(!this.ctx)return;const s=this.ctx.createBufferSource(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();s.buffer=this.noise;f.type='highpass';f.frequency.value=1800;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+.1);s.connect(f);f.connect(g);g.connect(this.music);s.start(t);s.stop(t+.12);}
 noiseSweep(dur,fStart,fEnd,vol,type='bandpass',bus=this.fx){if(!this.ctx||this.effectsVolume===0)return;const t=this.ctx.currentTime,s=this.ctx.createBufferSource(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();s.buffer=this.noise;f.type=type;f.frequency.setValueAtTime(fStart,t);f.frequency.exponentialRampToValueAtTime(Math.max(40,fEnd),t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(bus);s.start(t);s.stop(t+dur+.02);}
 schedule(until){if(!this.ctx)return;if(this.paused){this.next=this.ctx.currentTime+.05;return;}if(this.next<this.ctx.currentTime-.1)this.next=this.ctx.currentTime+.02;const end=typeof until==='number'?until:this.ctx.currentTime+.16;while(this.next<end){
  const mode=this.mode,ending=mode==='ending',boss=mode==='boss';
  // Determine active C64 track: -1=Auto adaptive, 0=Explore, 1=Battle, 2=Safe/Reward, 3=Intro
  const activeV=this.c64Version>=0?this.c64Version:ending?6:(mode==='title'||mode==='intro')?3:this.c64State==='danger'?7:this.c64State==='battle'||boss?1:this.c64State==='safe'?2:0;
  const useC64=this.level===5||this.previewC64||mode==='title'||mode==='intro'||ending;
  const bpm=useC64?[124,150,108,112,134,106,76,136][activeV]:boss?138:112+this.level*3,beat=60/bpm/4,t=this.next,s=this.step,pattern=EmberCore.LEVELS[this.level].music;
  const chords=[0,0,-5,-3,0,-5,-3,-7],bar=Math.floor(s/16)%8,root=pattern[0]+chords[bar],melody=[0,2,3,1,4,3,2,1,0,1,2,4,3,2,1,2];
  if(useC64){
   const step16=s%16,step32=Math.floor(s/2)%16;
   if(activeV===3){
    // Intro Theme: 112 BPM Vibing Retro Ninja Groove (F#m -> D -> E -> C#m)
    const prog=[0,0,-4,-4,-2,-2,-5,-5][bar],bRoot=42+prog;
    const bHit=[1,0,0,1,0,0,1,0,1,0,1,0,0,0,1,0];
    const bOct=[0,0,0,12,0,0,0,0,0,0,12,0,0,0,7,0];
    const hook=[0,7,10,7,12,10,7,3, 5,7,10,12,15,12,10,7];
    if(bHit[step16])this.note(bRoot+bOct[step16],t,beat*1.4,'sawtooth',.26);
    if(s%2===0){
     const mNote=66+prog+hook[step32];
     this.note(mNote,t,beat*1.65,'triangle',.16,this.music,step32%4===2?2:0);
     this.note(mNote,t+beat*1.5,beat*1.2,'sine',.055);
    }
    this.note(54+prog+[0,3,7,12][s%4],t,beat*.75,'sine',.055);
    if(step16===0||step16===6||step16===8||step16===14)this.note(36,t,.12,'sine',.38,this.music,-22);
    if(step16===4||step16===12)this.drum(t,.18);else if(s%2===1)this.drum(t,.03);
   }else if(activeV===0){
    // Track 1: Wastelands Heroic (124 BPM, E Minor - General Gameplay)
    const prog=[0,0,-2,-2,-4,-4,-5,-2][bar],bRoot=40+prog;
    const bPat=[0,0,12,0,0,7,12,0,0,0,12,0,7,12,7,5];
    const lead=[0,3,5,7,10,7,5,3,7,10,12,10,7,5,3,2];
    this.note(bRoot+bPat[step16],t,beat*.9,'sawtooth',.24);
    if(s%2===0)this.note(64+prog+lead[step32],t,beat*1.75,'square',.11);
    this.note(52+prog+[0,3,7,12][s%4],t,beat*.65,'square',.045);
    if(s%8===0)this.note(36,t,.1,'sine',.36,this.music,-24);
    if(s%8===4)this.drum(t,.18);if(s%2===1)this.drum(t,.035);
   }else if(activeV===1){
    // Track 2: Night Raid (150 BPM, A Minor - Battles & Bosses)
    const prog=[0,0,5,5,7,7,3,5][bar],bRoot=45+prog;
    const bPat=[0,0,12,7,0,10,12,0,3,0,12,7,10,12,15,12];
    const lead=[0,7,12,10,7,5,7,12,15,12,10,7,12,14,15,12];
    this.note(bRoot+bPat[step16],t,beat*.7,'sawtooth',.26);
    this.note(69+lead[s%16],t,beat*.8,'square',.1,this.music,s%4===0?1:0);
    if(s%2===0)this.note(57+prog+[0,7,12,15][Math.floor(s/2)%4],t,beat*1.2,'triangle',.08);
    if(s%16===0||s%16===6||s%16===10)this.note(38,t,.09,'sine',.4,this.music,-26);
    if(s%8===4||s%16===14)this.drum(t,.22);if(s%2===0)this.drum(t,.045);
   }else if(activeV===4){
    // Track 4: Arcade Triumph / Heroic Fanfare (134 BPM, G Mixolydian)
    const prog=[0,0,-2,-2,-7,-7,0,-2][bar],bRoot=43+prog;
    const fanfare=[0,4,7,12,11,9,7,4,0,4,7,10,12,14,12,7];
    if(s%2===0)this.note(bRoot+(s%4===0?0:7),t,beat*1.4,'triangle',.26);
    if(s%2===0)this.note(67+prog+fanfare[step32],t,beat*1.6,'square',.12);
    this.note(55+prog+[0,4,7,10][s%4],t,beat*.7,'square',.045);
    if(s%8===0)this.note(36,t,.12,'sine',.34,this.music,-20);
    if(s%8===4||s%16===14||s%16===15)this.drum(t,.15);
   }else if(activeV===5){
    // Track 5: Shadow Stealth / Suspense Pulse (106 BPM, C# Locrian/Chromatic)
    const pulse=[0,0,1,0,6,0,1,0],pings=[0,1,6,7,12,7,6,1];
    this.note(37+pulse[s%8],t,beat*.45,'triangle',.28);
    if(s%4===0)this.note(49+pulse[s%8],t,beat*.6,'sawtooth',.06);
    if(s%8===2||s%8===5){
     const pNote=73+pings[Math.floor(s/4)%8];
     this.note(pNote,t,beat*2.2,'sine',.14);
     this.note(pNote+12,t+beat*1.5,beat*1.4,'sine',.04);
    }
    if(s%4===2)this.drum(t,.06);
   }else if(activeV===6){
    // Track 6: Dawn Epilogue / Lush Credits Ballad (76 BPM, Ab Lydian)
    const prog=[0,0,2,2,-3,-3,-5,-5][bar],bRoot=44+prog;
    const harp=[0,4,7,11,14,11,7,4],mel=[0,4,7,11,14,12,11,7,4,6,7,11,12,11,9,7];
    if(s%8===0)this.note(bRoot-12,t,beat*7.5,'sine',.32);
    this.note(56+prog+harp[s%8],t,beat*1.5,'triangle',.065);
    if(s%2===0)this.note(68+prog+mel[step32],t,beat*2.8,'sine',.15);
    if(s%16===0)this.note(44+prog,t,beat*14,'triangle',.09);
   }else if(activeV===7){
    // Track 7: Urgent Tension / Low Health (136 BPM, C Harmonic Minor - Smooth, Musical & Easy on the Ear)
    const prog=[0,0,5,5,8,8,7,7][bar],bRoot=36+prog;
    const pulse=[0,0,12,0,3,0,7,0],mel=[0,3,7,8,7,5,3,2,0,3,7,11,12,11,8,7];
    this.note(bRoot+pulse[s%8],t,beat*.9,'triangle',.24);
    if(step16===0||step16===2||step16===8||step16===10)this.note(34,t,.09,'sine',.28,this.music,-14); // Soft deep heartbeat
    if(s%2===0){
     const mNote=60+mel[step32];
     this.note(mNote,t,beat*1.7,'triangle',.13);
     this.note(mNote-12,t+beat*1.2,beat*1.4,'sine',.045);
    }
    if(s%8===4)this.drum(t,.11);else if(s%2===1)this.drum(t,.025);
   }else{
    // Track 3: Safe Sanctuary & Rewards (108 BPM, F Major9 - Bright, Warm Lute & Flute Chimes)
    const prog=[0,0,-3,-3,-7,-7,-5,-5][bar],bRoot=41+prog;
    const lute=[0,4,7,11,14,11,7,4],flute=[0,2,4,7,9,12,9,7,4,7,9,14,12,9,7,4];
    if(s%4===0)this.note(bRoot+(s%8===4?7:0),t,beat*3.2,'sine',.28);
    this.note(53+prog+lute[s%8],t,beat*1.4,'triangle',.075);
    if(s%2===0)this.note(65+prog+flute[step32],t,beat*1.8,'square',.055);
    if(s%8===2||s%8===6)this.drum(t,.025);
   }
   this.next+=beat;this.step++;continue;
  }
  if(s%2===0)this.note(root-12+(s%8===6?7:0),t,beat*1.75,'triangle',.26);
  if(s%4===0)this.note(pattern[melody[Math.floor(s/2)%16]]+chords[bar]+(ending?12:0),t,beat*3.3,'square',.065);
  this.note(root+12+[0,7,12,7][s%4],t,beat*.8,'triangle',.07);
  if(!ending){if(s%8===0)this.note(38,t,.13,'sine',.34,this.music,-20);if(s%8===4)this.drum(t,.12);if(s%2===1)this.drum(t,.026);}
  if(boss&&s%4===2)this.note(root-12,t,beat*1.6,'sawtooth',.055);this.next+=beat;this.step++;}}
 effect(name,note=0){if(!this.ctx||this.effectsVolume===0)return;const t=this.ctx.currentTime;
  const specs={sword:[75,.08,'triangle',.09,-22],throw:[87,.08,'square',.06,-15],dodge:[67,.1,'triangle',.06,-18],hit:[48,.075,'sawtooth',.12,-15],hurt:[40,.16,'sawtooth',.14,-10],guard:[91,.12,'triangle',.2,-3],arrow:[80,.09,'triangle',.06,-20],error:[43,.3,'square',.06,-4],bell:[76+note*5,.8,'sine',.3,0],relic:[84,.32,'triangle',.18,7],save:[72,.6,'sine',.22,12],success:[84,.5,'triangle',.16,7],victory:[72,.65,'triangle',.2,12],stepWood:[44,.045,'triangle',.09,-8],room:[64,.09,'sine',.07,7],death:[48,.45,'sawtooth',.16,-14]};
  const v=specs[name];if(v)this.note(v[0],t,v[1],v[2],v[3],this.fx,v[4]);
  if(name==='sword')this.noiseSweep(.09,3200,700,.11,'bandpass');
  else if(name==='guard'){this.note(98,t+.02,.1,'square',.09,this.fx,2);this.noiseSweep(.05,4800,2200,.09,'highpass');}
  else if(name==='step')this.noiseSweep(.035,900,320,.055,'lowpass');
  else if(name==='hit')this.noiseSweep(.08,1400,240,.14,'lowpass');
  else if(name==='dodge')this.noiseSweep(.11,1800,450,.06,'bandpass');
  else if(name==='death'){
   // Mournful slow descending C64 minor lament over weeping sub-harmony
   const lament=[64,62,60,59,57,52],harm=[40,40,36,36,33,28];
   lament.forEach((m,i)=>{this.note(m,t+i*.25,.42,'triangle',.17,this.fx);this.note(harm[i],t+i*.25,.48,'sine',.12,this.fx);});
  }
  if(['success','victory','save','relic'].includes(name)){this.note(79,t+.1,.5,'triangle',.1,this.fx);this.note(84,t+.22,.6,'triangle',.1,this.fx);}
 }
}
window.EmberScore=Score;
})();
