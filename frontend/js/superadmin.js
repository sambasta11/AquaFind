/* AquaFind system console (role "superadmin"): analytics, stations + map, availability monitor, reports, reviews, users.
   Loaded after admin.js (uses tbl, aHead, dur) and before main.js (which delegates clicks, changes, inputs and submits to SAA, SAC, SAI, SAF). */
'use strict';
const SAA = {}, SAC = {}, SAI = {}, SAF = {};
const SA_SECTIONS = [['overview', 'Dashboard', 'chart'], ['stations', 'Stations', 'store'], ['availability', 'Availability', 'drop'], ['reports', 'Reports', 'flag'], ['reviews', 'Reviews', 'star'], ['users', 'Users', 'users']];
const SV = {};
const ROLE_L = { user: 'User', admin: 'Station admin', superadmin: 'System admin' };

/* ---------- Design: stylesheet for the moderation + people pages (injected once, scoped to .sx) ---------- */
(function () {
  if (document.getElementById('sx-style')) return;
  const el = document.createElement('style'); el.id = 'sx-style';
  el.textContent = `/* ===== System console: moderation + people design (scoped to .sx, safe to remove) ===== */
.sx{--sx-green:#1AB5CC;--sx-clay:#E0695D;--sx-gray:#9DB4CA;--sx-navy:#0D3B66;--sx-blue:#2196F3;--sx-teal:#1AB5CC;--sx-track:#D5EAF6;--sx-line:#CBE7F5;--sx-ease:cubic-bezier(.2,.7,.2,1)}
.sx-kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:0 0 20px}
.sx-kpi{position:relative;overflow:hidden;background:#fff;border:1px solid var(--sx-line);border-radius:20px;padding:16px 16px 14px 22px;box-shadow:0 2px 12px rgba(33,150,243,.06)}
.sx-kpi::before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--kc)}
.sx-kpi dt{display:flex;align-items:center;gap:7px;font-size:11.5px;font-weight:600;color:var(--slate);text-transform:uppercase;letter-spacing:.06em}
.sx-kpi dd{margin:6px 0 0;font:800 32px/1.1 var(--display);letter-spacing:-.03em;color:var(--sx-navy)}
.sx-kpi.tint dd{color:var(--kc)}
.sx-kpi small{display:block;margin-top:3px;font-size:12.5px;color:var(--slate)}
.sx-dot{position:relative;display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--sx-clay)}
.sx-cols{display:grid;grid-template-columns:1fr;gap:16px;margin:0 0 18px}
.sx-card{background:#fff;border:1px solid var(--sx-line);border-radius:22px;padding:22px 24px;box-shadow:0 2px 12px rgba(33,150,243,.06);min-width:0}
.sx-card h2{margin:0 0 16px;font-size:16px;letter-spacing:-.01em;color:var(--sx-navy)}
.sx-dn{display:flex;align-items:center;gap:22px;flex-wrap:wrap}
.sx-donut-w{position:relative;width:150px;height:150px;flex:none}
.sx-donut{display:block;width:100%;height:100%}
.sx-track{fill:none;stroke:var(--sx-track);stroke-width:11}
.sx-seg{fill:none;stroke-width:11;stroke-linecap:butt}
.sx-dc{position:absolute;inset:0;display:grid;place-content:center;text-align:center;line-height:1.1}
.sx-dc b{font:800 28px/1 var(--display);letter-spacing:-.03em;color:var(--sx-navy)}
.sx-dc small{margin-top:4px;font-size:11.5px;color:var(--slate)}
.sx-lg{flex:1;min-width:150px;display:grid;gap:12px;margin:0;padding:0;list-style:none}
.sx-lg li{display:grid;grid-template-columns:10px 1fr auto;gap:10px;align-items:center;font-size:14px;font-weight:600;color:var(--sx-navy)}
.sx-lg i{width:10px;height:10px;border-radius:50%;background:var(--c)}
.sx-lg .num{font-weight:800}
.sx-bars{display:grid;gap:14px}
.sx-br{display:grid;grid-template-columns:58px 1fr 22px;gap:12px;align-items:center;font-size:13px;font-weight:600;color:var(--sx-navy)}
.sx-br b{text-align:right}
.sx-bar{display:block;height:16px;border-radius:9px;background:var(--sx-track);overflow:hidden}
.sx-bar i{position:relative;display:block;height:100%;border-radius:9px;background:var(--c);transform-origin:left center;overflow:hidden}
.sx-bar i::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,rgba(255,255,255,.38) 25%,transparent 25% 50%,rgba(255,255,255,.38) 50% 75%,transparent 75%);background-size:28px 28px}
.sx-nm{display:grid;gap:14px;margin:0;padding:0;list-style:none}
.sx-nm li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center}
.sx-nm .who{display:block;min-width:0}.sx-nm b{display:block;font-size:14px;color:var(--sx-navy)}
.sx-nm .em{display:block;font-size:12.5px;color:var(--slate);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sx-nm .rt{display:grid;justify-items:end;gap:3px;font-size:11.5px;color:var(--slate)}
.sx-search{position:relative;margin:0 0 12px}
.sx-search .ic{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--slate);pointer-events:none}
.sx-search input{width:100%;height:46px;padding:0 16px 0 44px;border:0;border-radius:14px;background:#fff;box-shadow:var(--sh-3,0 4px 18px rgba(16,42,67,.08));font:inherit;color:var(--ink);outline:0;transition:box-shadow .2s}
.sx-search input:focus{box-shadow:0 0 0 2px var(--aqua),var(--sh-3,0 4px 18px rgba(16,42,67,.08))}
.sx-tabs{display:flex;gap:22px;margin:6px 0 12px;border-bottom:1px solid var(--sx-line);overflow-x:auto}
.sx-tab{position:relative;background:none;border:0;padding:12px 0;font-size:14px;font-weight:600;color:var(--slate);white-space:nowrap;cursor:pointer;transition:color .2s}
.sx-tab:hover{color:var(--sx-navy)}.sx-tab.on{color:var(--sx-navy)}
.sx-tab::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:3px;border-radius:3px;background:var(--sx-teal);transform:scaleX(0);transition:transform .3s var(--sx-ease)}
.sx-tab.on::after{transform:scaleX(1)}
.sx-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}
.sx-chip{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--rule-2);background:#fff;font-size:13.5px;font-weight:600;color:var(--sx-navy);cursor:pointer;transition:background-color .2s,color .2s,border-color .2s,transform .15s}
.sx-chip:hover{border-color:var(--sx-navy)}.sx-chip:active{transform:scale(.96)}
.sx-chip .n{font:700 11.5px/1 var(--display);padding:3px 7px;border-radius:999px;background:#E4EFF9}
.sx-chip.on{background:var(--sx-navy);border-color:var(--sx-navy);color:#fff}
.sx-chip.on .n{background:rgba(255,255,255,.2);color:#fff}
.sx-count{margin:0 0 10px;font-size:13px;color:var(--slate)}
.sx-rv{display:grid;gap:12px;margin:0;padding:0;list-style:none}
.sx-rc{position:relative;overflow:hidden;background:#fff;border:1px solid var(--sx-line);border-radius:20px;padding:16px 18px 14px 26px;box-shadow:0 2px 12px rgba(33,150,243,.06)}
.sx-rc::before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--c)}
.sx-rc.is-flagged{--c:var(--sx-clay)}.sx-rc.is-hidden{--c:var(--sx-gray)}.sx-rc.is-published{--c:var(--sx-green)}
.sx-rc-h{display:flex;align-items:center;gap:10px}
.sx-rc-who{display:grid;line-height:1.25;min-width:0}.sx-rc-who b{font-size:14.5px;color:var(--sx-navy)}.sx-rc-who span{font-size:12.5px;color:var(--slate)}
.sx-rc-r{margin-left:auto;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:var(--slate)}
.sx-rc-st{display:inline-flex;align-items:center;gap:6px;margin:8px 0 0;font-size:13.5px;font-weight:600;color:#0E7F93}
.sx-rc-c{margin:8px 0 0;font-size:14.5px;color:var(--ink);overflow-wrap:anywhere}
.sx-rc-f{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}
.sx-rc-f .tags{display:flex;gap:6px;align-items:center}
.sx .av.sx-avg{background:#1AB5CC;color:#fff}
.sx .av.sx-avb{background:var(--sx-blue);color:#fff}
.sx .tag.rs-rejected{background:#FDE6E3;border-color:transparent;color:#9C3B33;border-radius:9px;padding:4px 12px;font-size:13px}
.sx .tag.ok{background:#DDF4F8;border-color:transparent;color:#0B6B7C;border-radius:9px;padding:4px 12px;font-size:13px}
.sx .btn.outline{border-color:#8CCBE0;color:#0F5E78;background:#fff;border-radius:14px}
.sx .btn.outline:hover{background:#E8F4FB;border-color:#1AB5CC}
.sx .ahead h1{font-size:clamp(28px,3.6vw,38px);font-weight:800;color:var(--sx-navy);letter-spacing:-.025em}
.sx .ahead p{color:#4F7391}
.sx-empty{padding:28px 0;color:var(--slate);text-align:center;font-size:14px}
@media(min-width:760px){.sx-kpis{grid-template-columns:repeat(4,1fr)}.sx-cols{grid-template-columns:1fr 1fr}}
@media all{
.sx.fx .sx-kpi{animation:sxUp .55s var(--sx-ease) both;animation-delay:calc(var(--i,0)*80ms)}
.sx.fx .sx-card{animation:sxUp .6s var(--sx-ease) both;animation-delay:calc(300ms + var(--i,0)*100ms)}
.sx.fx .sx-seg{animation:sxSeg .9s cubic-bezier(.3,.7,.2,1) both;animation-delay:calc(520ms + var(--i,0)*130ms)}
.sx.fx .sx-bar i{animation:sxGrow .85s cubic-bezier(.3,.7,.2,1) both;animation-delay:calc(640ms + var(--i,0)*90ms)}
.sx.fx .sx-lg li,.sx.fx .sx-nm li{animation:sxUp .45s var(--sx-ease) both;animation-delay:calc(600ms + var(--i,0)*80ms)}
.sx.fx .sx-search,.sx.fx .sx-tabs,.sx.fx .sx-chips{animation:sxUp .5s var(--sx-ease) both;animation-delay:900ms}
.sx.fx .sx-count{animation:sxFade .5s both;animation-delay:1000ms}
.sx-in>li{animation:sxUp .42s var(--sx-ease) both;animation-delay:calc(var(--i,0)*50ms)}
.sx.fx .sx-in>li{animation-delay:calc(1000ms + var(--i,0)*60ms)}
.sx-in .tbl tr{animation:sxUp .42s var(--sx-ease) both}
.sx.fx .sx-in .tbl tr{animation-delay:1000ms}
.sx-in .tbl tbody tr:nth-child(1){animation-delay:0ms}
.sx-in .tbl tbody tr:nth-child(2){animation-delay:45ms}
.sx-in .tbl tbody tr:nth-child(3){animation-delay:90ms}
.sx-in .tbl tbody tr:nth-child(4){animation-delay:135ms}
.sx-in .tbl tbody tr:nth-child(5){animation-delay:180ms}
.sx-in .tbl tbody tr:nth-child(6){animation-delay:225ms}
.sx-in .tbl tbody tr:nth-child(7){animation-delay:270ms}
.sx-in .tbl tbody tr:nth-child(8){animation-delay:315ms}
.sx-in .tbl tbody tr:nth-child(9){animation-delay:360ms}
.sx-in .tbl tbody tr:nth-child(10){animation-delay:405ms}
.sx.fx .sx-in .tbl tbody tr:nth-child(1){animation-delay:1000ms}
.sx.fx .sx-in .tbl tbody tr:nth-child(2){animation-delay:1055ms}
.sx.fx .sx-in .tbl tbody tr:nth-child(3){animation-delay:1110ms}
.sx.fx .sx-in .tbl tbody tr:nth-child(4){animation-delay:1165ms}
.sx.fx .sx-in .tbl tbody tr:nth-child(5){animation-delay:1220ms}
.sx.fx .sx-in .tbl tbody tr:nth-child(6){animation-delay:1275ms}
.sx.fx .sx-in .tbl tbody tr:nth-child(7){animation-delay:1330ms}
.sx.fx .sx-in .tbl tbody tr:nth-child(8){animation-delay:1385ms}
.sx.fx .sx-in .tbl tbody tr:nth-child(9){animation-delay:1440ms}
.sx.fx .sx-in .tbl tbody tr:nth-child(10){animation-delay:1495ms}
.sx-bar i::after{animation:sxStripe 1.1s linear infinite}
.sx-dot::after{content:"";position:absolute;inset:-4px;border-radius:50%;border:2px solid var(--sx-clay);opacity:0;animation:sxPing 1.8s ease-out infinite}
.sx-rc,.sx-kpi{transition:transform .2s var(--sx-ease),box-shadow .2s}
.sx-rc:hover{transform:translateY(-2px)}
}
@keyframes sxUp{from{opacity:0;transform:translateY(14px)}}
@keyframes sxFade{from{opacity:0}}
@keyframes sxStripe{to{background-position:28px 0}}
@keyframes sxSeg{from{stroke-dasharray:0 100}}
@keyframes sxGrow{from{transform:scaleX(0)}}
@keyframes sxPing{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.7);opacity:0}}
`;
  document.head.appendChild(el);
})();
let SA_KEY = '', SA_FX = false;   // SA_FX: true only when you arrive on a section, so filters and live refreshes never replay the intro animation
const SX = { green: '#1AB5CC', clay: '#E0695D', gray: '#9DB4CA', navy: '#0D3B66', blue: '#2196F3', teal: '#1AB5CC' };
const SX_GRAD = 'linear-gradient(90deg,#1AB5CC,#3FD0E0)';
const sxKpi = (label, val, key, sub, color, i, o = {}) => `<div class="sx-kpi${o.tint ? ' tint' : ''}" style="--kc:${color};--i:${i}"><dt>${label}${o.dot ? '<i class="sx-dot" aria-hidden="true"></i>' : ''}</dt><dd class="num"${o.plain ? '' : ` data-count="${val}" data-key="${key}"`}>${val}</dd><small>${sub}</small></div>`;
const sxDonut = parts => {
  const live = parts.filter(p => p.n), tot = live.reduce((a, p) => a + p.n, 0), gap = live.length > 1 ? 1.6 : 0; let off = 0;
  const segs = live.map((p, i) => { const len = p.n / tot * 100, l = Math.max(len - gap, .5), s = `<circle class="sx-seg" cx="50" cy="50" r="42" pathLength="100" style="stroke:${p.color};--i:${i}" stroke-dasharray="${l} ${100 - l}" stroke-dashoffset="${-off}"/>`; off += len; return s; }).join('');
  return `<svg class="sx-donut" viewBox="0 0 100 100" aria-hidden="true"><circle class="sx-track" cx="50" cy="50" r="42"/><g transform="rotate(-90 50 50)">${segs}</g></svg>`;
};
const sxLegend = parts => `<ul class="sx-lg">${parts.map((p, i) => `<li style="--i:${i}"><i style="--c:${p.color}"></i><span>${p.label}</span><span class="num">${p.n}</span></li>`).join('')}</ul>`;

