// Browser click-through of the v8 features (needs Playwright + Chromium: `npm i playwright` or a preinstalled one).
// Starts its own server on a temporary database. Run: node e2e.v8.js
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '..'), PORT = 3880 + Math.floor(Math.random() * 80), BASE = `http://localhost:${PORT}/`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aqf-e2e-'));
const srv = spawn('node', ['--no-warnings', ROOT + '/backend/server.js'], { env: { ...process.env, PORT, DB_SCHEMA: 'test_e2e', DB_SCHEMA_RESET: '1', NODE_ENV: '' }, stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log(c ? '  ok  ' : '  FAIL', m); };
(async () => {
  for (let i = 0; i < 40; i++) { try { await fetch(BASE + 'healthz'); break; } catch { await sleep(150); } }
  const br = await chromium.launch(), errs = [];
  async function open(w = 1360, h = 860) { const c = await br.newContext({ viewport: { width: w, height: h } }), p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.route('**/tile.openstreetmap.org/**', r => r.abort()); await p.route('**/routing.openstreetmap.de/**', r => r.abort()); return p; }
  const signin = async (p, e, pw) => { await p.goto(BASE + '#/signin'); await p.fill('#em', e); await p.fill('#pw', pw); await p.click('#signin [type=submit]'); await p.waitForTimeout(1500); };
  const txt = (p, sel) => p.$eval(sel, e => e.textContent).catch(() => '');

  console.log('A. user: review, flag, report status');
  const u = await open(); await signin(u, 'user@aquafind.com', 'user123');
  await u.goto(BASE + '#/station/s2'); await u.waitForSelector('.reviews .rv-sum');
  await u.click('[data-act=rvopen]'); await u.click('#reviewform [type=submit]'); ok((await txt(u, '#rverr')).includes('rating'), 'review needs a star rating');
  await u.click('.sp:nth-child(5)'); await u.fill('#rvc', 'Spotless tank, quick service.'); await u.click('#reviewform [type=submit]'); await u.waitForTimeout(1200);
  ok((await txt(u, '.rv-avg b')) === '5.0' && (await txt(u, '.rv-list')).includes('Spotless'), 'review posted; average and list update');
  ok((await txt(u, '.d-rate')).includes('5.0'), 'station header shows the rating');
  await u.click('.rv-a [data-act=rvopen]'); await u.click('.sp:nth-child(3)'); await u.click('#reviewform [type=submit]'); await u.waitForTimeout(1200);
  ok((await txt(u, '.rv-avg b')) === '3.0' && (await txt(u, '.rv-avg')).includes('1 review'), 'editing replaces (still 1 review)');
  await u.goto(BASE + '#/station/s1/report'); await u.waitForSelector('#issueform'); await u.check('input[name=iss] >> nth=1'); await u.fill('#rd', 'Closed at 5pm today'); await u.click('#issueform [type=submit]'); await u.waitForTimeout(1200);
  await u.goto(BASE + '#/reports'); await u.click('[data-p=mine]'); await u.waitForTimeout(1200);
  const hist = await txt(u, '.page'); ok(/Pending review/.test(hist) && /My reviews/.test(hist) && /Spotless|3|Edit/.test(hist), 'My history shows report status and my reviews');

  console.log('B. system admin: dashboard + stations');
  const a = await open(); await signin(a, 'super@aquafind.com', 'super123');
  ok(a.url().endsWith('#/admin'), 'superadmin lands in the console'); await a.waitForSelector('.kpis');
  const kp = await a.$$eval('.kpi', els => els.map(e => e.textContent.replace(/\s+/g, ' ')));
  ok(kp.length === 8 && /Water refill stations\s*8/i.test(kp[1]) && /Pending reports\s*2/i.test(kp[6]), 'KPIs: stations 8, pending reports 2 (' + kp[6] + ')');
  await a.click('.adm-side nav a[href="#/admin/stations"]'); await a.waitForSelector('#admmap .leaflet-marker-icon');
  ok((await a.$$('#admmap .leaflet-marker-icon')).length >= 8, 'station map shows pins');
  await a.click('[data-act=stnew]'); await a.fill('#sn', 'Coral Spring'); await a.fill('#sa', 'Mabini St, Surigao City'); await a.fill('#sp', '0917 555 0101'); await a.fill('#sc', '3'); await a.click('#stform [type=submit]'); await a.waitForTimeout(400);
  ok((await txt(a, '#sc-e')).includes('later'), 'station form validates hours');
  await a.fill('#sc', '18'); await a.fill('#sla', '9.8'); await a.fill('#slo', '125.5'); await a.selectOption('#sst', 'low'); await a.click('#stform [type=submit]'); await a.waitForTimeout(1500);
  ok((await txt(a, '.tbl')).includes('Coral Spring') && (await a.$$('.tbl tbody tr')).length === 9, 'station added to table');
  await a.selectOption('select[data-id=s9]', 'out'); await a.waitForTimeout(1200);
  ok((await a.$eval('select[data-id=s9]', e => e.value)) === 'out', 'availability changed from the table');
  await a.click('[data-act=stedit][data-id=s9]'); await a.fill('#sn', 'Coral Spring II'); await a.click('#stform [type=submit]'); await a.waitForTimeout(1200);
  ok((await txt(a, '.tbl')).includes('Coral Spring II'), 'station edited');
  const u2 = await open(); await signin(u2, 'user@aquafind.com', 'user123'); await u2.goto(BASE + '#/stations'); await u2.waitForSelector('.slist');
  ok((await txt(u2, '.slist')).includes('Coral Spring II'), 'new station is visible to users immediately');
  await a.click('[data-act=stdel][data-id=s9]'); await a.click('[data-act=stdelok]'); await a.waitForTimeout(1500);
  ok(!(await txt(a, '.tbl')).includes('Coral Spring') && (await a.$$('.tbl tbody tr')).length === 8, 'station deleted after confirmation');

  console.log('C. system admin: reports, reviews, availability, users');
  await a.click('.adm-side nav a[href="#/admin/reports"]'); await a.waitForSelector('.tabs [data-act=sars]');
  ok((await txt(a, '.tabs')).includes('Pending'), 'report tabs'); await a.click('.tbl [data-act=rstat][data-p=approved] >> nth=0'); await a.waitForTimeout(1200);
  ok((await a.$$('.tbl tbody tr')).length === 1, 'approving moves a report out of Pending');
  await a.click('[data-act=sars][data-p=approved]'); await a.waitForTimeout(400); await a.click('[data-act=srev]'); await a.check('input[value=resolved]'); await a.fill('#rnote', 'Hours fixed.'); await a.click('#repform [type=submit]'); await a.waitForTimeout(1200);
  await a.click('[data-act=sars][data-p=resolved]'); await a.waitForTimeout(400); ok((await txt(a, '.tbl')).includes('Hours fixed.'), 'report resolved with a note');
  await u.click('[data-p=recent]'); await u.click('[data-p=mine]'); await u.waitForTimeout(1500); ok(/Hours fixed\./.test(await txt(u, '.page')) && /Resolved/.test(await txt(u, '.page')), 'reporter sees the new status and admin note');
  // a second user flags the review, moderator hides it
  const t = await open(); await t.goto(BASE + '#/signup'); await t.fill('#rn', 'Pat Lee'); await t.fill('#re', 'pat@x.com'); await t.fill('#rp', 'secret1'); await t.fill('#rc', 'secret1'); await t.check('#tc'); await t.click('#signup [type=submit]'); await t.waitForTimeout(1500);
  await t.goto(BASE + '#/station/s2'); await t.waitForSelector('.rv [data-act=rvflag]'); await t.click('.rv [data-act=rvflag]'); await t.waitForTimeout(800);
  await a.click('.adm-side nav a[href="#/admin/reviews"]'); await a.waitForTimeout(300); await a.reload(); await a.waitForSelector('.tabs'); await a.click('.adm-side nav a[href="#/admin/reviews"]');
  ok((await txt(a, '.tabs')).includes('Flagged 1'), 'flagged review is counted'); await a.click('[data-act=rvmod][data-p=hidden]'); await a.waitForTimeout(1200);
  await t.goto(BASE + '#/station/s2'); await t.reload(); await t.waitForSelector('.reviews .rv-sum'); await t.waitForTimeout(800); ok(!(await txt(t, '.reviews')).includes('Spotless') && (await txt(t, '.d-rate')).includes('No reviews'), 'hidden review disappears from public view and rating');
  await a.click('.adm-side nav a[href="#/admin/availability"]'); await a.waitForSelector('.stat-rows'); ok((await a.$$('.tbl tbody tr')).length === 8 && (await txt(a, '.kpis')).includes('Outdated'), 'availability monitor');
  await a.selectOption('#hrs', '6'); await a.waitForTimeout(1000); ok((await txt(a, '.kpis')).includes('no update in 6 h'), 'outdated threshold can be changed');
  await a.click('.adm-side nav a[href="#/admin/users"]'); await a.waitForSelector('#utbl .tbl');
  await a.fill('#uq', 'pat'); await a.waitForTimeout(300); ok((await a.$$('#utbl tbody tr')).length === 1, 'user search filters live');
  await a.click('[data-act=urole]'); await a.selectOption('#rr', 'admin'); await a.selectOption('#rst2', 's4'); await a.click('#roleform [type=submit]'); await a.waitForTimeout(1200); ok((await txt(a, '#utbl')).includes('Station admin') && (await txt(a, '#utbl')).includes('Crystal Clear'), 'role + station assigned');
  await a.click('[data-act=uact]'); await a.click('[data-act=uactok]'); await a.waitForTimeout(1200); ok((await txt(a, '#utbl')).includes('Deactivated'), 'user deactivated');
  await t.goto(BASE + '#/'); await t.reload(); await t.waitForTimeout(1500); ok(t.url().includes('signin'), 'deactivated user is signed out');
  await signin(t, 'pat@x.com', 'secret1'); ok(/deactivated/i.test(await txt(t, '#er')), 'deactivated user sees why they cannot sign in');
  ok((await a.$$('#utbl [data-act=uact]')).length >= 1 && !(await a.$('#utbl tr:has-text("(you)") [data-act=uact]')), 'own row has no deactivate/role buttons');

  console.log('D. access control in the browser');
  const n = await open(); await signin(n, 'user@aquafind.com', 'user123'); await n.goto(BASE + '#/admin/users'); await n.waitForTimeout(800); ok(!n.url().includes('admin'), 'regular user is redirected away from the console');
  const sa = await open(); await signin(sa, 'admin@aquafind.com', 'admin123'); await sa.waitForSelector('.adm'); ok(!(await sa.$('.adm.sup')) && (await txt(sa, '.adm-side')).includes('Followers'), 'station admin still gets the station console');
  await sa.click('.adm-side nav a[href="#/admin/issues"]'); await sa.waitForTimeout(500); ok((await txt(sa, '.tbl')).includes('Pending review') || (await txt(sa, '.page, .adm-main')).includes('No reports'), 'station admin issue list uses statuses');

  console.log('E. phone layout');
  const m = await open(390, 844); await signin(m, 'user@aquafind.com', 'user123'); await m.goto(BASE + '#/station/s1'); await m.waitForSelector('.reviews'); await m.waitForTimeout(500);
  ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.querySelector('#scroll').scrollWidth <= document.querySelector('#scroll').clientWidth + 1), 'no horizontal scroll on a phone');
  const ma = await open(390, 844); await signin(ma, 'super@aquafind.com', 'super123'); for (const s of ['overview', 'stations', 'users', 'reports']) { await ma.goto(BASE + '#/admin/' + s); await ma.waitForTimeout(900); ok(await ma.evaluate(() => document.querySelector('#scroll').scrollWidth <= document.querySelector('#scroll').clientWidth + 1), 'console fits a phone: ' + s); }
  ok(errs.length === 0, 'no script errors ' + errs.slice(0, 3).join('|'));
  console.log(`\n${pass} passed, ${fail} failed`); await br.close(); srv.kill(); fs.rmSync(tmp, { recursive: true, force: true }); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); srv.kill(); process.exit(1); });
