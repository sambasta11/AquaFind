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