async function loadSuper() {
  SA_KEY = '';
  const h = S.sa.hours;
  const [an, users, reports, reviews, avail] = await Promise.all([api('GET', '/superadmin/analytics?hours=' + h), api('GET', '/superadmin/users'), api('GET', '/superadmin/reports'), api('GET', '/superadmin/reviews'), api('GET', '/superadmin/availability?hours=' + h)]);
  Object.assign(S.sa, { an, users, reports, reviews, avail, loaded: true });
}
async function saReload(what = ['an', 'avail']) {   // refresh only what an action changed
  const h = S.sa.hours, m = { an: ['an', '/superadmin/analytics?hours=' + h], avail: ['avail', '/superadmin/availability?hours=' + h], users: ['users', '/superadmin/users'], reports: ['reports', '/superadmin/reports'], reviews: ['reviews', '/superadmin/reviews'] };
  const got = await Promise.all(what.map(k => api('GET', m[k][1]))); what.forEach((k, i) => S.sa[m[k][0]] = got[i]); await loadAll();
}
const pct = (n, t) => t ? Math.round(n / t * 100) : 0;
const statSelect = (s, cls = '') => `<div class="select sm ${cls}"><label class="sr" for="ss-${s.id}">Water status of ${esc(s.name)}</label><select id="ss-${s.id}" data-sa="sstat" data-id="${s.id}">${SKEYS.map(k => `<option value="${k}" ${s.status === k ? 'selected' : ''}>${SM[k].label}</option>`).join('')}</select>${ico('chevd', 14)}</div>`;
const kpi = (label, val, sub = '', cls = '', href = '') => `<${href ? 'a href="' + href + '"' : 'div'} class="kpi ${cls}"><dt>${label}</dt><dd class="num">${val}</dd>${sub ? `<small>${sub}</small>` : ''}</${href ? 'a' : 'div'}>`;
const sec = (t, body, link = '') => `<section class="card"><div class="sec-h"><h2>${t}</h2>${link}</div>${body}</section>`;

