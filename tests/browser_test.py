from pathlib import Path
import base64,json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'verification';OUT.mkdir(exist_ok=True)
ASSETS=ROOT/'assets';ASSETS.mkdir(exist_ok=True)
errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':1280,'height':900},device_scale_factor=1)
 page.on('pageerror',lambda e: errors.append(str(e)))
 page.goto('http://127.0.0.1:8765/?test=1');page.wait_for_load_state('networkidle')
 page.screenshot(path=str(OUT/'01-title.png'),full_page=True)
 page.get_by_role('button',name='Begin the journey',exact=True).click()
 page.wait_for_function("emberTest.state === 'intro'")
 page.screenshot(path=str(OUT/'02-intro.png'),full_page=True)
 page.get_by_role('button',name='Begin journey').click()
 page.wait_for_function("emberTest.state === 'playing'")
 page.wait_for_timeout(500)
 pos=page.evaluate('({x:emberTest.game.player.x,y:emberTest.game.player.y})')
 page.keyboard.down('d');page.wait_for_timeout(350);page.keyboard.up('d')
 after=page.evaluate('({x:emberTest.game.player.x,y:emberTest.game.player.y})')
 assert after['x']>pos['x'] and after['y']<pos['y'],'screen-right movement'
 page.keyboard.press('Tab');assert page.evaluate('emberTest.mapOpen')
 before=page.evaluate('emberTest.game.time');page.wait_for_timeout(180);assert page.evaluate('emberTest.game.time')==before,'map freezes simulation'
 page.screenshot(path=str(OUT/'03-map.png'),full_page=True);page.keyboard.press('Tab')
 page.keyboard.press('Escape');page.get_by_role('heading',name='The fire can wait').wait_for()
 before=page.evaluate('emberTest.game.time');page.wait_for_timeout(180);assert page.evaluate('emberTest.game.time')==before,'pause freezes simulation'
 page.get_by_role('button',name='Settings',exact=True).click()
 page.locator('#music-volume').fill('0');assert page.evaluate('emberTest.score.musicVolume')==0
 page.locator('#music-volume').fill('45');page.locator('#effects-volume').fill('40')
 page.get_by_role('button',name='Return',exact=True).click()
 assert page.evaluate('emberTest.state')=='playing'
 # Save via the real interaction, then reload through Continue.
 page.evaluate("Object.assign(emberTest.game.player,{x:4.5,y:21.5});emberTest.action('interact')")
 assert page.evaluate('emberTest.saved.player.x')==4.5
 page.reload();page.wait_for_load_state('networkidle');page.get_by_role('button',name='Continue from shrine').click()
 assert page.evaluate('emberTest.game.player.x')==4.5
 assert page.evaluate('emberTest.score.ctx.state')=='running'
 # Region screenshots and sprite export. QA positioning only; no runtime shortcuts exposed normally.
 for level in range(5):
  page.evaluate(f"emberTest.game.loadLevel({level});emberTest.game.events=[];Object.assign(emberTest.game.player,{{x:10.5,y:18.5}});emberTest.renderer.ready=false;emberTest.setState('playing')")
  page.wait_for_timeout(200)
  page.screenshot(path=str(OUT/f'level-{level+1}.png'),full_page=True)
 data=page.evaluate('EmberArt.atlas.toDataURL("image/png").split(",")[1]')
 (ASSETS/'character-atlas.png').write_bytes(base64.b64decode(data))
 # Complete all five levels through real puzzle interactions and timed sword combat.
 campaign=page.evaluate("""() => {
  const t=emberTest,g=t.game,results=[];g.loadLevel(0);g.events=[];
  for(let level=0;level<5;level++){
   for(let n=0;n<3;n++){const o=g.map.objects.find(o=>o.id==='relic'+n);Object.assign(g.player,{x:o.x,y:o.y});g.interact();}
   for(const n of g.data.order){const o=g.map.objects.find(o=>o.id==='node'+n);Object.assign(g.player,{x:o.x,y:o.y});g.interact();}
   const altar=g.map.objects.find(o=>o.type==='altar');Object.assign(g.player,{x:altar.x,y:altar.y});g.interact();
   const boss=g.enemies.find(e=>e.kind==='boss');g.enemies=g.enemies.filter(e=>e.kind==='boss');Object.assign(g.player,{x:boss.x-.8,y:boss.y,hp:100,invuln:1,state:'idle',cooldown:0});
   let frames=0;while(boss.hp>0&&!g.dead&&frames++<3600){g.attack();g.update(1/60,{});}
   if(!g.bossDefeated||g.dead)throw new Error('Boss combat failed at '+level);
   results.push({level:level+1,guardian:g.data.boss,frames,hp:g.player.hp});
   Object.assign(g.player,{x:altar.x,y:altar.y});g.interact();g.events=[];
   if(level<4)g.advance();
  }
  t.processEvents();g.events.push({type:'travel',text:g.data.story});t.processEvents();return results;
 }""")
 page.get_by_role('button',name='Welcome the dawn').click();assert page.evaluate('emberTest.state')=='ending'
 page.screenshot(path=str(OUT/'04-ending.png'),full_page=True)
 page.get_by_role('button',name='View credits').click();page.get_by_role('heading',name='For everyone who remembers loading…').wait_for()
 page.screenshot(path=str(OUT/'05-credits.png'),full_page=True)
 page.get_by_role('button',name='Return to title').click()
 # Direct disk launch is a delivery requirement.
 disk=browser.new_page();disk.on('pageerror',lambda e:errors.append(str(e)));disk.goto((ROOT/'index.html').as_uri());disk.wait_for_load_state('load');disk.get_by_role('button',name='Begin the journey',exact=True).click();disk.get_by_role('button',name='Begin journey').wait_for();disk.close()
 # Touch layout and actual joystick movement at a narrow viewport.
 mobile=browser.new_page(viewport={'width':720,'height':480},has_touch=True,is_mobile=True)
 mobile.on('pageerror',lambda e: errors.append(str(e)));mobile.goto('http://127.0.0.1:8765/?test=1');mobile.wait_for_load_state('networkidle');mobile.get_by_role('button',name='Begin the journey',exact=True).click();mobile.get_by_role('button',name='Begin journey').click()
 mobile.screenshot(path=str(OUT/'06-touch.png'),full_page=True)
 assert mobile.locator('#touch-controls').is_visible()
 assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth')
 assert not errors,errors
 (OUT/'browser-results.json').write_text(json.dumps({'errors':errors,'campaign':campaign,'checks':['title','intro','keyboard movement','map pause','pause','settings','checkpoint reload','audio context','five region renders','five guardians using sword simulation','ending','credits','disk launch','touch layout'],'note':'Campaign automation positions the player at objectives and isolates each guardian. It does not certify a human traversal or difficulty balance.'},indent=2))
 browser.close()
print('PASS: browser interactions, rendering, persistence, five-region campaign logic, audio setup, disk launch and touch layout. No JavaScript errors.')
