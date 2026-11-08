/* AquaFind system console (role "superadmin"): analytics, stations + map, availability monitor, reports, reviews, users.
   Loaded after admin.js (uses tbl, aHead, dur) and before main.js (which delegates clicks, changes, inputs and submits to SAA, SAC, SAI, SAF). */
'use strict';
const SAA = {}, SAC = {}, SAI = {}, SAF = {};
const SA_SECTIONS = [['overview', 'Dashboard', 'chart'], ['stations', 'Stations', 'store'], ['availability', 'Availability', 'drop'], ['reports', 'Reports', 'flag'], ['reviews', 'Reviews', 'star'], ['users', 'Users', 'users']];
const SV = {};
const ROLE_L = { user: 'User', admin: 'Station admin', superadmin: 'System admin' };

async function loadSuper() {
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

/* ---------- Shared helpers: Availability + Reports (arrival animation, donut, KPI) ---------- */
let SA_LAST = '';
const saFresh = k => { const f = SA_LAST !== k; SA_LAST = k; return f; };   // animate a page only when you arrive on it, not on every refresh
addEventListener('hashchange', () => { SA_LAST = ''; Object.keys(CU).forEach(k => k.startsWith('sa-') && delete CU[k]); });
const skpi = (label, val, key, sub, cls = '', attrs = '') => `<${attrs ? 'button type="button"' : 'div'} class="kpi ${cls}" ${attrs}><dt>${label}</dt><dd class="num"${typeof val === 'number' ? ` data-count="${val}" data-key="${key}"` : ''}>${val}</dd>${sub ? `<small>${sub}</small>` : ''}</${attrs ? 'button' : 'div'}>`;
const donut = (segs, big, small, key) => {
  const live = segs.filter(s => s.v), tot = live.reduce((n, s) => n + s.v, 0) || 1; let off = 0;
  const arcs = live.map((s, i) => { const p = s.v / tot * 100, len = Math.max(p - (live.length > 1 ? 1.6 : 0), .6);
    const c = `<circle class="dn-seg ${s.c}" cx="21" cy="21" r="15.9155" pathLength="100" style="stroke-dasharray:${len.toFixed(2)} ${(100 - len).toFixed(2)};stroke-dashoffset:${(-off).toFixed(2)};--i:${i}"/>`; off += p; return c; }).join('');
  return `<div class="dn" role="img" aria-label="${segs.map(s => s.v + ' ' + s.l).join(', ')}"><svg viewBox="0 0 42 42" aria-hidden="true"><circle class="dn-bg" cx="21" cy="21" r="15.9155"/>${arcs}</svg><div class="dn-c"><b class="num"><span data-count="${big}" data-key="${key}">${big}</span>%</b><span>${small}</span></div></div>`;
};

/* ---------- Availability monitor ---------- */
const AV_F = [['all', 'All'], ['available', 'Available'], ['low', 'Low supply'], ['out', 'Out of water'], ['closed', 'Closed'], ['stale', 'Outdated']];
const avList = () => { const f = S.sa.af || 'all', q = (S.sa.aq || '').trim().toLowerCase();
  return S.sa.avail.items.filter(x => (f === 'all' || (f === 'stale' ? x.stale : x.status === f)) && (!q || (x.name + ' ' + x.addr).toLowerCase().includes(q))); };
const avTable = l => { const lim = S.sa.avail.hours * 3600000;
  return tbl(['Station', 'Status', 'Last update', 'Changes (7 d)', 'Community (3 h)', 'Freshness', 'Set status'], l.map(x => { const r = (Date.now() - x.upd) / lim, lv = r >= 1 ? 'bad' : r >= .5 ? 'warn' : 'good';
    return [`<b>${esc(x.name)}</b><br><span class="muted">${esc(x.addr)}</span>`, `<span class="st st-${x.status}">${gauge(x.status, 14)}<span>${SM[x.status].label}</span></span>`, `${dateTime(x.upd)}<br><span class="muted">${ago(x.upd)}</span>`,
      `<span class="chg num" title="${x.changes7d} status updates in the last 7 days"><i style="--w:${Math.min(48, x.changes7d * 6)}px"></i>${x.changes7d}</span>`, `<span class="num"><span class="cm-y">${x.yes} water</span> / <span class="cm-n">${x.no} none</span></span>`,
      `<span class="fresh f-${lv}" title="${ago(x.upd)}"><i style="--w:${Math.max(7, Math.min(100, r * 100)).toFixed(0)}%"></i></span><small class="fresh-t f-${lv}">${x.stale ? 'Outdated' : 'Fresh'} · ${ago(x.upd)}</small>`, statSelect(get(x.id) || { id: x.id, name: x.name, status: x.status })]; }), 'No stations match this view.'); };
const avFilter = () => { const l = avList(); $('#atbl').innerHTML = avTable(l); $('#acount').textContent = `${l.length} of ${S.sa.avail.items.length} stations`; };
SV.availability = () => {
  const fx = saFresh('availability'), a = S.sa.avail, items = a.items, tot = items.length || 1, stale = items.filter(x => x.stale).length, f = S.sa.af || 'all';
  const n = k => items.filter(x => x.status === k).length, cnt = k => k === 'all' ? items.length : k === 'stale' ? stale : n(k);
  const avgAge = items.length ? items.reduce((s, x) => s + (Date.now() - x.upd), 0) / items.length : 0, chg = items.reduce((s, x) => s + x.changes7d, 0), ok = pct(n('available'), tot);
  return `<div class="sa sa-av${fx ? ' sa-fx' : ''}">${aHead('Availability monitor', 'Latest status of every station, and which ones have not been updated recently.', `<div class="select sm"><label class="sr" for="hrs">Outdated after</label><select id="hrs" data-sa="hours">${[[6, '6 hours'], [12, '12 hours'], [24, '24 hours'], [72, '3 days'], [168, '7 days']].map(o => `<option value="${o[0]}" ${a.hours === o[0] ? 'selected' : ''}>Outdated after ${o[1]}</option>`).join('')}</select>${ico('chevd', 14)}</div>`)}
  <dl class="kpis small">${skpi('Stations monitored', items.length, 'sa-av-n', 'in the network', 'k-aqua')}${skpi(`Outdated${stale ? '<i class="sa-ping" aria-hidden="true"></i>' : ''}`, stale, 'sa-av-s', `no update in ${a.hours >= 24 ? a.hours / 24 + ' d' : a.hours + ' h'}`, stale ? 'k-alert' : 'k-ok')}${skpi('Average age of status', items.length ? dur(avgAge) : '–', 'sa-av-a', 'across all stations', 'k-low')}${skpi('Changes, last 7 days', chg, 'sa-av-c', 'status updates', 'k-aqua')}</dl>
  ${sec('Supply overview', `<div class="sa-ov">${donut(SKEYS.map(k => ({ c: 'dn-' + k, v: n(k), l: SM[k].label.toLowerCase() })), ok, 'available', 'sa-av-p')}<div class="stat-rows">${SKEYS.map((k, i) => `<div class="stat-row"><span class="st st-${k}">${gauge(k, 16)}<span>${SM[k].label}</span></span><i class="stat-bar"><i class="seg-${k} sa-grow" style="width:${pct(n(k), tot)}%;--i:${i}"></i></i><b class="num">${n(k)}</b><span class="muted num">${pct(n(k), tot)}%</span></div>`).join('')}</div></div>`)}
  <div class="toolbar sa-bar"><div class="search">${ico('search', 18)}<label class="sr" for="aq">Search stations</label><input id="aq" data-sa="aq" type="search" value="${esc(S.sa.aq || '')}" placeholder="Search station or address" autocomplete="off"></div></div>
  <div class="sa-chips" role="group" aria-label="Filter stations">${AV_F.map(c => `<button type="button" class="sa-chip c-${c[0]} ${f === c[0] ? 'on' : ''}" aria-pressed="${f === c[0]}" data-act="avf" data-p="${c[0]}">${c[1]} <b class="num">${cnt(c[0])}</b></button>`).join('')}</div>
  <p class="count" id="acount" aria-live="polite">${avList().length} of ${items.length} stations</p><div id="atbl">${avTable(avList())}</div></div>`;
};
SAA.avf = el => { S.sa.af = el.dataset.p; $$('.sa-chip').forEach(b => { const on = b.dataset.p === S.sa.af; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); avFilter(); };
SAI.aq = t => { S.sa.aq = t.value; avFilter(); };
SAC.hours = async t => { S.sa.hours = +t.value; try { await saReload(['an', 'avail']); renderKeep(); } catch (e) { fail(e); } };

/* ---------- Reports ---------- */
const RSTATS = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['resolved', 'Resolved'], ['all', 'All']];
const RCOL = { pending: 'dn-low', approved: 'dn-aqua', rejected: 'dn-out', resolved: 'dn-available' };
const rList = () => { const f = S.sa.rs, q = (S.sa.rq || '').trim().toLowerCase();
  return S.sa.reports.filter(r => (f === 'all' || r.status === f) && (!q || [r.station, r.by, r.type, r.note, r.adminNote].join(' ').toLowerCase().includes(q))); };
const rTable = l => tbl(['Reported', 'Station', 'By', 'Issue', 'Details', 'Status', ''], l.map(r => { const late = r.status === 'pending' && Date.now() - r.t > 864e5;
  return [`${dateTime(r.t)}<br><span class="wait ${late ? 'late' : ''}">${r.status === 'pending' ? 'Waiting ' + dur(Date.now() - r.t) : ago(r.t)}</span>`, `<a href="#/station/${r.sid}">${esc(r.station)}</a>`, esc(r.by), `<span class="iss-t">${esc(r.type)}</span>`, esc(r.note || '—') + (r.adminNote ? `<br><span class="muted">Note: ${esc(r.adminNote)}</span>` : ''), rtag(r.status),
    `<span class="btnline">${r.status === 'pending' ? `<button class="btn sm outline" data-act="rstat" data-id="${r.id}" data-p="approved">Approve</button><button class="btn sm quiet danger" data-act="rstat" data-id="${r.id}" data-p="rejected">Reject</button>` : ''}<button class="btn sm quiet" data-act="srev" data-id="${r.id}">Update</button></span>`]; }), S.sa.rq ? 'No reports match your search.' : 'No reports in this view.');
const rFilter = () => { const l = rList(); $('#rtbl').innerHTML = rTable(l); $('#rcount').textContent = `${l.length} of ${S.sa.reports.length} reports`; };
SV.reports = () => {
  const fx = saFresh('reports'), L = S.sa.reports, f = S.sa.rs, cnt = k => k === 'all' ? L.length : L.filter(r => r.status === k).length, tot = L.length, pend = L.filter(r => r.status === 'pending'), done = tot - pend.length;
  const oldest = pend.length ? dur(Date.now() - Math.min(...pend.map(r => r.t))) : '', stations = new Set(L.map(r => r.sid)).size, rate = pct(done, tot);
  const by = {}; L.forEach(r => by[r.type] = (by[r.type] || 0) + 1); const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 5), mx = top.length ? top[0][1] : 1;
  return `<div class="sa sa-rp${fx ? ' sa-fx' : ''}">${aHead('Report management', 'Review corrections from users. Approve valid reports, reject the rest, and mark them resolved once fixed.')}
  <dl class="kpis small">${skpi('Total reports', tot, 'sa-rp-t', 'from all stations', 'k-aqua')}${skpi(`Pending${pend.length ? '<i class="sa-ping" aria-hidden="true"></i>' : ''}`, pend.length, 'sa-rp-p', pend.length ? `oldest waiting ${oldest}` : 'all caught up', pend.length ? 'k-alert' : 'k-ok', 'data-act="sars" data-p="pending"')}${skpi('Reviewed', done, 'sa-rp-d', `${rate}% of all reports`, 'k-ok', 'data-act="sars" data-p="all"')}${skpi('Stations affected', stations, 'sa-rp-s', 'with at least one report', 'k-low')}</dl>
  <div class="sa-two">${sec('Report status', `<div class="sa-ov">${donut(RSTATS.slice(0, 4).map(c => ({ c: RCOL[c[0]], v: cnt(c[0]), l: c[1].toLowerCase() })), rate, 'reviewed', 'sa-rp-r')}<ul class="dn-leg">${RSTATS.slice(0, 4).map((c, i) => `<li style="--i:${i}"><button type="button" data-act="sars" data-p="${c[0]}"><i class="${RCOL[c[0]]}"></i><span>${c[1]}</span><b class="num">${cnt(c[0])}</b></button></li>`).join('')}</ul></div>`)}
  ${sec('Most reported issues', top.length ? `<ul class="iss-bars">${top.map(([t, c], i) => `<li style="--i:${i}"><span class="iss-n" title="${esc(t)}">${esc(t)}</span><i class="iss-bar"><i class="sa-grow" style="width:${Math.max(6, c / mx * 100)}%"></i></i><b class="num">${c}</b></li>`).join('')}</ul>` : '<p class="muted pad">No reports yet.</p>')}</div>
  <div class="toolbar sa-bar"><div class="search">${ico('search', 18)}<label class="sr" for="rq">Search reports</label><input id="rq" data-sa="rq" type="search" value="${esc(S.sa.rq || '')}" placeholder="Search station, reporter or issue" autocomplete="off"></div></div>
  <div class="tabs" role="tablist" aria-label="Filter reports">${RSTATS.map(c => `<button role="tab" class="tab ${f === c[0] ? 'on' : ''}" aria-selected="${f === c[0]}" data-act="sars" data-p="${c[0]}">${c[1]} <span class="num">${cnt(c[0])}</span></button>`).join('')}</div>
  <p class="count" id="rcount" aria-live="polite">${rList().length} of ${tot} reports</p><div id="rtbl">${rTable(rList())}</div></div>`;
};
SAA.sars = el => { S.sa.rs = el.dataset.p; $$('.tabs .tab').forEach(b => { const on = b.dataset.p === S.sa.rs; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); }); rFilter(); };
SAI.rq = t => { S.sa.rq = t.value; rFilter(); };
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
const VSTATS = [['flagged', 'Flagged'], ['hidden', 'Hidden'], ['all', 'All']];
SV.reviews = () => {
  const L = S.sa.reviews, f = S.sa.vs, l = L.filter(r => f === 'all' || (f === 'flagged' ? r.flags > 0 && r.status === 'visible' : r.status === 'hidden')), cnt = k => k === 'all' ? L.length : L.filter(r => k === 'flagged' ? r.flags > 0 && r.status === 'visible' : r.status === 'hidden').length;
  return `${aHead('Review management', 'Reviews that users flagged appear first. Hide inappropriate feedback or remove it entirely.')}
  <div class="tabs" role="tablist" aria-label="Filter reviews">${VSTATS.map(c => `<button role="tab" class="tab ${f === c[0] ? 'on' : ''}" aria-selected="${f === c[0]}" data-act="savs" data-p="${c[0]}">${c[1]} <span class="num">${cnt(c[0])}</span></button>`).join('')}</div>
  ${tbl(['Updated', 'Station', 'Author', 'Rating', 'Comment', 'Flags', 'Status', ''], l.map(r => [dateTime(r.t), `<a href="#/station/${r.sid}">${esc(r.station)}</a>`, esc(r.by), stars(r.rating, 12), esc(r.comment || '—'), r.flags ? `<span class="tag rs-rejected">${r.flags}</span>` : '<span class="muted">0</span>', r.status === 'hidden' ? '<span class="tag rs-rejected">Hidden</span>' : '<span class="tag ok">Visible</span>',
    `<span class="btnline">${r.status === 'hidden' ? `<button class="btn sm outline" data-act="rvmod" data-id="${r.id}" data-p="visible">Restore</button>` : `<button class="btn sm outline" data-act="rvmod" data-id="${r.id}" data-p="hidden">Hide</button>${r.flags ? `<button class="btn sm quiet" data-act="rvmod" data-id="${r.id}" data-p="visible">Dismiss flags</button>` : ''}`}<button class="btn sm quiet danger" data-act="rvrm" data-id="${r.id}">Delete</button></span>`]), 'No reviews in this view.')}`;
};
SAA.savs = el => { S.sa.vs = el.dataset.p; render(); };
SAA.rvmod = async el => { busy(el, true, '…'); try { await api('PUT', '/superadmin/reviews/' + el.dataset.id, { status: el.dataset.p }); await saReload(['an', 'reviews']); renderKeep(); toast(el.dataset.p === 'hidden' ? 'Review hidden from users' : 'Review is visible', 'ok'); } catch (e) { busy(el, false); fail(e); } };
SAA.rvrm = el => modal(`<div class="dlg-h"><h2>Delete this review?</h2><button class="icon-btn dlg-x" data-act="close" aria-label="Close">${ico('x', 18)}</button></div><p class="muted">The review is removed permanently. To keep a record, choose Hide instead.</p><div class="btnrow"><button class="btn danger-solid" data-act="rvrmok" data-id="${el.dataset.id}">Delete review</button><button class="btn quiet" data-act="close">Cancel</button></div>`, 'Delete review');
SAA.rvrmok = async el => { busy(el, true, 'Deleting…'); try { await api('DELETE', '/superadmin/reviews/' + el.dataset.id); closeModal(); await saReload(['an', 'reviews']); renderKeep(); toast('Review deleted', 'ok'); } catch (e) { busy(el, false); closeModal(); fail(e); } };