/* ---------- Dashboard ---------- */
SV.overview = () => {
  const a = S.sa.an, st = a.stations, tot = st.total || 1, pend = S.sa.reports.filter(r => r.status === 'pending');
  const stale = S.sa.avail.items.filter(x => x.stale).slice(0, 5);
  return `${aHead('Dashboard', 'A live view of every station, user and report in AquaFind.')}
  <dl class="kpis">${kpi('Registered users', a.users.total, `${a.users.newWeek} new this week · ${a.users.inactive} deactivated`, 'k-navy', '#/admin/users')}
  ${kpi('Water refill stations', st.total, 'in the network', 'k-ocean', '#/admin/stations')}
  ${kpi('Available', st.available, pct(st.available, tot) + '% of stations', 'k-ok', '#/admin/availability')}
  ${kpi('Low supply', st.low, pct(st.low, tot) + '% of stations', 'k-low', '#/admin/availability')}
  ${kpi('Out of water', st.out, pct(st.out, tot) + '% of stations', 'k-out', '#/admin/availability')}
  ${kpi('Closed', st.closed, pct(st.closed, tot) + '% of stations', 'k-closed', '#/admin/availability')}
  ${kpi('Pending reports', a.reports.pending, `${a.reports.approved} approved · ${a.reports.resolved} resolved`, a.reports.pending ? 'k-alert' : 'k-aqua', '#/admin/reports')}
  ${kpi('Outdated stations', st.stale, `no update in ${st.staleHours} h`, st.stale ? 'k-alert' : 'k-aqua', '#/admin/availability')}</dl>
  <div class="a-cols two">
  ${sec('Availability across stations', `<div class="supply-bar big" role="img" aria-label="${SKEYS.map(k => st[k] + ' ' + SM[k].label.toLowerCase()).join(', ')}">${SKEYS.filter(k => st[k]).map(k => `<i class="seg seg-${k}" style="flex:${st[k]}"></i>`).join('')}</div>
    <ul class="legend">${SKEYS.map(k => `<li>${gauge(k, 15)}<span class="num">${st[k]}</span><span>${SM[k].label}</span></li>`).join('')}</ul>
    <p class="muted pad">${a.waterReports24h} community water report${a.waterReports24h === 1 ? '' : 's'} in the last 24 hours. Average rating <b>${a.reviews.avg ? a.reviews.avg.toFixed(1) : '–'}</b> from ${a.reviews.total} review${a.reviews.total === 1 ? '' : 's'}.</p>`)}
  ${sec('Reviews needing attention', `<div class="mini-kpis"><a href="#/admin/reviews"><b class="num">${a.reviews.flagged}</b><span>flagged by users</span></a><a href="#/admin/reviews"><b class="num">${a.reviews.hidden}</b><span>hidden</span></a><a href="#/admin/users"><b class="num">${a.users.admins}</b><span>station admins</span></a></div>`)}</div>
  <div class="a-cols two">
  ${sec('Pending reports', pend.length ? `<ul class="alist">${pend.slice(0, 5).map(r => `<li><div><b>${esc(r.station)}</b><p>${esc(r.type)}</p><p class="muted">${esc(r.by)} · ${ago(r.t)}</p></div><span class="btnline"><button class="btn sm outline" data-act="rstat" data-id="${r.id}" data-p="approved">Approve</button><button class="btn sm quiet danger" data-act="rstat" data-id="${r.id}" data-p="rejected">Reject</button></span></li>`).join('')}</ul>` : '<p class="muted pad">No reports are waiting for review.</p>', '<a class="link" href="#/admin/reports">All reports</a>')}
  ${sec('Outdated availability', stale.length ? `<ul class="alist">${stale.map(x => `<li><div><b>${esc(x.name)}</b><p class="muted">Last update ${ago(x.upd)}</p></div><span class="st st-${x.status}">${gauge(x.status, 14)}<span>${SM[x.status].label}</span></span></li>`).join('')}</ul>` : `<p class="muted pad">Every station was updated in the last ${st.staleHours} hours.</p>`, '<a class="link" href="#/admin/availability">Monitor</a>')}</div>`;
};

