/* AquaFind main: hash router, app shell, actions, forms, boot. Loaded last. */
'use strict';
const AUTH = ['signin', 'signup'];
const EMAIL = /^\S+@\S+\.\S+$/;
const TITLES = { home: 'Home', stations: 'Stations', map: 'Map', detail: 'Station', directions: 'Directions', report: 'Report information', reports: 'Community reports', saved: 'Saved stations', notifications: 'Notifications', account: 'Profile', ask: 'AquaBot', admin: 'Admin console', signin: 'Sign in', signup: 'Create account', nf: 'Not found' };

function currentRoute() {
  const h = location.hash.replace(/^#\/?/, ''), [p, qs] = h.split('?'), seg = p.split('/').filter(Boolean), a = seg[0] || '', q = new URLSearchParams(qs || '');
  if (a === '') return { name: 'home', q };
  if (a === 'signin' || a === 'signup') return { name: a, q };
  if (a === 'station') return { name: seg[2] === 'directions' ? 'directions' : seg[2] === 'report' ? 'report' : 'detail', id: seg[1], q };
  if (a === 'map') return { name: 'map', id: seg[1], q };
  if (a === 'admin') return { name: 'admin', sec: seg[1] || 'overview', q };
  if (['stations', 'reports', 'saved', 'notifications', 'account', 'ask'].includes(a)) return { name: a, q };
  return { name: 'nf', q };
}
const routeId = () => currentRoute().id;
function go(h) { if (location.hash === h || (h === '#/' && !location.hash)) { S.anim = 'fade'; render(); } else location.hash = h; }

/* ---------- Shell ---------- */
const NAV = [['home', 'Home', '#/', 'home'], ['map', 'Explore', '#/map', 'map'], ['stations', 'Stations', '#/stations', 'list'], ['reports', 'Community', '#/reports', 'users'], ['saved', 'Saved', '#/saved', 'heart']];
const navKey = n => ({ detail: 'stations', directions: 'stations', report: 'stations' }[n] || n);
/* Download button in the header: shown only in a browser on an Android phone/tablet (not on desktop web, iPhone, or inside the installed app) */
function dlBtn() {
  if (window.Capacitor || !/Android/i.test(navigator.userAgent) || matchMedia('(display-mode: standalone)').matches || PWA.state() === 'installed') return '';
  return `<a class="icon-btn dl-btn" href="/downloads/AquaFind.apk" download="AquaFind.apk" aria-label="Download the Android app" title="Download the Android app">${ico('download', 19)}</a>`;
}
function mast(r) {
  const n = unread(), k = navKey(r.name), u = S.user;
  return `<a class="skip" href="#main" data-act="skip">Skip to content</a><header class="mast"><div class="mast-in"><a class="brand" href="#/">${logo(22)}<span>AquaFind</span></a><span class="mast-title" aria-hidden="true">${esc(TITLES[r.name] || '')}</span>
  <nav class="mnav" aria-label="Main">${NAV.map(t => `<a href="${t[2]}" class="${k === t[0] ? 'on' : ''}" ${k === t[0] ? 'aria-current="page"' : ''}>${t[1]}</a>`).join('')}</nav>
  <div class="mast-r">${dlBtn()}<a class="icon-btn ${k === 'ask' ? 'on' : ''}" href="#/ask" aria-label="Ask AquaBot" title="Ask AquaBot">${ico('spark', 19)}</a>
  <a class="icon-btn bell ${k === 'notifications' ? 'on' : ''}" href="#/notifications" aria-label="Notifications${n ? ', ' + n + ' unread' : ''}">${ico('bell', 19)}${n ? `<b class="badge num">${n > 9 ? '9+' : n}</b>` : ''}</a>
  <div class="acct"><button class="avatar" data-act="menu" aria-haspopup="menu" aria-expanded="false" aria-label="Account menu">${avatar(u, 36)}</button>
    <div class="menu" id="acctmenu" role="menu" hidden><div class="menu-h">${avatar(u, 40)}<span class="menu-t"><b>${esc(u.name)}</b><span>${esc(u.email)}</span></span></div><a role="menuitem" href="#/account">${ico('user', 16)} Profile &amp; settings</a><a role="menuitem" href="#/notifications">${ico('bell', 16)} Notifications</a>${isStaff(u) ? `<a role="menuitem" href="#/admin">${ico('shield', 16)} ${u.role === 'superadmin' ? 'System console' : 'Admin console'}</a>` : ''}<button role="menuitem" data-act="logout">${ico('logout', 16)} Sign out</button></div></div></div></div></header>`;
}
const TAB = [['home', 'Home', '#/', 'home'], ['map', 'Explore', '#/map', 'map'], ['reports', 'Community', '#/reports', 'users'], ['saved', 'Saved', '#/saved', 'heart'], ['account', 'Profile', '#/account', 'user']];
const tabKey = n => ({ stations: 'map', detail: 'map', directions: 'map', report: 'map', notifications: '', ask: '' }[n] ?? n);
const SIDE = [['home', 'Home', '#/', 'home'], ['map', 'Explore', '#/map', 'map'], ['stations', 'Stations', '#/stations', 'list'], ['reports', 'Community', '#/reports', 'users'], ['saved', 'Saved', '#/saved', 'heart'], ['notifications', 'Notifications', '#/notifications', 'bell'], ['ask', 'AquaBot', '#/ask', 'spark'], ['account', 'Profile', '#/account', 'user']];
function sideHtml(r) {
  const k = navKey(r.name), u = S.user, n = unread();
  return `<a class="side-brand" href="#/">${logo(30, { light: true })}<span>AquaFind</span></a>
  <nav class="side-nav" aria-label="Main">${SIDE.map(t => `<a href="${t[2]}" class="${k === t[0] ? 'on' : ''}" ${k === t[0] ? 'aria-current="page"' : ''}>${ico(t[3], 20)}<span>${t[1]}</span>${t[0] === 'notifications' && n ? `<b class="side-badge num">${n > 9 ? '9+' : n}</b>` : ''}</a>`).join('')}${isStaff(u) ? `<a href="#/admin">${ico('shield', 20)}<span>${u.role === 'superadmin' ? 'System console' : 'Admin console'}</span></a>` : ''}</nav>
  <div class="side-foot"><a class="side-user" href="#/account">${avatar(u, 40)}<span><b>${esc(u.name)}</b><small>${esc(u.email)}</small></span></a><button type="button" class="side-out" data-act="logout">${ico('logout', 18)}<span>Sign out</span></button></div>`;
}
function setTabs(r, show) {
  const box = $('#tabs'), ph = $('#phone'); ph.classList.toggle('has-side', !!show);
  if (!show) { box.innerHTML = ''; return; }
  const k = tabKey(r.name), i = TAB.findIndex(t => t[0] === k);
  let nav = $('.tabbar', box);
  if (!nav) {
    box.innerHTML = `<nav class="tabbar" aria-label="Primary"><i class="tab-ind" aria-hidden="true"></i>${TAB.map(t => `<a href="${t[2]}" data-k="${t[0]}">${ico(t[3], 22)}<span>${t[1]}</span></a>`).join('')}</nav>`;
    nav = $('.tabbar', box); nav.dataset.i = i; nav.style.setProperty('--i', Math.max(i, 0));
    box.insertAdjacentHTML('beforeend', '<aside class="sidenav" aria-label="Sidebar"></aside>');
  }
  $('.sidenav', box).innerHTML = sideHtml(r);
  nav.dataset.i = i; nav.style.setProperty('--i', Math.max(i, 0));
  $$('a', nav).forEach(a => { const on = a.dataset.k === k; if (on !== a.classList.contains('on')) a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
}
/* route depth decides the transition: deeper = slide in from the right, shallower = from the left, same level = fade */
const DEPTH = { detail: 1, directions: 1, report: 1, ask: 1, notifications: 1, stations: 1 };
const depthOf = n => DEPTH[n] || 0;
let prevRoute = null;
function viewAnim(r) {
  if (!S.anim) return ''; const how = S.anim; S.anim = null;
  if (how === 'fade') return 'in-fade';
  const d = depthOf(r.name), p = prevRoute ? depthOf(prevRoute) : 0;
  return d > p ? 'in-push' : d < p ? 'in-back' : 'in-fade';
}

function render() {
  const r = currentRoute(), app = $('#app');
  document.title = (TITLES[r.name] || 'AquaFind') + ' · AquaFind';
  if (!S.ready) { app.className = ''; app.innerHTML = loader(); setTabs(r, false); return; }
  if (S.offlineBoot && !S.user) { app.className = 'is-auth'; app.innerHTML = offlineScreen(); setTabs(r, false); return; }
  if (!S.user && !AUTH.includes(r.name)) return location.replace('#/signin');
  if (S.user && AUTH.includes(r.name)) return location.replace(isStaff(S.user) ? '#/admin' : '#/');
  if (r.name === 'admin' && !isStaff(S.user)) return location.replace('#/');
  destroyMap(); closeMenu();
  const mapRoute = r.name === 'map';
  const ac = viewAnim(r);
  if (AUTH.includes(r.name)) { app.className = 'is-auth'; app.innerHTML = V[r.name](); setTabs(r, false); if (ac) app.firstElementChild?.classList.add(ac); }
  else if (r.name === 'admin') {
    const sup = S.user.role === 'superadmin', D = sup ? S.sa : S.ad;
    app.className = 'is-admin'; app.innerHTML = sup ? superView(r.sec) : adminView(r.sec); setTabs(r, false); if (ac) $('.adm-main')?.classList.add(ac);
    if (sup && D.loaded) saAfter(r.sec);
    if (!D.loaded && !D.loading) { D.loading = true; (sup ? loadSuper() : loadAdmin()).then(() => { D.loading = false; if (currentRoute().name === 'admin') { S.anim = 'fade'; renderKeep(); } }).catch(e => { D.loading = false; toast(e.message, 'error'); }); }
  } else {
    app.className = 'is-app' + (mapRoute ? ' is-map' : '');
    app.innerHTML = mast(r) + `<main id="main" tabindex="-1" class="view v-${r.name} ${mapRoute || ['detail', 'directions'].includes(r.name) ? ac.replace(/in-(push|back)/, 'in-fade') : ac}">${(V[r.name] || notFound)()}</main>`;
    setTabs(r, true);
  }
  prevRoute = r.name; afterRender(r);
}
/* An unsaved profile edit must survive any background re-render (alert toggles, photo upload, refreshes). */
const profDirty = () => !!$('#profform') && ($('#pn').value.trim() !== S.user.name || $('#pe').value.trim().toLowerCase() !== S.user.email || $('#pp').value.trim() !== (S.user.phone || ''));
const profDraft = () => profDirty() ? { pn: $('#pn').value, pe: $('#pe').value, pp: $('#pp').value } : null;
function syncProf() { const f = $('#profform'); if (!f) return; const d = profDirty(); $$('[type=submit],[data-act=pcancel]', f).forEach(b => b.disabled = !d); const n = $('#pdirty'); if (n) n.hidden = !d; }
function renderKeep() {
  const sc = $('#scroll'), y = sc.scrollTop, a = document.activeElement?.id, draft = profDraft(); render(); sc.scrollTop = y;
  if (draft && $('#profform')) { Object.entries(draft).forEach(([k, v]) => $('#' + k).value = v); syncProf(); }
  if (a) { const e = document.getElementById(a); if (e && e.matches('input,textarea')) e.focus(); }
}

function afterRender(r) {
  if (S.flash && S.flash.size) { S.flash.forEach(id => $$(`.st[data-sid="${id}"]`).forEach(e => e.classList.add('flash'))); S.flash = null; }
  if (r.name === 'stations' && r.q.has('f')) { S.f = r.q.get('f'); history.replaceState(null, '', '#/stations'); render(); return; }
  if (r.name === 'home') initMap($('#homemap'), 'preview', { onSelect: id => go('#/map/' + id), pad: [30, 30] });
  if (r.name === 'map') {
    if (r.id && get(r.id)) S.sel = r.id;
    initMap($('#bigmap'), 'workspace', { onSelect: id => { selectStation(id, false); history.replaceState(null, '', '#/map/' + id); }, onBlank: () => { S.sel = null; paintPins(); refreshMapList(); history.replaceState(null, '', '#/map'); } });
    refreshMapList(); if (S.sel) { const s = get(S.sel); if (s && MAPS.lm) MAPS.lm.setView([s.lat, s.lng], 16); }
  }
  if (r.name === 'detail' && get(r.id)) { initMap($('#minimap'), 'station', { id: r.id }); if (S.feed === null) loadFeed(); if (S.rv[r.id] === undefined && !RVLOAD.has(r.id)) loadReviews(r.id); }
  if (r.name === 'directions' && get(r.id)) initMap($('#dirmap'), 'route', { id: r.id });
  if (r.name === 'account') syncProf();
  if (r.name === 'reports') { if (S.feed === null) loadFeed(); if (S.repTab === 'mine' && S.mineIssues === null) loadIssues(); }
  if (r.name === 'ask') { const msgs = $('#msgs'); if (msgs) { msgs.style.scrollBehavior = 'auto'; msgs.scrollTop = msgs.scrollHeight; msgs.style.scrollBehavior = ''; } $('#chatform')?.classList.toggle('busy', !!S.busy); syncSend(); }
}
const RVLOAD = new Set();
async function loadReviews(id) {
  RVLOAD.add(id);
  try { S.rv[id] = await api('GET', '/stations/' + id + '/reviews'); } catch (e) { RVLOAD.delete(id); if (e.status === 401) return fail(e); S.rv[id] = { avg: null, count: 0, dist: [0, 0, 0, 0, 0], items: [] }; }
  RVLOAD.delete(id); if (currentRoute().name === 'detail' && currentRoute().id === id) { S.anim = 'fade'; renderKeep(); }
}
async function loadFeed() { try { S.feed = await api('GET', '/community'); } catch { S.feed = []; } if (['reports', 'detail'].includes(currentRoute().name)) { S.anim = 'fade'; renderKeep(); } }
async function loadIssues() { try { [S.mineIssues, S.myRevs] = await Promise.all([api('GET', '/reports/mine'), api('GET', '/reviews/mine')]); } catch { S.mineIssues = S.mineIssues || []; S.myRevs = S.myRevs || []; } if (currentRoute().name === 'reports') { S.anim = 'fade'; renderKeep(); } }
const closeMenu = () => { const m = $('#acctmenu'); if (m) { m.hidden = true; $('.avatar')?.setAttribute('aria-expanded', 'false'); } };

/* ---------- Validation helpers ---------- */
function setErr(id, msg) {
  const i = $('#' + id), e = $('#' + id + '-e'); if (e) e.textContent = msg || '';
  if (i) { i.closest('.field')?.classList.toggle('bad', !!msg); i.setAttribute('aria-invalid', !!msg); }
  return !msg;
}
const formErr = (id, msg) => { const e = $('#' + id); if (e) e.textContent = msg || ''; };
const val = id => ($('#' + id)?.value || '').trim();
const busy = (btn, on, txt) => { if (!btn) return; btn.disabled = on; if (on) { btn.dataset.t = btn.innerHTML; btn.innerHTML = '<span class="spinner sm"></span>' + (txt || 'Working…'); } else if (btn.dataset.t) btn.innerHTML = btn.dataset.t; };
const rules = {
  email: id => setErr(id, !val(id) ? 'Enter your email address.' : !EMAIL.test(val(id)) ? 'Enter a valid email, like name@example.com.' : ''),
  pass: id => setErr(id, !$('#' + id).value ? 'Enter your password.' : $('#' + id).value.length < 6 ? 'Use at least 6 characters.' : ''),
  name: id => setErr(id, val(id).length < 2 ? 'Enter your full name.' : '')
};

/* ---------- Session ---------- */
async function enter(d, remember = true) {
  TOKEN = d.token; try { remember ? localStorage.setItem('aqf', TOKEN) : localStorage.removeItem('aqf'); } catch { }
  S.user = d.user; S.feed = null; S.mineIssues = null; S.myRevs = null; S.rv = {}; S.ad.loaded = false; S.sa.loaded = false; await loadAll();
  go(isStaff(S.user) ? '#/admin' : '#/');
  toast('Welcome, ' + S.user.name.split(' ')[0], 'ok');
  try { navigator.permissions?.query({ name: 'geolocation' }).then(p => { if (p.state === 'granted') startLive(); }).catch(() => { }); } catch { }
}
function signOut() {
  stopLive(true); TOKEN = null; try { localStorage.removeItem('aqf'); } catch { } OAUTH.clear();
  Object.assign(S, { user: null, chat: [], typing: false, chatFail: null, busy: false, feed: null, mineIssues: null, myRevs: null, rv: {}, saved: [], notifs: [], sel: null }); S.ad = { history: [], wr: [], people: [], ann: [], loaded: false }; S.sa = { loaded: false, loading: false, an: null, users: [], reports: [], reviews: [], avail: null, hours: 24, uq: '', ur: 'all', rs: 'pending', vs: 'flagged' };
  closeModal(true); go('#/signin'); toast('You have been signed out');
}
async function toggleSave(id) {
  const i = S.saved.indexOf(id);
  try { await api(i >= 0 ? 'DELETE' : 'POST', '/saved/' + id); i >= 0 ? S.saved.splice(i, 1) : S.saved.push(id); toast(i >= 0 ? 'Removed from saved stations' : 'Station saved', i >= 0 ? '' : 'ok'); const r = currentRoute().name; if (r === 'map') { refreshMapList(); } else renderKeep(); } catch (e) { toast(e.message, 'error'); }
}
const fail = e => { if (e.status === 401) { signOut(); } else toast(e.message, 'error'); };
async function quickRefresh() { await loadAll(); }

/* ---------- Actions (click delegation) ---------- */
const A = {
  async install(el) { busy(el, true, 'Installing…'); const ok = await PWA.install(); busy(el, false); if (!ok) renderKeep(); },
  'install-x'() { PWA.dismiss(); },
  'ios-help'() {
    modal(`<div class="dlg-h"><h2>Install on iPhone</h2><button class="icon-btn dlg-x" data-act="close" aria-label="Close">${ico('x', 18)}</button></div>
    <ol class="steps"><li>${PWA.iosSafari ? 'Tap the <b>Share</b> button in Safari\'s toolbar.' : 'Open this page in <b>Safari</b>, then tap the <b>Share</b> button.'}</li><li>Scroll down and tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>. AquaFind now opens from your home screen like any app.</li></ol>`, 'Install on iPhone');
  },
  skip(el, e) { e.preventDefault(); $('#main')?.focus(); },
  menu(el) { const m = $('#acctmenu'), open = m.hidden; m.hidden = !open; el.setAttribute('aria-expanded', open); if (open) m.querySelector('a,button')?.focus(); },
  heart: el => toggleSave(el.dataset.id), rm: el => toggleSave(el.dataset.id),
  filt(el) { S.f = el.dataset.p; currentRoute().name === 'map' ? (render()) : render(); },
  clear() { S.q = ''; S.f = 'all'; S.dist = 0; render(); },
  gps() { LIVE.id !== null ? stopLive() : startLive(); },
  center() { if (MAPS.lm && MAPS.me) MAPS.lm.setView(MAPS.me.getLatLng(), Math.max(MAPS.lm.getZoom(), 16)); },
  sheet() { S.sheet = S.sheet === 'list' ? 'peek' : 'list'; const w = $('.mapws'); w.dataset.sheet = S.sheet; $('.sheet-h').setAttribute('aria-expanded', S.sheet === 'list'); refreshMapList(); },
  pick(el) { selectStation(el.dataset.id); if (true) { S.sheet = 'peek'; $('.mapws').dataset.sheet = 'peek'; refreshMapList(); } history.replaceState(null, '', '#/map/' + el.dataset.id); },
  deselect() { S.sel = null; paintPins(); refreshMapList(); history.replaceState(null, '', '#/map'); },
  dmode(el) { S.mode = el.dataset.p; render(); }, dretry() { loadRoute(); },
  cfilt(el) { S.cf = el.dataset.p; renderKeep(); },
  reptab(el) { S.repTab = el.dataset.p; if (S.repTab === 'mine') loadIssues(); render(); },   // always refresh: an admin may have changed a report's status
  nf(el) { S.nf = el.dataset.p; render(); },
  readall() { myN().forEach(n => n.read = true); renderKeep(); api('PUT', '/notifications/read-all').catch(() => { }); },
  nread(el) { const n = S.notifs.find(x => x.id == el.dataset.id); n.read = true; api('PUT', '/notifications/' + n.id + '/read').catch(() => { }); renderKeep(); },
  nopen(el) { const n = S.notifs.find(x => x.id == el.dataset.id); if (n && !n.read) { n.read = true; api('PUT', '/notifications/' + n.id + '/read').catch(() => { }); } },
  async alerts() { try { const u = await api('PUT', '/me', { alerts: !S.alerts }); S.alerts = S.user.alerts = u.alerts; renderKeep(); } catch (e) { fail(e); } },
  async nearby() { try { const u = await api('PUT', '/me', { nearby: !S.nearby }); S.nearby = S.user.nearby = u.nearby; renderKeep(); } catch (e) { fail(e); } },
  logout: signOut,
  photo() { $('#pf')?.click(); },
  'photo-other'() { closeModal(true, true); $('#pf')?.click(); },
  async 'photo-save'(el) {
    if (!PH) return; busy(el, true, 'Saving…'); formErr('pherr', '');
    try { const u = await api('PUT', '/me/avatar', { image: photoData(PH.img, PH.zoom, PH.ox, PH.oy) }); Object.assign(S.user, u); PH = null; closeModal(); renderKeep(); toast('Profile photo updated', 'ok'); }
    catch (e) { busy(el, false); if (e.status === 401) return fail(e); formErr('pherr', e.message); }
  },
  'photo-rm'() { modal(`<div class="dlg-h"><h2>Remove profile photo?</h2><button class="icon-btn dlg-x" data-act="close" aria-label="Close">${ico('x', 18)}</button></div><div class="rm-prev">${avatar({ name: S.user.name, avatar: S.user.avatar }, 72, 'xl')}<p class="muted">Your photo will be deleted and your initials will be shown instead.</p></div><div class="btnrow"><button class="btn danger-solid" data-act="photo-rm-ok">Remove photo</button><button class="btn quiet" data-act="close">Cancel</button></div>`, 'Remove profile photo'); },
  async 'photo-rm-ok'(el) { busy(el, true, 'Removing…'); try { Object.assign(S.user, await api('DELETE', '/me/avatar')); closeModal(); renderKeep(); toast('Profile photo removed', 'ok'); } catch (e) { busy(el, false); closeModal(); fail(e); } },
  pcancel() { const u = S.user; $('#pn').value = u.name; $('#pe').value = u.email; $('#pp').value = u.phone || ''; ['pn', 'pe', 'pp'].forEach(id => setErr(id, '')); formErr('perr', ''); syncProf(); toast('Changes discarded'); },
  eye(el) { const i = $('#' + el.dataset.t), show = i.type === 'password'; i.type = show ? 'text' : 'password'; el.setAttribute('aria-pressed', show); el.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); el.innerHTML = ico(show ? 'eyeoff' : 'eye', 18); },
  close: () => closeModal(),
  report() { go('#/station/' + routeId() + '/report'); },
  role(el) {
    const r = el.dataset.p, w = el.closest('.role-wrap'); if (!w) return; w.dataset.role = r;
    w.querySelectorAll('.role-tabs [role=tab]').forEach(t => { const on = t === el; t.classList.toggle('on', on); t.setAttribute('aria-selected', on); });
    $('#si-h').textContent = r === 'admin' ? 'Station admin' : 'Welcome back';
    $('#si-s').textContent = r === 'admin' ? 'Sign in to manage your station\u2019s availability, reports and details.' : 'Sign in to check which refill stations have water before you head out.';
    formErr('er', '');
  },
  demo(el) { const p = el.dataset.p; document.getElementById(p === 'user' ? 'rt-user' : 'rt-admin')?.click(); const c = { user: ['user@aquafind.com', 'user123'], admin: ['admin@aquafind.com', 'admin123'], super: ['super@aquafind.com', 'super123'] }[p]; $('#em').value = c[0]; $('#pw').value = c[1]; $('#pw').focus(); },
  soc(el) { return OAUTH.start(el.dataset.p); },
  terms(el) { const t = el.dataset.p; modal(`<div class="dlg-h"><h2>${t}</h2><button class="icon-btn dlg-x" data-act="close" aria-label="Close">${ico('x', 18)}</button></div><p class="muted">${t === 'Privacy Policy' ? 'AquaFind stores your name, email and saved stations to show you water availability. Your password is stored securely and never shared. This is a school project demo.' : 'AquaFind shows water availability reported by station administrators and users. It may be out of date, so confirm with the station. This is a school project demo.'}</p><div class="btnrow"><button class="btn primary" data-act="close">Got it</button></div>`, t); },
  forgot() { modal(`<div class="dlg-h"><h2>Reset password</h2><button class="icon-btn dlg-x" data-act="close" aria-label="Close">${ico('x', 18)}</button></div><p class="muted">Enter your email and we will send reset instructions. (Simulated in this demo.)</p><form id="forgotform" novalidate>${field({ id: 'fe', label: 'Email', type: 'email', ph: 'you@email.com', ac: 'email', val: val('em') })}<div class="btnrow"><button class="btn primary" type="submit">Send reset link</button><button type="button" class="btn quiet" data-act="close">Cancel</button></div></form>`, 'Reset password'); },
  qr(el) {
    const sid = el.dataset.sid || (currentRoute().name === 'detail' ? routeId() : byDist(ST)[0]?.id);
    modal(`<div class="dlg-h"><h2>Is there water?</h2><button class="icon-btn dlg-x" data-act="close" aria-label="Close">${ico('x', 18)}</button></div><p class="muted">Tell others what you see right now. Reports count for 3 hours.</p>${waterForm('qm', sid)}`, 'Report water status');
  },
  csug(el) { if (S.busy) return; $('#ci').value = el.dataset.p; $('#chatform').requestSubmit(); },
  cretry() { if (!S.busy) sendChat(null, true); },
  // admin
  aset(el) { S.as = el.dataset.p; $$('.radios.stat .radio').forEach(l => l.classList.toggle('on', l.querySelector('input').value === S.as)); const b = $('[data-act="aupd"]'); if (b) b.disabled = S.as === get(S.user.station).status; },
  async aupd(el) { busy(el, true, 'Updating…'); try { Object.assign(get(S.user.station), await api('PUT', '/stations/' + S.user.station + '/availability', { status: S.as })); S.ad.history = await api('GET', '/admin/history'); S.as = null; renderKeep(); toast('Status updated. Followers were notified.', 'ok'); } catch (e) { busy(el, false); fail(e); } },
  async resolve(el) { try { await api('PUT', '/reports/' + el.dataset.id + '/resolve'); S.reports.find(r => r.id == el.dataset.id).done = true; renderKeep(); toast('Report marked as resolved', 'ok'); } catch (e) { fail(e); } },
  rf(el) { S.rf = el.dataset.p; render(); },
  async rstat(el) {   // approve / reject / resolve / reopen a report (station admin: own station; system admin: any)
    const id = +el.dataset.id, st = el.dataset.p; busy(el, true, '…');
    try {
      await api('PUT', '/reports/' + id + '/status', { status: st });
      for (const l of [S.reports, S.sa.reports]) { const r = l.find(x => x.id === id); if (r) { r.status = st; r.done = st === 'resolved'; r.upd = Date.now(); } }
      if (S.user.role === 'superadmin') S.sa.an = await api('GET', '/superadmin/analytics?hours=' + S.sa.hours);
      renderKeep(); toast('Report marked as ' + RS[st].toLowerCase(), 'ok');
    } catch (e) { busy(el, false); fail(e); }
  },
  rvopen(el) {
    const sid = el.dataset.sid, s = get(sid), mine = (S.rv[sid]?.items || []).find(r => r.mine); RV = { sid, rating: mine ? mine.rating : 0 };
    modal(`<div class="dlg-h"><h2>${mine ? 'Edit your review' : 'Rate this station'}</h2><button class="icon-btn dlg-x" data-act="close" aria-label="Close">${ico('x', 18)}</button></div>
    <p class="muted">${esc(s.name)}. Be honest and kind: reviews help others choose where to refill.</p>
    <form id="reviewform" novalidate><div class="starpick" role="radiogroup" aria-label="Your rating">${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" class="sp ${RV.rating >= n ? 'on' : ''}" aria-checked="${RV.rating === n}" aria-label="${n} star${n > 1 ? 's' : ''}" data-act="rvstar" data-p="${n}">${ico('star', 34, true)}</button>`).join('')}</div>
    <div class="field"><label for="rvc">Comment <span class="opt">optional</span></label><textarea id="rvc" rows="4" maxlength="500" placeholder="How was the water, the wait, the service?">${esc(mine ? mine.comment : '')}</textarea><p class="hint">No personal information or abusive language. Other users can report reviews to moderators.</p></div>
    <p class="ferr" id="rverr" role="alert"></p><div class="btnrow"><button class="btn primary" type="submit">${mine ? 'Save review' : 'Post review'}</button><button type="button" class="btn quiet" data-act="close">Cancel</button></div></form>`, 'Review');
  },
  rvstar(el) { const n = +el.dataset.p; RV.rating = n; $$('.starpick .sp').forEach((b, i) => { b.classList.toggle('on', i < n); b.setAttribute('aria-checked', i + 1 === n); }); formErr('rverr', ''); },
  rvdel(el) { modal(`<div class="dlg-h"><h2>Delete your review?</h2><button class="icon-btn dlg-x" data-act="close" aria-label="Close">${ico('x', 18)}</button></div><p class="muted">Your rating and comment will be removed from this station.</p><div class="btnrow"><button class="btn danger-solid" data-act="rvdelok" data-sid="${el.dataset.sid}">Delete review</button><button class="btn quiet" data-act="close">Cancel</button></div>`, 'Delete review'); },
  async rvdelok(el) { busy(el, true, 'Deleting…'); try { const r = await api('DELETE', '/stations/' + el.dataset.sid + '/reviews'); if (r.station) Object.assign(get(el.dataset.sid), r.station); delete S.rv[el.dataset.sid]; S.myRevs = null; closeModal(); renderKeep(); toast('Review deleted', 'ok'); } catch (e) { busy(el, false); closeModal(); fail(e); } },
  async rvflag(el) { try { await api('POST', '/reviews/' + el.dataset.id + '/flag'); el.disabled = true; el.textContent = 'Reported'; toast('Thanks. A moderator will take a look.', 'ok'); } catch (e) { fail(e); } },
  wrdel(el) { modal(`<div class="dlg-h"><h2>Remove this report?</h2><button class="icon-btn dlg-x" data-act="close" aria-label="Close">${ico('x', 18)}</button></div><p class="muted">The report will no longer count toward the community totals. This can't be undone.</p><div class="btnrow"><button class="btn danger-solid" data-act="wrconfirm" data-id="${el.dataset.id}">Remove report</button><button class="btn quiet" data-act="close">Cancel</button></div>`, 'Remove report'); },
  async wrconfirm(el) { try { await api('DELETE', '/water-reports/' + el.dataset.id); S.ad.wr = S.ad.wr.filter(r => r.id != el.dataset.id); closeModal(); await quickRefresh(); renderKeep(); toast('Report removed', 'ok'); } catch (e) { fail(e); } }
};
/* Sign-in logo click: the mark tears into its upper part (the "A" peak) and lower part (the wave). A few drops fall
   as the water parts, the halves swing back and collide, the mark flashes silver, and water sprinkles up and out.
   Lightweight: 4 Web Animations + ONE temporary canvas (removed afterwards), ignored while already playing. */
const signInLogoBusy = new WeakSet();
function logoSplitCollide(logo, svg, upper, lower, done) {
  const DUR = 1000, HIT = 640, END = HIT + 1250;
  let over = false;
  const finish = () => { if (over) return; over = true; cv && cv.remove(); done(); };
  upper.style.transformBox = 'fill-box'; upper.style.transformOrigin = '50% 100%';
  lower.style.transformBox = 'fill-box'; lower.style.transformOrigin = '50% 0%';
  const o = { duration: DUR, fill: 'none' };
  // apart (ease-out, slight tilt) -> hang -> accelerate together -> impact -> rebound -> settle
  upper.animate([
    { translate: '0px 0px', rotate: '0deg', easing: 'cubic-bezier(.2,.8,.3,1)' },
    { translate: '-6px -18px', rotate: '-9deg', offset: 0.36, easing: 'ease-in-out' },
    { translate: '-6px -18px', rotate: '-9deg', offset: 0.46, easing: 'cubic-bezier(.6,0,.9,.4)' },
    { translate: '0px 2px', rotate: '1.5deg', offset: 0.64, easing: 'ease-out' },
    { translate: '0px -1px', rotate: '-.5deg', offset: 0.78, easing: 'ease-in-out' },
    { translate: '0px 0px', rotate: '0deg' }
  ], o);
  lower.animate([
    { translate: '0px 0px', rotate: '0deg', easing: 'cubic-bezier(.2,.8,.3,1)' },
    { translate: '6px 18px', rotate: '7deg', offset: 0.36, easing: 'ease-in-out' },
    { translate: '6px 18px', rotate: '7deg', offset: 0.46, easing: 'cubic-bezier(.6,0,.9,.4)' },
    { translate: '0px -2px', rotate: '-1.2deg', offset: 0.64, easing: 'ease-out' },
    { translate: '0px 1px', rotate: '.4deg', offset: 0.78, easing: 'ease-in-out' },
    { translate: '0px 0px', rotate: '0deg' }
  ], o);
  // impact: pop + silver glow (the whole mark turns brushed silver, then the colour flows back)
  const S0 = 'drop-shadow(0 0 0 rgba(226,232,240,0)) drop-shadow(0 0 0 rgba(203,213,225,0)) grayscale(0) brightness(1)';
  const S1 = 'drop-shadow(0 0 6px rgba(240,245,252,.95)) drop-shadow(0 0 16px rgba(203,213,225,.75)) grayscale(.9) brightness(1.75)';
  const S2 = 'drop-shadow(0 0 5px rgba(226,232,240,.5)) drop-shadow(0 0 10px rgba(203,213,225,.35)) grayscale(.45) brightness(1.3)';
  svg.animate([
    { scale: '1', filter: S0 }, { scale: '1', filter: S0, offset: 0.62 },
    { scale: '1.14', filter: S1, offset: 0.68, easing: 'ease-out' },
    { scale: '1', filter: S2, offset: 0.8 }, { scale: '1', filter: S0 }
  ], { duration: 1500, fill: 'none' });

  // water: one canvas, drops under gravity, impact flash, shock ring, silver sparkles
  var cv = document.createElement('canvas'), ctx = cv.getContext && cv.getContext('2d');
  if (!ctx) { setTimeout(finish, DUR); return; }
  const PAD = 90, lr = logo.getBoundingClientRect(), sr = svg.getBoundingClientRect();
  const W = lr.width + PAD * 2, H = lr.height + PAD * 2, dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  cv.style.cssText = `position:absolute;left:${-PAD}px;top:${-PAD}px;width:${W}px;height:${H}px;pointer-events:none;z-index:3`;
  cv.setAttribute('aria-hidden', 'true');
  ctx.scale(dpr, dpr); logo.appendChild(cv);
  const cx = sr.left - lr.left + sr.width / 2 + PAD, cy = sr.top - lr.top + sr.height * 0.6 + PAD, w = sr.width;
  const rnd = (a, b) => a + Math.random() * (b - a), G = 720, P = [];
  const drop = (ts, x, y, ang, sp, r, life) => P.push({ ts, x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r, life });
  for (let i = 0; i < 8; i++) drop(60 + rnd(0, 120), cx + rnd(-0.3, 0.3) * w, cy + rnd(-0.04, 0.04) * w, Math.PI / 2 + rnd(-1.2, 1.2), rnd(10, 70), rnd(1.1, 2.4), rnd(450, 700));      // water parts
  for (let i = 0; i < 28; i++) drop(HIT + rnd(0, 40), cx + rnd(-0.38, 0.38) * w, cy + rnd(-0.05, 0.05) * w, -Math.PI / 2 + rnd(-1, 1) * 1.3, rnd(120, 340), rnd(1.4, 4), rnd(700, 1150)); // sprinkle
  const stars = Array.from({ length: 6 }, () => ({ ts: HIT + rnd(0, 160), x: cx + rnd(-0.55, 0.55) * w, y: cy + rnd(-0.6, 0.3) * w, r: rnd(3, 6.5), life: rnd(380, 560) }));
  const star = (x, y, r) => { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, d = i % 2 ? r * 0.28 : r; ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); } ctx.closePath(); ctx.fill(); };
  const t0 = performance.now();
  const frame = (now) => {
    if (over) return;
    const t = now - t0; ctx.clearRect(0, 0, W, H);
    const k = t - HIT;
    if (k > 0 && k < 520) {   // silver impact flash + shock ring
      const f = 1 - k / 520, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.75);
      g.addColorStop(0, `rgba(248,250,253,${(0.85 * f).toFixed(3)})`); g.addColorStop(0.45, `rgba(203,213,225,${(0.4 * f).toFixed(3)})`); g.addColorStop(1, 'rgba(203,213,225,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - w, cy - w, w * 2, w * 2);
      ctx.strokeStyle = `rgba(226,232,240,${(0.7 * f).toFixed(3)})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(cx, cy, w * (0.1 + 0.85 * (1 - f)), w * (0.04 + 0.3 * (1 - f)), 0, 0, 6.2832); ctx.stroke();
    }
    for (const s of stars) {   // silver sparkles
      const a = (t - s.ts) / s.life; if (a < 0 || a > 1) continue;
      ctx.fillStyle = `rgba(241,245,249,${(Math.sin(a * Math.PI)).toFixed(3)})`; star(s.x, s.y, s.r * (0.5 + Math.sin(a * Math.PI) * 0.7));
    }
    for (const d of P) {   // water drops: ballistic motion, stretched along their velocity
      const age = (t - d.ts) / 1000; if (age < 0 || age * 1000 > d.life) continue;
      const u = age * 1000 / d.life, vy = d.vy + G * age, x = d.x + d.vx * age, y = d.y + d.vy * age + 0.5 * G * age * age;
      const al = Math.min(1, u * 14) * (u > 0.7 ? (1 - u) / 0.3 : 1);
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(vy, d.vx) - Math.PI / 2);
      ctx.fillStyle = `rgba(150,225,250,${(0.9 * al).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(0, 0, d.r, d.r * 1.45, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${(0.9 * al).toFixed(3)})`; ctx.beginPath(); ctx.arc(-d.r * 0.3, -d.r * 0.4, d.r * 0.38, 0, 6.2832); ctx.fill();
      ctx.restore();
    }
    if (t < END && logo.isConnected) requestAnimationFrame(frame); else finish();
  };
  requestAnimationFrame(frame);
  setTimeout(finish, END + 1500);   // safety net (e.g. tab hidden)
}
document.addEventListener('click', e => {
  const logo = e.target.closest('.auth-logo');
  if (logo && logo.closest('.is-auth')) {
    const svg = logo.querySelector('.logo-live');
    const upper = svg && svg.querySelector('.hl-full path:first-child');
    const lower = svg && svg.querySelector('.hl-full path:last-child');
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!calm && upper && lower && !signInLogoBusy.has(svg) && typeof upper.animate === 'function') {
      signInLogoBusy.add(svg);
      logoSplitCollide(logo, svg, upper, lower, () => signInLogoBusy.delete(svg));
    }
  }
  const el = e.target.closest('[data-act]');
  if (!e.target.closest('.acct')) closeMenu();
  const fn = el && (A[el.dataset.act] || SAA[el.dataset.act]); if (fn) fn(el, e);
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'pf') { const f = t.files && t.files[0]; t.value = ''; if (f) openPhotoEditor(f); return; }
  if (t.dataset.sa && SAC[t.dataset.sa]) return SAC[t.dataset.sa](t);
  const c = t.dataset.chg; if (!c) return;
  if (c === 'loc') { S.loc = +t.value; currentRoute().name === 'map' ? (render()) : render(); }
  if (c === 'dist') { S.dist = +t.value; currentRoute().name === 'map' ? refreshMapList() : refreshResults(); }
  if (c === 'sort') { S.sort = t.value; refreshResults(); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.sa && SAI[t.dataset.sa]) return SAI[t.dataset.sa](t);
  if (t.id === 'q') { S.q = t.value; refreshResults(); }
  if (t.id === 'mq') { S.q = t.value; refreshMapList(); }
  if (t.id === 'rd') $('#cnt').textContent = t.value.length;
  if (t.closest && t.closest('#profform')) syncProf();
  if (t.id === 'zoom' && PH) { PH.zoom = +t.value; drawPhoto(); }
  if (t.id === 'hq') {
    const q = t.value.trim().toLowerCase(), box = $('#hsug'), m = q ? byDist(ST.filter(s => (s.name + ' ' + s.addr).toLowerCase().includes(q))).slice(0, 5) : [];
    box.hidden = !q; t.setAttribute('aria-expanded', !!q);
    box.innerHTML = m.length ? m.map(s => `<a role="option" href="#/station/${s.id}"><span><b>${esc(s.name)}</b><small>${esc(s.addr)}</small></span>${chip(s)}<span class="num">${dm(s)}</span></a>`).join('') : `<p class="sug-none">No station matches “${esc(t.value)}”.</p>`;
  }
  if (t.closest('.field.bad') && t.id) setErr(t.id, '');
});
document.addEventListener('focusout', e => { const t = e.target; if (t.id === 'hq') setTimeout(() => { const b = $('#hsug'); if (b && !b.contains(document.activeElement)) { b.hidden = true; t.setAttribute('aria-expanded', 'false'); } }, 150); });
document.addEventListener('keydown', e => {
  const t = e.target;
  if (e.key === 'Escape') { if ($('#modal')) closeModal(); else if (!$('#acctmenu')?.hidden) { closeMenu(); $('.avatar')?.focus(); } const b = $('#hsug'); if (b) b.hidden = true; }
  trapFocus(e);
  if ((e.key === 'Enter' || e.key === ' ') && t.matches('[role=button][data-act]')) { e.preventDefault(); t.click(); }
  if (e.key === 'Enter' && t.id === 'hq') { S.q = t.value; S.f = 'all'; go('#/stations'); }
});

/* ---------- Profile photo editor: preview, zoom, drag to reposition, then upload ---------- */
let PH = null, RV = null;
const CROP = 240;
function drawPhoto() { const cv = $('#cropcv'); if (cv && PH) paintPhoto(cv, PH.img, PH.zoom, PH.ox, PH.oy, CROP); }
const panLimits = () => { const iw = PH.img.naturalWidth || PH.img.width, ih = PH.img.naturalHeight || PH.img.height, sc = Math.max(CROP / iw, CROP / ih) * PH.zoom; return { mx: Math.max(0, (iw * sc - CROP) / 2), my: Math.max(0, (ih * sc - CROP) / 2) }; };
const clamp1 = v => Math.max(-1, Math.min(1, v));
async function openPhotoEditor(file) {
  let img; try { img = await loadPhoto(file); } catch (e) { return toast(e.message, 'error'); }
  PH = { img, zoom: 1, ox: 0, oy: 0 };
  modal(`<div class="dlg-h"><h2>Profile photo</h2><button class="icon-btn dlg-x" data-act="close" aria-label="Close">${ico('x', 18)}</button></div>
  <p class="muted">Drag the photo to reposition it, and use the slider to zoom. The circle shows how it will appear.</p>
  <div class="crop"><canvas id="cropcv" width="${CROP}" height="${CROP}" tabindex="0" role="img" aria-label="Photo preview. Drag, or use the arrow keys, to reposition."></canvas></div>
  <div class="zoomrow"><label for="zoom">Zoom</label><input id="zoom" type="range" min="1" max="3" step="0.01" value="1"></div>
  <p class="ferr" id="pherr" role="alert"></p>
  <div class="btnrow"><button type="button" class="btn primary" data-act="photo-save">Save photo</button><button type="button" class="btn outline" data-act="photo-other">Choose another</button><button type="button" class="btn quiet" data-act="close">Cancel</button></div>`, 'Profile photo');
  drawPhoto();
}
(function cropDrag() {
  let d = null;
  document.addEventListener('pointerdown', e => { if (e.target.id !== 'cropcv' || !PH) return; d = { x: e.clientX, y: e.clientY, ox: PH.ox, oy: PH.oy, L: panLimits(), k: CROP / (e.target.getBoundingClientRect().width || CROP) }; try { e.target.setPointerCapture(e.pointerId); } catch { } e.preventDefault(); });
  document.addEventListener('pointermove', e => { if (!d || !PH) return; PH.ox = d.L.mx ? clamp1(d.ox + (e.clientX - d.x) * d.k / d.L.mx) : 0; PH.oy = d.L.my ? clamp1(d.oy + (e.clientY - d.y) * d.k / d.L.my) : 0; drawPhoto(); });
  const end = () => { d = null; }; document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  document.addEventListener('keydown', e => { if (e.target.id !== 'cropcv' || !PH) return; const m = { ArrowLeft: [0.12, 0], ArrowRight: [-0.12, 0], ArrowUp: [0, 0.12], ArrowDown: [0, -0.12] }[e.key]; if (!m) return; e.preventDefault(); PH.ox = clamp1(PH.ox + m[0]); PH.oy = clamp1(PH.oy + m[1]); drawPhoto(); });
})();

/* ---------- Form submissions ---------- */

/* ---------- AquaBot chat engine ----------
   The reply text always comes from the backend. We only animate how already-received text appears. */
const sleep = ms => new Promise(r => setTimeout(r, ms));
function syncSend() {
  const f = $('#chatform'); if (!f) return; const i = $('#ci'), b = $('.send', f), has = !!i.value.trim();
  f.classList.toggle('has-text', has && !S.busy); b.disabled = !has || !!S.busy;
  b.innerHTML = S.busy ? '<span class="spinner"></span>' : ico('send', 20); b.setAttribute('aria-label', S.busy ? 'AquaBot is replying' : 'Send message'); i.readOnly = false;
}
document.addEventListener('input', e => { if (e.target.id === 'ci') syncSend(); });
const toBottom = (smooth = true) => { const b = $('#msgs'); if (b) b.scrollTo({ top: b.scrollHeight, behavior: smooth && !REDUCED() ? 'smooth' : 'auto' }); };
const nearBottom = () => { const b = $('#msgs'); return !b || b.scrollHeight - b.scrollTop - b.clientHeight < 90; };
const chatAdd = html => { const b = $('#msgs'); if (!b) return null; b.insertAdjacentHTML('beforeend', html); toBottom(); return b.lastElementChild; };

async function revealText(el, text) {           // controlled word-by-word reveal of the real reply
  const bub = el.querySelector('.bub'); if (REDUCED()) { bub.textContent = text; return; }
  const words = text.split(/(\s+)/), per = Math.min(45, Math.max(16, 2200 / Math.max(1, words.length / 2)));
  bub.classList.add('caret'); let out = '';
  for (let k = 0; k < words.length; k++) {
    if (!document.contains(el)) return;         // user navigated away: history already holds the full text
    out += words[k]; bub.textContent = out;
    if (/\S/.test(words[k])) { if (nearBottom()) { const b = $('#msgs'); b.scrollTop = b.scrollHeight; } await sleep(per); }
  }
  bub.classList.remove('caret');
}

async function sendChat(text, retry = false) {
  if (S.busy) return; S.busy = true; S.chatFail = null; $('#cerr')?.remove();
  if (!retry) { S.chat.push({ role: 'user', text, t: Date.now(), id: 'm' + Date.now() }); chatAdd(msgHtml(S.chat[S.chat.length - 1])); $('#sugg')?.classList.add('hide'); }
  const last = S.chat.map(m => m.role).lastIndexOf('user'), q = S.chat[last].text;
  const hist = S.chat.slice(0, last).filter(m => !m.local).map(m => ({ role: m.role, text: m.text }));
  S.typing = true; chatAdd(typingRow()); syncSend(); $('#chatform')?.querySelector('.send')?.classList.add('fly');
  const started = Date.now();
  try {
    const u = LC(), r = await api('POST', '/chat', { message: q, history: hist, lat: u.lat, lng: u.lng });
    const wait = 650 - (Date.now() - started); if (wait > 0) await sleep(wait);   // keep the indicator readable; the reply itself is already in hand
    const m = { role: 'assistant', text: r.reply, st: r.stations, t: Date.now(), id: 'm' + Date.now() + 'b' };
    S.chat.push(m); S.typing = false; $('#ty')?.remove();
    const row = chatAdd(msgHtml(m, { plain: true }));
    if (row) { await revealText(row, m.text); if (document.contains(row)) { row.querySelector('.bub').textContent = m.text; row.querySelector('time').insertAdjacentHTML('beforebegin', stCards(m)); toBottom(); } }
  } catch (e) {
    S.typing = false; $('#ty')?.remove(); S.chatFail = e.message || 'Something went wrong.';
    chatAdd(errRow('Could not get a reply. ' + S.chatFail));
  }
  S.busy = false; $('#chatform')?.querySelector('.send')?.classList.remove('fly'); syncSend(); if (document.activeElement === document.body) $('#ci')?.focus({ preventScroll: true });
}

const forms = {
  async signin(f) {
    formErr('er', ''); const ok = [rules.email('em'), rules.pass('pw')].every(Boolean); if (!ok) return;
    const b = f.querySelector('[type=submit]'); busy(b, true, 'Signing in…');
    try {
      const d = await api('POST', '/auth/login', { email: val('em'), password: $('#pw').value }), as = f.closest('.role-wrap')?.dataset.role || 'user';
      if (as === 'admin' && d.user.role === 'user') { busy(b, false); return formErr('er', 'This is not a station admin account. Choose \u201cUser\u201d to sign in.'); }
      if (as === 'user' && d.user.role === 'admin') { busy(b, false); return formErr('er', 'This is a station admin account. Choose \u201cStation admin\u201d above to sign in.'); }
      await enter(d, $('#rm').checked);
    } catch (e) { busy(b, false); formErr('er', e.message); }
  },
  async signup(f) {
    formErr('er', ''); const ok = [rules.name('rn'), rules.email('re'), rules.pass('rp'), setErr('rc', $('#rc').value !== $('#rp').value ? 'Passwords do not match.' : ''), (() => { const g = $('#tc').checked; $('#tc-e').textContent = g ? '' : 'Agree to the Terms of Service and Privacy Policy to continue.'; return g; })()].every(Boolean); if (!ok) return;
    const b = f.querySelector('[type=submit]'); busy(b, true, 'Creating account…');
    try { await enter(await api('POST', '/auth/register', { name: val('rn'), email: val('re'), password: $('#rp').value })); } catch (e) { busy(b, false); formErr('er', e.message); }
  },
  async forgotform(f) {
    if (!rules.email('fe')) return; const b = f.querySelector('[type=submit]'); busy(b, true, 'Sending…');
    try { await api('POST', '/auth/forgot', { email: val('fe') }); const em = val('fe'); closeModal(); toast('Reset link sent to ' + em, 'ok'); } catch (e) { busy(b, false); setErr('fe', e.message); }
  },
  async profform(f) {
    formErr('perr', ''); if (!profDirty()) return; if (![rules.name('pn'), rules.email('pe')].every(Boolean)) return;
    const b = f.querySelector('[type=submit]'); busy(b, true, 'Saving…');
    try { const u = await api('PUT', '/me', { name: val('pn'), email: val('pe'), phone: val('pp') }); Object.assign(S.user, u); renderKeep(); toast('Profile saved', 'ok'); }
    catch (e) { busy(b, false); if (e.status === 401) return fail(e); formErr('perr', e.message); syncProf(); }
  },
  async pwform(f) {
    formErr('pwerr', ''); const ok = [setErr('p0', $('#p0').value ? '' : 'Enter your current password.'), setErr('p1', $('#p1').value.length < 6 ? 'Use at least 6 characters.' : ''), setErr('p2', $('#p2').value !== $('#p1').value ? 'Passwords do not match.' : '')].every(Boolean); if (!ok) return;
    try { await api('PUT', '/me/password', { current: $('#p0').value, next: $('#p1').value }); f.reset(); toast('Password updated', 'ok'); } catch (e) { formErr('pwerr', e.message); }
  },
  async reviewform(f) {
    if (!RV || !RV.rating) return formErr('rverr', 'Choose a rating from 1 to 5 stars.'); formErr('rverr', '');
    const b = f.querySelector('[type=submit]'); busy(b, true, 'Saving…');
    try { const r = await api('PUT', '/stations/' + RV.sid + '/reviews', { rating: RV.rating, comment: $('#rvc').value }); Object.assign(get(RV.sid), r.station); const sid = RV.sid; delete S.rv[sid]; S.myRevs = null; closeModal(); renderKeep(); toast(r.updated ? 'Review updated' : 'Thanks for your review', 'ok'); }
    catch (e) { busy(b, false); if (e.status === 401) return fail(e); formErr('rverr', e.message); }
  },
  async issueform(f) {
    const sel = $$('input[name=iss]:checked', f).map(i => i.value); if (!sel.length) return formErr('ierr', 'Select at least one issue.'); formErr('ierr', '');
    try { await api('POST', '/reports', { station_id: routeId(), type: sel.join('; '), note: $('#rd').value }); S.mineIssues = null; toast('Report sent. Thank you.', 'ok'); go('#/station/' + routeId()); } catch (e) { formErr('ierr', e.message); }
  },
  async infoform(f) {
    formErr('aerr', ''); const o = +$('#ao').value, c = +$('#ac').value;
    const ok = [setErr('an', val('an') ? '' : 'Enter the station name.'), setErr('aa', val('aa') ? '' : 'Enter the address.'), setErr('ap', val('ap') ? '' : 'Enter a contact number.'), setErr('ao', o >= 0 && o <= 23 && $('#ao').value !== '' ? '' : 'Enter an hour from 0 to 23.'), setErr('ac', c >= 1 && c <= 24 && c > o ? '' : 'Closing must be later than opening, up to 24.')].every(Boolean); if (!ok) return;
    try { Object.assign(get(S.user.station), await api('PUT', '/stations/' + S.user.station, { name: val('an'), addr: val('aa'), tel: val('ap'), o, c })); renderKeep(); toast('Station information saved', 'ok'); } catch (e) { formErr('aerr', e.message); }
  },
  async annform(f) {
    formErr('anerr', ''); const ok = [setErr('at', val('at').length < 3 ? 'Enter a title of at least 3 characters.' : ''), (() => { const g = val('ab').length >= 3; $('#ab-e').textContent = g ? '' : 'Enter the announcement message.'; return g; })()].every(Boolean); if (!ok) return;
    try { await api('POST', '/admin/announcements', { title: val('at'), body: val('ab') }); S.ad.ann = await api('GET', '/admin/announcements'); S.notifs = await api('GET', '/notifications'); renderKeep(); toast('Announcement published', 'ok'); } catch (e) { formErr('anerr', e.message); }
  },
  chatform() { const inp = $('#ci'), t = inp.value.trim(); if (!t || S.busy) return; inp.value = ''; syncSend(); sendChat(t); },
  async water(f) {
    const p = f.dataset.p, v = $(`input[name=${p}v]:checked`, f), sid = $('#' + p + 'st').value;
    if (!v) return formErr(p + 'err', 'Choose “Has water” or “No water”.'); formErr(p + 'err', '');
    const b = f.querySelector('[type=submit]'); busy(b, true, 'Submitting…');
    try {
      const s = await api('POST', '/water-reports', { station_id: sid, has_water: v.value === '1', note: $('#' + p + 'nt').value });
      Object.assign(get(sid), s); S.feed = null; S.notifs = await api('GET', '/notifications'); closeModal(); renderKeep(); loadFeed(); toast(v.value === '1' ? 'Reported: water available. Thanks.' : 'Reported: no water. Thanks.', 'ok');
    } catch (e) { busy(b, false); formErr(p + 'err', e.message); }
  }
};
document.addEventListener('submit', e => {
  const f = e.target, k = f.id || f.dataset.form, fn = forms[k] || SAF[k]; if (fn) { e.preventDefault(); fn(f); }
});
document.addEventListener('blur', e => {
  const t = e.target, m = { em: 'email', re: 'email', fe: 'email', pe: 'email' };
  if (t.id && m[t.id] && t.value) rules.email(t.id);
}, true);

/* ---------- Boot ---------- */
window.addEventListener('hashchange', () => { S.anim = 'route'; render(); $('#scroll').scrollTop = 0; if (S.ready) $('#main')?.focus({ preventScroll: true }); });
setInterval(async () => {
  if (!S.user || document.hidden || $('#modal')) return;
  try { await loadAll(); } catch { return; }
  if (profDirty()) return;
  const r = currentRoute().name;
  if (r === 'map') { paintPins(); refreshMapList(); }
  else if (r === 'reports' && S.repTab === 'mine') loadIssues();   // pick up report status changes made by admins
  else if (!['directions', 'admin', 'ask', 'report', 'signin', 'signup'].includes(r) && !document.activeElement?.matches('input,textarea,select')) renderKeep();
}, 60000);
async function bootSession() {
  if (!TOKEN) return;
  try { S.user = await api('GET', '/me'); await loadAll(); S.offlineBoot = false; }
  catch (e) {
    if (e.status === 401) { S.user = null; TOKEN = null; try { localStorage.removeItem('aqf'); } catch { } }
    else if (e.offline) { S.user = null; S.offlineBoot = true; }   // keep the saved token; retry when the connection returns
    else { S.user = null; S.offlineBoot = true; }                  // server error: same, never discard a valid session
  }
}
const offlineScreen = () => `<div class="offscreen"><div class="offbox">${logo(56)}
  <h1>${navigator.onLine === false ? 'You are offline' : 'Cannot reach AquaFind'}</h1><p>Live water availability needs a connection, and AquaFind will not show old status as if it were current. You are still signed in.</p>
  <button class="btn primary" data-act="retryboot">Try again</button></div></div>`;
A.retryboot = async function (el) { busy(el, true, 'Connecting…'); await bootSession(); busy(el, false); render(); };
window.addEventListener('aqf-online', async () => {
  if (S.offlineBoot) { await bootSession(); render(); return; }
  if (S.user) { try { await loadAll(); renderKeep(); toast('Back online. Availability refreshed.', 'ok'); } catch { } }
});
(async function boot() {
  render();
  await bootSession();
  S.ready = true; S.anim = 'fade'; if (!S.chat.length) S.chat = [{ role: 'assistant', text: GREET, t: Date.now(), local: true }];
  if (isStaff(S.user) && !location.hash) location.hash = '#/admin'; else render();
  OAUTH.callback();   // returning from Google / Facebook: finish the sign-in (or show why it did not finish)
})();

// Sign-in panel: cursor-reactive spotlight, ring and logo parallax (desktop pointers only; purely decorative)
(() => {
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  let tx = 0.5, ty = 0.5, x = 0.5, y = 0.5, raf = 0, hero = null;
  const tick = () => {
    raf = 0;
    if (!hero || !hero.isConnected) return;
    x += (tx - x) * 0.09; y += (ty - y) * 0.09;
    hero.style.setProperty('--px', (x * 100).toFixed(2) + '%');
    hero.style.setProperty('--py', (y * 100).toFixed(2) + '%');
    hero.style.setProperty('--dx', ((x - 0.5) * 2).toFixed(3));
    hero.style.setProperty('--dy', ((y - 0.5) * 2).toFixed(3));
    if (Math.abs(tx - x) > 0.001 || Math.abs(ty - y) > 0.001) raf = requestAnimationFrame(tick);
  };
  document.addEventListener('pointermove', (e) => {
    hero = document.querySelector('.is-auth .auth-hero');
    if (!hero) return;
    const r = hero.getBoundingClientRect();
    tx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    ty = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    hero.classList.toggle('is-hover', e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom);
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
})();

/* Tap / click bubble burst: a few bubbles float up from wherever the user taps. */
(() => {
  let live = 0;
  document.addEventListener('pointerdown', e => {
    if (e.button > 0 || live > 40 || e.target.closest?.('.auth-logo')) return;   // the sign-in logo has its own splash
    for (let i = 0; i < 5; i++) {
      const b = document.createElement('i'), s = 6 + Math.random() * 14;
      b.className = 'tap-bub';
      b.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;width:${s}px;height:${s}px;--dx:${(Math.random() - .5) * 90}px;--dy:${-(40 + Math.random() * 90)}px;--d:${700 + Math.random() * 600}ms`;
      live++; b.addEventListener('animationend', () => { b.remove(); live--; }, { once: true });
      document.body.appendChild(b);
    }
  }, { passive: true });
})();