/* ---------- Users ---------- */
SV.users = () => {
  const q = S.sa.uq.trim().toLowerCase(), r = S.sa.ur, me = S.user.id;
  const l = S.sa.users.filter(u => (r === 'all' || (r === 'inactive' ? !u.active : u.role === r)) && (!q || (u.name + ' ' + u.email).toLowerCase().includes(q)));
  return `${aHead('User management', 'Activate or deactivate accounts and assign roles. Deactivated users are signed out immediately.')}
  <div class="toolbar"><div class="search">${ico('search', 18)}<label class="sr" for="uq">Search users</label><input id="uq" data-sa="uq" type="search" value="${esc(S.sa.uq)}" placeholder="Search name or email" autocomplete="off"></div>
  <div class="select sm"><label class="sr" for="ur">Filter</label><select id="ur" data-sa="ur">${[['all', 'All users'], ['user', 'Users'], ['admin', 'Station admins'], ['superadmin', 'System admins'], ['inactive', 'Deactivated']].map(o => `<option value="${o[0]}" ${r === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>${ico('chevd', 14)}</div></div>
  <p class="count" id="ucount" aria-live="polite">${l.length} of ${S.sa.users.length} users</p><div id="utbl">${userTable(l, me)}</div>`;
};
const userTable = (l, me) => tbl(['User', 'Role', 'Station', 'Activity', 'Joined', 'Status', ''], l.map(u => [`<span class="who">${avatar({ name: u.name, avatar: u.avatar }, 32)}<span><b>${esc(u.name)}${u.id === me ? ' (you)' : ''}</b><br><span class="muted">${esc(u.email)}</span></span></span>`,
  `<span class="tag role-${u.role}">${ROLE_L[u.role]}</span>`, u.station ? esc((get(u.station) || {}).name || u.station) : '<span class="muted">—</span>', `<span class="num muted">${u.saved} saved · ${u.reviews} reviews · ${u.reports} reports</span>`, new Date(u.since).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }),
  u.active ? '<span class="tag ok">Active</span>' : '<span class="tag rs-rejected">Deactivated</span>',
  u.id === me ? '' : `<span class="btnline"><button class="btn sm outline" data-act="urole" data-id="${u.id}">Role</button><button class="btn sm quiet ${u.active ? 'danger' : ''}" data-act="uact" data-id="${u.id}" data-p="${u.active ? 0 : 1}">${u.active ? 'Deactivate' : 'Activate'}</button></span>`]), 'No users match.');
const usersFilter = () => { const q = S.sa.uq.trim().toLowerCase(), r = S.sa.ur, l = S.sa.users.filter(u => (r === 'all' || (r === 'inactive' ? !u.active : u.role === r)) && (!q || (u.name + ' ' + u.email).toLowerCase().includes(q))); $('#utbl').innerHTML = userTable(l, S.user.id); $('#ucount').textContent = `${l.length} of ${S.sa.users.length} users`; };
SAI.uq = t => { S.sa.uq = t.value; usersFilter(); };
SAC.ur = t => { S.sa.ur = t.value; usersFilter(); };
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
  const a = S.sa.an, pend = S.sa.loaded ? S.sa.reports.filter(r => r.status === 'pending').length : 0, flagged = S.sa.loaded && a ? a.reviews.flagged : 0;
  return `<div class="adm sup"><aside class="adm-side"><a class="brand" href="#/admin">${logo(24, { light: true })}<span>AquaFind</span></a><p class="adm-st"><span>System console</span>${esc(S.user.name)}</p>
  <nav aria-label="System sections">${SA_SECTIONS.map(x => `<a href="#/admin/${x[0]}" class="${sec === x[0] ? 'on' : ''}" ${sec === x[0] ? 'aria-current="page"' : ''}>${ico(x[2], 17)}<span>${x[1]}</span>${x[0] === 'reports' && pend ? `<b class="cnt num">${pend}</b>` : ''}${x[0] === 'reviews' && flagged ? `<b class="cnt num">${flagged}</b>` : ''}</a>`).join('')}</nav>
  <div class="adm-foot"><a href="#/">${ico('back', 15)} Back to app</a><button class="link" data-act="logout">${ico('logout', 15)} Sign out</button></div></aside>
  <main class="adm-main" id="main">${S.sa.loaded ? SV[sec]() : skRows(5)}</main></div>`;
}
function saAfter(sec) { if (sec === 'stations') saMap(); }