/* ---------- Stations ---------- */
SV.stations = () => `${aHead('Stations', 'Add, edit and remove refill stations, and set what users see.', `<button class="btn primary" data-act="stnew">${ico('plus', 16)} Add station</button>`)}
  <div class="card map-card"><div id="admmap" class="mapbox adm-map" aria-label="Map of all stations"></div><p class="muted pad">Select a pin to edit that station.</p></div>
  ${tbl(['Station', 'Contact', 'Hours', 'Rating', 'Status', 'Updated', ''], ST.map(s => [`<b>${esc(s.name)}</b><br><span class="muted">${esc(s.addr)}</span>`, esc(s.tel), hrs(s), s.rcount ? `${stars(s.rating, 12)} <span class="num">${(+s.rating).toFixed(1)} (${s.rcount})</span>` : '<span class="muted">None</span>', statSelect(s), `<span class="num">${ago(s.upd)}</span>`,
    `<span class="btnline"><button class="btn sm outline" data-act="stedit" data-id="${s.id}">${ico('edit', 14)} Edit</button><button class="btn sm quiet danger" data-act="stdel" data-id="${s.id}">${ico('trash', 14)} Delete</button></span>`]), 'No stations yet. Add the first one.')}`;

function saMap() {
  const el = $('#admmap'); if (!el) return;
  if (!window.L) { el.innerHTML = '<div class="map-fail"><b>The map could not load.</b><span>Check your internet connection and refresh the page.</span></div>'; return; }
  const map = L.map(el, { zoomControl: false }); MAPS.lm = map; MAPS.mk = {};
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
  L.control.zoom({ position: 'topright' }).addTo(map);
  ST.forEach(s => { MAPS.mk[s.id] = L.marker([s.lat, s.lng], { icon: pinIcon(s, false), title: `${s.name}, ${SM[s.status].label}`, alt: s.name }).addTo(map).on('click', () => SAA.stedit({ dataset: { id: s.id } })); });
  ST.length ? map.fitBounds(ST.map(s => [s.lat, s.lng]), { padding: [40, 40], maxZoom: 15 }) : map.setView([9.787, 125.489], 13);
  setTimeout(() => MAPS.lm && MAPS.lm.invalidateSize(), 80);
}
const stForm = s => {
  const v = s || { name: '', addr: '', tel: '', o: 6, c: 20, lat: LOCS[0].lat, lng: LOCS[0].lng };
  return `<form id="stform" data-id="${s ? s.id : ''}" novalidate>${field({ id: 'sn', label: 'Station name', val: v.name })}${field({ id: 'sa', label: 'Address', val: v.addr })}${field({ id: 'sp', label: 'Contact number', type: 'tel', val: v.tel })}
  <div class="two">${field({ id: 'so', label: 'Opens (0–23)', type: 'number', val: v.o })}${field({ id: 'sc', label: 'Closes (1–24)', type: 'number', val: v.c })}</div>
  ${s ? '' : `<div class="field"><label for="sst">Starting water status</label><div class="select"><select id="sst">${SKEYS.map(k => `<option value="${k}">${SM[k].label}</option>`).join('')}</select>${ico('chevd', 14)}</div></div>`}
  <div class="field"><label>Location</label><div id="pickmap" class="mapbox pick" aria-label="Click the map to place the station"></div><p class="hint">Click the map or drag the pin, or type the coordinates.</p></div>
  <div class="two">${field({ id: 'sla', label: 'Latitude', type: 'number', val: v.lat })}${field({ id: 'slo', label: 'Longitude', type: 'number', val: v.lng })}</div>
  <p class="ferr" id="sterr" role="alert"></p><div class="btnrow"><button class="btn primary" type="submit">${s ? 'Save station' : 'Add station'}</button><button type="button" class="btn quiet" data-act="close">Cancel</button></div></form>`;
};
function pickMap(lat, lng) {
  const el = $('#pickmap'); if (!el || !window.L) return;
  const map = L.map(el, { zoomControl: true, attributionControl: false }); MAPS.pick = map;
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  const mk = L.marker([lat, lng], { draggable: true, keyboard: false }).addTo(map);
  const set = ll => { mk.setLatLng(ll); $('#sla').value = +ll.lat.toFixed(6); $('#slo').value = +ll.lng.toFixed(6); };
  map.on('click', e => set(e.latlng)); mk.on('dragend', () => set(mk.getLatLng()));
  const sync = () => { const a = parseFloat($('#sla').value), o = parseFloat($('#slo').value); if (a >= -90 && a <= 90 && o >= -180 && o <= 180) { mk.setLatLng([a, o]); map.panTo([a, o]); } };
  $('#sla').addEventListener('change', sync); $('#slo').addEventListener('change', sync);
  map.setView([lat, lng], 15); setTimeout(() => map.invalidateSize(), 120);
}
const stDlg = (title, s) => { modal(`<div class="dlg-h"><h2>${title}</h2><button class="icon-btn dlg-x" data-act="close" aria-label="Close">${ico('x', 18)}</button></div>${stForm(s)}`, title); pickMap(s ? s.lat : LOCS[0].lat, s ? s.lng : LOCS[0].lng); };
SAA.stnew = () => stDlg('Add station');
SAA.stedit = el => { const s = get(el.dataset.id); if (s) stDlg('Edit station', s); };
SAA.stdel = el => { const s = get(el.dataset.id); if (!s) return;
  modal(`<div class="dlg-h"><h2>Delete this station?</h2><button class="icon-btn dlg-x" data-act="close" aria-label="Close">${ico('x', 18)}</button></div><p class="muted"><b>${esc(s.name)}</b> will be removed with its status history, saved-station entries, reports, reviews and notifications. Its station admin becomes a regular user. This can't be undone.</p><div class="btnrow"><button class="btn danger-solid" data-act="stdelok" data-id="${s.id}">Delete station</button><button class="btn quiet" data-act="close">Cancel</button></div>`, 'Delete station'); };
SAA.stdelok = async el => { busy(el, true, 'Deleting…'); try { await api('DELETE', '/stations/' + el.dataset.id); closeModal(); await saReload(['an', 'avail', 'users', 'reports', 'reviews']); S.saved = S.saved.filter(x => get(x)); renderKeep(); toast('Station deleted', 'ok'); } catch (e) { busy(el, false); closeModal(); fail(e); } };
SAF.stform = async f => {
  formErr('sterr', ''); const o = $('#so').value, c = $('#sc').value, la = $('#sla').value, lo = $('#slo').value;
  const ok = [setErr('sn', val('sn') ? '' : 'Enter the station name.'), setErr('sa', val('sa') ? '' : 'Enter the address.'), setErr('sp', val('sp') ? '' : 'Enter a contact number.'),
    setErr('so', o !== '' && +o >= 0 && +o <= 23 && Number.isInteger(+o) ? '' : 'Enter a whole hour from 0 to 23.'), setErr('sc', c !== '' && +c >= 1 && +c <= 24 && +c > +o && Number.isInteger(+c) ? '' : 'Closing must be later than opening, up to 24.'),
    setErr('sla', la !== '' && +la >= -90 && +la <= 90 ? '' : 'Latitude must be -90 to 90.'), setErr('slo', lo !== '' && +lo >= -180 && +lo <= 180 ? '' : 'Longitude must be -180 to 180.')].every(Boolean); if (!ok) return;
  const id = f.dataset.id, b = f.querySelector('[type=submit]'), body = { name: val('sn'), addr: val('sa'), tel: val('sp'), o: +o, c: +c, lat: +la, lng: +lo };
  if (!id) body.status = $('#sst').value; busy(b, true, 'Saving…');
  try { await api(id ? 'PUT' : 'POST', id ? '/stations/' + id : '/stations', body); await saReload(['an', 'avail']); closeModal(); renderKeep(); toast(id ? 'Station saved' : 'Station added', 'ok'); }
  catch (e) { busy(b, false); if (e.status === 401) return fail(e); formErr('sterr', e.message); }
};
SAC.sstat = async t => {
  const id = t.dataset.id, s = get(id), was = s.status; t.disabled = true;
  try { Object.assign(s, await api('PUT', '/stations/' + id + '/availability', { status: t.value })); await saReload(['an', 'avail']); renderKeep(); toast(`${s.name} is now ${SM[s.status].label.toLowerCase()}. Followers were notified.`, 'ok'); }
  catch (e) { t.value = was; t.disabled = false; fail(e); }
};

/* ---------- Availability monitor ---------- */
SV.availability = () => {
  const a = S.sa.avail, st = S.sa.an.stations, items = a.items, tot = items.length || 1, stale = items.filter(x => x.stale).length;
  const avgAge = items.length ? items.reduce((n, x) => n + (Date.now() - x.upd), 0) / items.length : 0;
  return `${aHead('Availability monitor', 'Latest status of every station, and which ones have not been updated recently.', `<div class="select sm"><label class="sr" for="hrs">Outdated after</label><select id="hrs" data-sa="hours">${[[6, '6 hours'], [12, '12 hours'], [24, '24 hours'], [72, '3 days'], [168, '7 days']].map(o => `<option value="${o[0]}" ${a.hours === o[0] ? 'selected' : ''}>Outdated after ${o[1]}</option>`).join('')}</select>${ico('chevd', 14)}</div>`)}
  <dl class="kpis small">${kpi('Stations monitored', items.length)}${kpi('Outdated', stale, `no update in ${a.hours >= 24 ? a.hours / 24 + ' d' : a.hours + ' h'}`, stale ? 'k-alert' : 'k-aqua')}${kpi('Average age of status', items.length ? dur(avgAge) : '–', 'across all stations')}${kpi('Changes, last 7 days', items.reduce((n, x) => n + x.changes7d, 0), 'status updates')}</dl>
  ${sec('Statistics', `<div class="stat-rows">${SKEYS.map(k => `<div class="stat-row"><span class="st st-${k}">${gauge(k, 16)}<span>${SM[k].label}</span></span><i class="stat-bar"><i class="seg-${k}" style="width:${pct(st[k], tot)}%"></i></i><b class="num">${st[k]}</b><span class="muted num">${pct(st[k], tot)}%</span></div>`).join('')}</div>`)}
  ${tbl(['Station', 'Status', 'Last update', 'Changes (7 d)', 'Community (3 h)', 'Freshness', 'Set status'], items.map(x => [`<b>${esc(x.name)}</b><br><span class="muted">${esc(x.addr)}</span>`, `<span class="st st-${x.status}">${gauge(x.status, 14)}<span>${SM[x.status].label}</span></span>`, `${dateTime(x.upd)}<br><span class="muted">${ago(x.upd)}</span>`, `<span class="num">${x.changes7d}</span>`, `<span class="num">${x.yes} water / ${x.no} none</span>`, x.stale ? `<span class="tag rs-rejected">${ico('alert', 12)} Outdated</span>` : '<span class="tag ok">Fresh</span>', statSelect(get(x.id) || { id: x.id, name: x.name, status: x.status })]), 'No stations.')}`;
};
SAC.hours = async t => { S.sa.hours = +t.value; try { await saReload(['an', 'avail']); renderKeep(); } catch (e) { fail(e); } };

/* ---------- Reports ---------- */
const RSTATS = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['resolved', 'Resolved'], ['all', 'All']];
SV.reports = () => {
  const L = S.sa.reports, f = S.sa.rs, l = L.filter(r => f === 'all' || r.status === f), cnt = k => k === 'all' ? L.length : L.filter(r => r.status === k).length;
  return `${aHead('Report management', 'Review corrections from users. Approve valid reports, reject the rest, and mark them resolved once fixed.')}
  <div class="tabs" role="tablist" aria-label="Filter reports">${RSTATS.map(c => `<button role="tab" class="tab ${f === c[0] ? 'on' : ''}" aria-selected="${f === c[0]}" data-act="sars" data-p="${c[0]}">${c[1]} <span class="num">${cnt(c[0])}</span></button>`).join('')}</div>
  ${tbl(['Reported', 'Station', 'By', 'Issue', 'Details', 'Status', ''], l.map(r => [`${dateTime(r.t)}`, `<a href="#/station/${r.sid}">${esc(r.station)}</a>`, esc(r.by), esc(r.type), esc(r.note || '—') + (r.adminNote ? `<br><span class="muted">Note: ${esc(r.adminNote)}</span>` : ''), rtag(r.status),
    `<span class="btnline">${r.status === 'pending' ? `<button class="btn sm outline" data-act="rstat" data-id="${r.id}" data-p="approved">Approve</button><button class="btn sm quiet danger" data-act="rstat" data-id="${r.id}" data-p="rejected">Reject</button>` : ''}<button class="btn sm quiet" data-act="srev" data-id="${r.id}">Update</button></span>`]), 'No reports in this view.')}`;
};
SAA.sars = el => { S.sa.rs = el.dataset.p; render(); };
SAA.srev = el => {
  const r = S.sa.reports.find(x => x.id == el.dataset.id); if (!r) return;
  modal(`<div class="dlg-h"><h2>Update report</h2><button class="icon-btn dlg-x" data-act="close" aria-label="Close">${ico('x', 18)}</button></div>
  <div class="ref"><b>${esc(r.station)}</b><span>${esc(r.type)}</span><span class="muted">${esc(r.note || 'No details')} · ${esc(r.by)} · ${ago(r.t)}</span></div>
  <form id="repform" data-id="${r.id}" novalidate><fieldset class="field"><legend>Status</legend><div class="radios stat2">${['pending', 'approved', 'rejected', 'resolved'].map(k => `<label class="radio ${r.status === k ? 'on' : ''}"><input type="radio" name="rst" value="${k}" ${r.status === k ? 'checked' : ''}><span>${RS[k]}</span></label>`).join('')}</div></fieldset>
  <div class="field"><label for="rnote">Note to the reporter <span class="opt">optional</span></label><textarea id="rnote" rows="3" maxlength="300" placeholder="e.g. Hours corrected on 7 Nov.">${esc(r.adminNote || '')}</textarea></div>
  <p class="ferr" id="rperr" role="alert"></p><div class="btnrow"><button class="btn primary" type="submit">Save</button><button type="button" class="btn quiet" data-act="close">Cancel</button></div></form>`, 'Update report');
};
document.addEventListener('change', e => { if (e.target.name === 'rst') $$('.radios.stat2 .radio').forEach(l => l.classList.toggle('on', l.querySelector('input').checked)); });
SAF.repform = async f => {
  const st = $('input[name=rst]:checked', f).value, id = +f.dataset.id, b = f.querySelector('[type=submit]'); busy(b, true, 'Saving…');
  try { await api('PUT', '/reports/' + id + '/status', { status: st, note: $('#rnote').value }); await saReload(['an', 'reports']); closeModal(); renderKeep(); toast('Report updated', 'ok'); }
  catch (e) { busy(b, false); if (e.status === 401) return fail(e); formErr('rperr', e.message); }
};

/* ---------- Reviews ---------- */
const VSTATS = [['flagged', 'Flagged'], ['hidden', 'Hidden'], ['published', 'Published'], ['all', 'All']];
const rvState = r => r.status === 'hidden' ? 'hidden' : r.flags > 0 ? 'flagged' : 'published';
const rvCounts = L => { const c = { flagged: 0, hidden: 0, published: 0, all: L.length }; L.forEach(r => c[rvState(r)]++); return c; };
const rvFiltered = () => { const f = S.sa.vs, q = (S.sa.vq || '').trim().toLowerCase(); return S.sa.reviews.filter(r => (f === 'all' || rvState(r) === f) && (!q || (r.station + ' ' + r.by + ' ' + (r.comment || '')).toLowerCase().includes(q))); };
const rvBtns = r => r.status === 'hidden'
  ? `<button class="btn sm outline" data-act="rvmod" data-id="${r.id}" data-p="visible">Restore</button>`
  : `<button class="btn sm outline" data-act="rvmod" data-id="${r.id}" data-p="hidden">Hide</button>${r.flags ? `<button class="btn sm quiet" data-act="rvmod" data-id="${r.id}" data-p="visible">Dismiss flags</button>` : ''}`;
const rvCard = (r, i) => { const st = rvState(r);
  return `<li class="sx-rc is-${st}" style="--i:${Math.min(i, 9)}"><div class="sx-rc-h">${avatar({ name: r.by }, 36, 'sx-avg')}<div class="sx-rc-who"><b>${esc(r.by)}</b><span title="${esc(dateTime(r.t))}">${ago(r.t)}</span></div><div class="sx-rc-r">${stars(r.rating, 12)}<span class="num">${(+r.rating).toFixed(1)}</span></div></div>
  <a class="sx-rc-st" href="#/station/${r.sid}">${ico('store', 14)}<span>${esc(r.station)}</span></a>
  <p class="sx-rc-c${r.comment ? '' : ' muted'}">${esc(r.comment || 'No comment was written.')}</p>
  <div class="sx-rc-f"><span class="tags">${st === 'hidden' ? '<span class="tag rs-rejected">Hidden</span>' : st === 'flagged' ? `<span class="tag rs-rejected">Flagged${r.flags ? ' · ' + r.flags + ' flag' + (r.flags === 1 ? '' : 's') : ''}</span>` : '<span class="tag ok">Published</span>'}${r.flags && st !== 'flagged' ? `<span class="muted">${r.flags} flag${r.flags === 1 ? '' : 's'}</span>` : ''}</span><span class="btnline">${rvBtns(r)}<button class="btn sm quiet danger" data-act="rvrm" data-id="${r.id}">Delete</button></span></div></li>`; };
const rvCards = l => l.length ? l.map(rvCard).join('') : '<li class="sx-empty">No reviews in this view.</li>';
SV.reviews = () => {
  const L = S.sa.reviews, c = rvCounts(L), n = L.length, an = S.sa.an && S.sa.an.reviews, f = S.sa.vs, l = rvFiltered();
  const avg = an && an.avg ? an.avg : n ? L.reduce((t, r) => t + (+r.rating || 0), 0) / n : 0;
  const dist = [5, 4, 3, 2, 1].map(k => L.filter(r => Math.min(5, Math.max(1, Math.round(r.rating))) === k).length), mx = Math.max(1, ...dist), pub = pct(c.published, n);
  const parts = [{ label: 'Published', n: c.published, color: SX.green }, { label: 'Flagged', n: c.flagged, color: SX.clay }, { label: 'Hidden', n: c.hidden, color: SX.gray }];
  return `<div class="sx${SA_FX ? ' fx' : ''}">${aHead('Review management', 'Reviews that users flagged appear first. Hide inappropriate feedback or remove it entirely.')}
  <dl class="sx-kpis">${sxKpi('Total reviews', n, 'sx-rv-n', 'from all stations', SX.green, 0)}${sxKpi('Average rating', n ? avg.toFixed(1) : '–', 'sx-rv-avg', 'out of 5 stars', SX.blue, 1, { plain: true })}${sxKpi('Flagged', c.flagged, 'sx-rv-fl', 'need attention', SX.clay, 2, { tint: true, dot: c.flagged > 0 })}${sxKpi('Hidden', c.hidden, 'sx-rv-hd', 'not shown to users', SX.navy, 3)}</dl>
  <div class="sx-cols"><section class="sx-card" style="--i:0"><h2>Moderation</h2><div class="sx-dn"><div class="sx-donut-w" role="img" aria-label="${pub}% published: ${c.published} published, ${c.flagged} flagged, ${c.hidden} hidden">${sxDonut(parts)}<div class="sx-dc"><b><span class="num" data-count="${pub}" data-key="sx-rv-pct">${pub}</span>%</b><small>published</small></div></div>${sxLegend(parts)}</div></section>
  <section class="sx-card" style="--i:1"><h2>Rating breakdown</h2><div class="sx-bars">${[5, 4, 3, 2, 1].map((k, i) => `<div class="sx-br"><span>${k} star${k > 1 ? 's' : ''}</span><span class="sx-bar"><i style="width:${dist[i] / mx * 100}%;--c:${k === 5 ? SX_GRAD : k === 4 ? SX.blue : k === 1 ? '#E0524F' : '#F0998F'};--i:${i}"></i></span><b class="num">${dist[i]}</b></div>`).join('')}</div></section></div>
  <div class="sx-search">${ico('search', 18)}<label class="sr" for="vq">Search reviews</label><input id="vq" data-sa="vq" type="search" value="${esc(S.sa.vq || '')}" placeholder="Search station, author or comment" autocomplete="off"></div>
  <div class="sx-tabs" role="tablist" aria-label="Filter reviews">${VSTATS.map(t => `<button role="tab" class="sx-tab ${f === t[0] ? 'on' : ''}" aria-selected="${f === t[0]}" data-act="savs" data-p="${t[0]}">${t[1]} <span class="num">${c[t[0]]}</span></button>`).join('')}</div>
  <p class="sx-count" id="rvcount" aria-live="polite">${l.length} of ${n} reviews</p><ul class="sx-rv${SA_FX ? ' sx-in' : ''}" id="rvlist">${rvCards(l)}</ul></div>`;
};
const rvFilter = anim => {
  const l = rvFiltered(), box = $('#rvlist'); if (!box) return;
  box.className = anim ? 'sx-rv sx-in' : 'sx-rv'; box.innerHTML = rvCards(l);
  $('#rvcount').textContent = `${l.length} of ${S.sa.reviews.length} reviews`;
  $$('.sx-tab[data-act=savs]').forEach(b => { const on = b.dataset.p === S.sa.vs; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
};
SAA.savs = el => { S.sa.vs = el.dataset.p; rvFilter(true); };
SAI.vq = t => { S.sa.vq = t.value; rvFilter(false); };
SAA.rvmod = async el => { busy(el, true, '…'); try { await api('PUT', '/superadmin/reviews/' + el.dataset.id, { status: el.dataset.p }); await saReload(['an', 'reviews']); renderKeep(); toast(el.dataset.p === 'hidden' ? 'Review hidden from users' : 'Review is visible', 'ok'); } catch (e) { busy(el, false); fail(e); } };
SAA.rvrm = el => modal(`<div class="dlg-h"><h2>Delete this review?</h2><button class="icon-btn dlg-x" data-act="close" aria-label="Close">${ico('x', 18)}</button></div><p class="muted">The review is removed permanently. To keep a record, choose Hide instead.</p><div class="btnrow"><button class="btn danger-solid" data-act="rvrmok" data-id="${el.dataset.id}">Delete review</button><button class="btn quiet" data-act="close">Cancel</button></div>`, 'Delete review');
SAA.rvrmok = async el => { busy(el, true, 'Deleting…'); try { await api('DELETE', '/superadmin/reviews/' + el.dataset.id); closeModal(); await saReload(['an', 'reviews']); renderKeep(); toast('Review deleted', 'ok'); } catch (e) { busy(el, false); closeModal(); fail(e); } };

/* ---------- Users ---------- */
const UFILT = [['all', 'All'], ['user', 'Users'], ['admin', 'Station admins'], ['superadmin', 'System admins'], ['inactive', 'Deactivated']];
const uMatch = (u, r, q) => (r === 'all' || (r === 'inactive' ? !u.active : u.role === r)) && (!q || (u.name + ' ' + u.email).toLowerCase().includes(q));
const uCnt = k => S.sa.users.filter(u => uMatch(u, k, '')).length;
SV.users = () => {
  const U = S.sa.users, q = S.sa.uq.trim().toLowerCase(), r = S.sa.ur, me = S.user.id, n = U.length, l = U.filter(u => uMatch(u, r, q));
  const act = U.filter(u => u.active).length, adm = U.filter(u => u.role === 'admin').length, wk = U.filter(u => Date.now() - u.since < 7 * 864e5).length;
  const parts = [{ label: 'Users', n: U.filter(u => u.active && u.role === 'user').length, color: SX.blue }, { label: 'Station admins', n: U.filter(u => u.active && u.role === 'admin').length, color: SX.teal }, { label: 'System admins', n: U.filter(u => u.active && u.role === 'superadmin').length, color: SX.navy }, { label: 'Deactivated', n: n - act, color: SX.gray }];
  const newest = U.slice().sort((a, b) => b.since - a.since).slice(0, 5);
  return `<div class="sx${SA_FX ? ' fx' : ''}">${aHead('User management', 'Activate or deactivate accounts and assign roles. Deactivated users are signed out immediately.')}
  <dl class="sx-kpis">${sxKpi('Total users', n, 'sx-u-n', 'registered accounts', SX.teal, 0)}${sxKpi('Active', act, 'sx-u-act', pct(act, n) + '% of all users', SX.blue, 1)}${sxKpi('Station admins', adm, 'sx-u-adm', 'manage one station each', '#51607A', 2)}${sxKpi('New this week', wk, 'sx-u-wk', 'joined in the last 7 days', SX.teal, 3)}</dl>
  <div class="sx-cols"><section class="sx-card" style="--i:0"><h2>Accounts by role</h2><div class="sx-dn"><div class="sx-donut-w" role="img" aria-label="${n} accounts: ${parts.map(p => p.n + ' ' + p.label.toLowerCase()).join(', ')}">${sxDonut(parts)}<div class="sx-dc"><b class="num" data-count="${n}" data-key="sx-u-tot">${n}</b><small>accounts</small></div></div>${sxLegend(parts)}</div></section>
  <section class="sx-card" style="--i:1"><h2>Newest members</h2>${newest.length ? `<ul class="sx-nm">${newest.map((u, i) => `<li style="--i:${i}">${avatar({ name: u.name, avatar: u.avatar }, 38, 'sx-avb')}<span class="who"><b>${esc(u.name)}</b><span class="em">${esc(u.email)}</span></span><span class="rt"><span class="tag role-${u.role}">${ROLE_L[u.role]}</span><span>${ago(u.since)}</span></span></li>`).join('')}</ul>` : '<p class="muted">No members yet.</p>'}</section></div>
  <div class="sx-search">${ico('search', 18)}<label class="sr" for="uq">Search users</label><input id="uq" data-sa="uq" type="search" value="${esc(S.sa.uq)}" placeholder="Search name or email" autocomplete="off"></div>
  <div class="sx-chips" role="group" aria-label="Filter users">${UFILT.map(c => `<button type="button" class="sx-chip ${r === c[0] ? 'on' : ''}" aria-pressed="${r === c[0]}" data-act="saur" data-p="${c[0]}">${c[1]} <span class="n">${uCnt(c[0])}</span></button>`).join('')}</div>
  <p class="sx-count" id="ucount" aria-live="polite">${l.length} of ${n} users</p><div id="utbl"${SA_FX ? ' class="sx-in"' : ''}>${userTable(l, me)}</div></div>`;
};
const userTable = (l, me) => tbl(['User', 'Role', 'Station', 'Activity', 'Joined', 'Status', ''], l.map(u => [`<span class="who">${avatar({ name: u.name, avatar: u.avatar }, 32)}<span><b>${esc(u.name)}${u.id === me ? ' (you)' : ''}</b><br><span class="muted">${esc(u.email)}</span></span></span>`,
  `<span class="tag role-${u.role}">${ROLE_L[u.role]}</span>`, u.station ? esc((get(u.station) || {}).name || u.station) : '<span class="muted">—</span>', `<span class="num muted">${u.saved} saved · ${u.reviews} reviews · ${u.reports} reports</span>`, new Date(u.since).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }),
  u.active ? '<span class="tag ok">Active</span>' : '<span class="tag rs-rejected">Deactivated</span>',
  u.id === me ? '' : `<span class="btnline"><button class="btn sm outline" data-act="urole" data-id="${u.id}">Role</button><button class="btn sm quiet ${u.active ? 'danger' : ''}" data-act="uact" data-id="${u.id}" data-p="${u.active ? 0 : 1}">${u.active ? 'Deactivate' : 'Activate'}</button></span>`]), 'No users match.');
const usersFilter = anim => {
  const q = S.sa.uq.trim().toLowerCase(), r = S.sa.ur, l = S.sa.users.filter(u => uMatch(u, r, q)), box = $('#utbl'); if (!box) return;
  box.className = anim ? 'sx-in' : ''; box.innerHTML = userTable(l, S.user.id); $('#ucount').textContent = `${l.length} of ${S.sa.users.length} users`;
  $$('.sx-chip[data-act=saur]').forEach(b => { const on = b.dataset.p === r; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
};
SAI.uq = t => { S.sa.uq = t.value; usersFilter(false); };
SAA.saur = el => { S.sa.ur = el.dataset.p; usersFilter(true); };
SAA.uact = el => {
  const u = S.sa.users.find(x => x.id == el.dataset.id), on = el.dataset.p === '1'; if (!u) return;
  if (on) return SAA.uactok({ dataset: { id: u.id, p: 1 } });
  modal(`<div class="dlg-h"><h2>Deactivate ${esc(u.name)}?</h2><button class="icon-btn dlg-x" data-act="close" aria-label="Close">${ico('x', 18)}</button></div><p class="muted">They are signed out right away and cannot sign in until you activate the account again. Their reviews and reports are kept.</p><div class="btnrow"><button class="btn danger-solid" data-act="uactok" data-id="${u.id}" data-p="0">Deactivate account</button><button class="btn quiet" data-act="close">Cancel</button></div>`, 'Deactivate account');
};
SAA.uactok = async el => { const btn = el.nodeType ? el : null; busy(btn, true, 'Saving…'); try { await api('PUT', '/superadmin/users/' + el.dataset.id, { active: el.dataset.p == 1 }); await saReload(['an', 'users']); closeModal(); renderKeep(); toast(el.dataset.p == 1 ? 'Account activated' : 'Account deactivated', 'ok'); } catch (e) { busy(btn, false); closeModal(); fail(e); } };
SAA.urole = el => {
  const u = S.sa.users.find(x => x.id == el.dataset.id); if (!u) return;
  modal(`<div class="dlg-h"><h2>Role for ${esc(u.name)}</h2><button class="icon-btn dlg-x" data-act="close" aria-label="Close">${ico('x', 18)}</button></div>
  <form id="roleform" data-id="${u.id}" novalidate><div class="field"><label for="rr">Role</label><div class="select"><select id="rr" data-sa="rolesel">${['user', 'admin', 'superadmin'].map(k => `<option value="${k}" ${u.role === k ? 'selected' : ''}>${ROLE_L[k]}</option>`).join('')}</select>${ico('chevd', 14)}</div></div>
  <div class="field" id="rstwrap" ${u.role === 'admin' ? '' : 'hidden'}><label for="rst2">Station they manage</label><div class="select"><select id="rst2">${ST.map(s => `<option value="${s.id}" ${u.station === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>${ico('chevd', 14)}</div></div>
  <p class="hint" id="rhint">${roleHint(u.role)}</p><p class="ferr" id="rolerr" role="alert"></p><div class="btnrow"><button class="btn primary" type="submit">Save role</button><button type="button" class="btn quiet" data-act="close">Cancel</button></div></form>`, 'Change role');
};
const roleHint = r => ({ user: 'Regular account: finds, saves, reviews and reports stations.', admin: 'Can update availability, information and reports for one station only.', superadmin: 'Full access to every station, user, report and review. Grant sparingly.' }[r]);
SAC.rolesel = t => { $('#rstwrap').hidden = t.value !== 'admin'; $('#rhint').textContent = roleHint(t.value); };
SAF.roleform = async f => {
  const b = f.querySelector('[type=submit]'), role = $('#rr').value; busy(b, true, 'Saving…');
  try { await api('PUT', '/superadmin/users/' + f.dataset.id, role === 'admin' ? { role, station: $('#rst2').value } : { role }); await saReload(['an', 'users']); closeModal(); renderKeep(); toast('Role updated', 'ok'); }
  catch (e) { busy(b, false); if (e.status === 401) return fail(e); formErr('rolerr', e.message); }
};

/* ---------- Shell ---------- */
function superView(sec) {
  if (!SV[sec]) sec = 'overview';
  SA_FX = !!S.sa.loaded && (S.user.id + ':' + sec) !== SA_KEY;   // intro animation only on arrival at a section
  if (S.sa.loaded) SA_KEY = S.user.id + ':' + sec;
  if (SA_FX) Object.keys(CU).forEach(k => { if (k.startsWith('sx-')) delete CU[k]; });
  const a = S.sa.an, pend = S.sa.loaded ? S.sa.reports.filter(r => r.status === 'pending').length : 0, flagged = S.sa.loaded && a ? a.reviews.flagged : 0;
  return `<div class="adm sup"><aside class="adm-side"><a class="brand" href="#/admin">${logo(24, { light: true })}<span>AquaFind</span></a><p class="adm-st"><span>System console</span>${esc(S.user.name)}</p>
  <nav aria-label="System sections">${SA_SECTIONS.map(x => `<a href="#/admin/${x[0]}" class="${sec === x[0] ? 'on' : ''}" ${sec === x[0] ? 'aria-current="page"' : ''}>${ico(x[2], 17)}<span>${x[1]}</span>${x[0] === 'reports' && pend ? `<b class="cnt num">${pend}</b>` : ''}${x[0] === 'reviews' && flagged ? `<b class="cnt num">${flagged}</b>` : ''}</a>`).join('')}</nav>
  <div class="adm-foot"><a href="#/">${ico('back', 15)} Back to app</a><button class="link" data-act="logout">${ico('logout', 15)} Sign out</button></div></aside>
  <main class="adm-main" id="main">${S.sa.loaded ? SV[sec]() : skRows(5)}</main></div>`;
}
function saAfter(sec) { if (sec === 'stations') saMap(); }