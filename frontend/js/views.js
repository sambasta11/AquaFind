/* AquaFind views (signed-in user + auth). Each view returns an HTML string. */
'use strict';
const pageHead = (title, sub, actions = '') => `<header class="phead"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${actions ? `<div class="phead-a">${actions}</div>` : ''}</header>`;
const empty = (title, body, action = '') => `<div class="empty"><b>${title}</b><p>${body}</p>${action}</div>`;
const saveBtn = (s, lbl = false) => `<button class="icon-btn save ${isSv(s.id) ? 'on' : ''}" data-act="heart" data-id="${s.id}" aria-pressed="${isSv(s.id)}" aria-label="${isSv(s.id) ? 'Remove' : 'Save'} ${esc(s.name)}">${ico('heart', 18, isSv(s.id))}${lbl ? `<span>${isSv(s.id) ? 'Saved' : 'Save'}</span>` : ''}</button>`;
const locSelect = (id = 'loc') => `<div class="locbar"><label class="sr" for="${id}">Your location</label><div class="select">${ico('pin', 16)}<select id="${id}" data-chg="loc">${LOCS.map((x, i) => `<option value="${i}" ${i == S.loc ? 'selected' : ''}>${esc(x.n)}</option>`).join('')}</select>${ico('chevd', 14)}</div><button class="icon-btn outline ${LIVE.on ? 'on' : ''}" data-act="gps" aria-pressed="${LIVE.on}" aria-label="${LIVE.on ? 'Turn off live location' : 'Use my live location'}" title="${LIVE.on ? 'Live location on' : 'Use my live location'}">${ico('locate', 18)}</button></div>`;

/* ---------- Ratings, reviews, report status ---------- */
const stars = (v, size = 14) => `<span class="stars" role="img" aria-label="${v ? (+v).toFixed(1) + ' out of 5 stars' : 'No rating'}">${[1, 2, 3, 4, 5].map(i => `<span class="star ${v >= i - .25 ? 'on' : v >= i - .75 ? 'half' : ''}">${ico('star', size, true)}</span>`).join('')}</span>`;
const rateLine = s => s.rcount ? `<span class="rate">${stars(s.rating, 13)}<b class="num">${(+s.rating).toFixed(1)}</b><span class="muted">(${s.rcount})</span></span>` : '<span class="rate none muted">No reviews yet</span>';
const RS = { pending: 'Pending review', approved: 'Approved', rejected: 'Rejected', resolved: 'Resolved' };
const rtag = st => `<span class="tag rs-${st}">${RS[st] || st}</span>`;

/* ---------- Station rows ---------- */
const row = (s, o = {}) => `<article class="srow ${o.compact ? 'compact' : ''} ${o.rm ? 'has-rm' : ''} ${S.sel === s.id ? 'sel' : ''}" data-id="${s.id}" ${o.pick ? 'data-act="pick" tabindex="0" role="button" aria-label="Show ' + esc(s.name) + ' on the map"' : ''}>
  <div class="s-main"><${o.pick ? 'span' : 'a href="#/station/' + s.id + '"'} class="s-name">${esc(s.name)}</${o.pick ? 'span' : 'a'}><span class="s-addr">${esc(s.addr)}</span>${rateLine(s)}${o.compact ? '' : `<a class="s-tel" href="tel:${esc(s.tel.replace(/\s/g, ''))}">${ico('phone', 13)}<span>${esc(s.tel)}</span></a>`}</div>
  <div class="s-meta"><div class="s-status">${chip(s)}</div><div class="s-dist num">${dm(s)}</div><div class="s-upd">${o.compact ? ago(s.upd) : `Updated ${clock(s.upd)}<small>${ago(s.upd)}</small>`}</div></div>
  <div class="s-hours">${hrs(s)}</div>
  <div class="s-act">${saveBtn(s)}${o.rm ? `<button class="btn sm quiet" data-act="rm" data-id="${s.id}">Remove</button>` : ''}<a class="btn sm ${o.pick ? 'quiet' : 'outline'}" href="#/station/${s.id}">Details</a></div>
</article>`;
const rowHead = () => `<div class="shead" aria-hidden="true"><span>Station</span><span>Status</span><span>Distance</span><span>Hours</span><span>Last update</span><span></span></div>`;
const filterChips = () => `<div class="chips" role="group" aria-label="Filter by status">${[['all', 'All'], ['available', 'Available'], ['low', 'Low supply'], ['out', 'Out of water'], ['open', 'Open now']].map(c => `<button class="chipb ${S.f === c[0] ? 'on' : ''}" data-act="filt" data-p="${c[0]}" aria-pressed="${S.f === c[0]}">${c[0] in SM ? gauge(c[0], 13) : ''}${c[1]}</button>`).join('')}</div>`;
const sortSelects = (withSort = true) => `<div class="selrow"><label class="sr" for="fd">Distance</label><div class="select sm"><select id="fd" data-chg="dist">${DIST_LABEL.map((l, i) => `<option value="${i}" ${S.dist == i ? 'selected' : ''}>${l}</option>`).join('')}</select>${ico('chevd', 14)}</div>${withSort ? `<label class="sr" for="fs">Sort by</label><div class="select sm"><select id="fs" data-chg="sort">${[['dist', 'Nearest first'], ['upd', 'Recently updated'], ['name', 'Name A–Z']].map(o => `<option value="${o[0]}" ${S.sort === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>${ico('chevd', 14)}</div>` : ''}</div>`;
const resultList = (l, o = {}) => l.length ? `<div class="slist" role="list">${o.compact ? '' : rowHead()}${l.map(s => row(s, o)).join('')}</div>`
  : empty('No stations match', 'Try a different name, or clear the filters to see every station.', '<button class="btn outline sm" data-act="clear">Clear filters</button>');

/* ---------- Home ---------- */
/* ---------- Install (PWA) ---------- */
const installBtn = (st, cls = 'btn primary') => st === 'prompt' ? `<button class="${cls}" data-act="install">${ico('plus', 16)} Install AquaFind</button>` : `<button class="${cls}" data-act="ios-help">${ico('plus', 16)} How to install</button>`;
const pwaBanner = () => !PWA.showBanner() ? '' : `<aside class="install" aria-label="Install AquaFind"><div class="install-t"><b>Install AquaFind</b><span>${PWA.state() === 'ios' ? 'Add it to your home screen for quick, full-screen access.' : 'Open it from your home screen, full screen and always one tap away.'}</span></div>${installBtn(PWA.state())}<button class="icon-btn" data-act="install-x" aria-label="Dismiss">${ico('x', 16)}</button></aside>`;
const pwaCard = () => { const st = PWA.state(); return `<section class="set"><div class="set-l"><h2>App</h2><p>Use AquaFind like a regular app on this device.</p></div><div class="set-r">${
  st === 'installed' ? `<p class="okline">${ico('check', 16)} AquaFind is installed on this device.</p>`
  : st === 'none' ? '<p class="fine">To install, open AquaFind in Chrome or Edge on Android, or in Safari on iPhone, over a secure (HTTPS) connection.</p>'
  : `<div class="btnrow">${installBtn(st, 'btn outline')}</div>`}</div></section>`; };
window.addEventListener('pwa-change', () => { if (typeof currentRoute === 'function' && S.user && ['home', 'account'].includes(currentRoute().name) && !$('#modal')) renderKeep(); });

V.home = () => {
  const l = byDist(ST), near = l.find(s => s.status === 'available') || l.find(s => s.status === 'low');
  const cnt = k => ST.filter(s => s.status === k).length, tot = ST.length || 1;
  const recent = [...ST].sort((a, b) => b.upd - a.upd).slice(0, 4);
  const nearby = l.filter(s => s.status === 'available' || s.status === 'low').slice(0, 5);
  const lead = near ? `<p class="kicker">Nearest water from ${esc(LC().n.split(',')[0])}</p>
    <h2 class="lead-h"><a href="#/station/${near.id}">${esc(near.name)}</a></h2>
    <div class="lead-meta"><span class="lead-d num">${dm(near)}</span>${chip(near)}<span>${hrs(near)}</span><span>Updated ${ago(near.upd)}</span></div>
    <div class="lead-a"><a class="btn primary" href="#/station/${near.id}/directions">${ico('nav', 16)} Get directions</a><a class="btn outline" href="#/station/${near.id}">View details</a></div>`
    : `<p class="kicker">Nearest water</p><h2 class="lead-h">No station reports water right now.</h2><p class="lead-sub">Check the community reports, or try again in a few minutes.</p><div class="lead-a"><a class="btn outline" href="#/reports">See community reports</a></div>`;
  return `<div class="home">
  <div class="home-main">
    <div class="home-top hero"><h1 class="sr">Home</h1><div class="hello-row"><a class="hero-av" href="#/account" aria-label="Your profile">${avatar(S.user, 40)}</a><p class="hello">Hello, ${esc((S.user.name || 'there').split(' ')[0])}</p></div><p class="hero-t">Find clean refill water near you</p>${locSelect()}
      <div class="hsearch"><label class="sr" for="hq">Search stations</label>${ico('search', 18)}<input id="hq" type="search" placeholder="Search station name or area" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="hsug"><div id="hsug" class="sug" role="listbox" hidden></div></div><i class="wave" aria-hidden="true"></i></div>${pwaBanner()}
    <section class="lead" aria-label="Nearest station with water">${lead}</section>
    <section class="home-map" aria-label="Map preview"><div id="homemap" class="mapbox"></div><a class="btn primary map-open" href="#/map">${ico('map', 16)} Open full map</a></section>
    <section class="supply" aria-label="Water availability overview"><div class="sec-h"><h2>Availability across ${ST.length} stations</h2></div>
      <div class="supply-bar" role="img" aria-label="${SKEYS.map(k => cnt(k) + ' ' + SM[k].label.toLowerCase()).join(', ')}">${SKEYS.filter(k => cnt(k)).map(k => `<i class="seg seg-${k}" style="flex:${cnt(k)}"></i>`).join('')}</div>
      <ul class="legend">${SKEYS.map(k => `<li><a href="#/stations?f=${k}">${gauge(k, 15)}<span class="num">${cnt(k)}</span><span>${SM[k].label}</span></a></li>`).join('')}</ul></section>
    <section aria-label="Nearby stations with water"><div class="sec-h"><h2>Nearby with water</h2><a class="link" href="#/stations">All stations</a></div>${nearby.length ? `<div class="slist">${nearby.map(s => row(s, { compact: 1 })).join('')}</div>` : empty('Nothing nearby', 'No station has water right now.')}</section>
    <section aria-label="Recently updated"><div class="sec-h"><h2>Recently updated</h2></div><ol class="recent">${recent.map(s => `<li><span class="r-t num">${ago(s.upd)}</span><a href="#/station/${s.id}">${esc(s.name)}</a>${chip(s)}</li>`).join('')}</ol></section>
  </div>
  </div>`;
};

/* ---------- Stations ---------- */
V.stations = () => {
  const l = filtered();
  return `<div class="page">${pageHead('Stations', 'Every refilling station, with its official status and distance from you.', locSelect('loc2'))}
  <div class="toolbar"><div class="search">${ico('search', 18)}<label class="sr" for="q">Search stations</label><input id="q" type="search" value="${esc(S.q)}" placeholder="Search by name or address" autocomplete="off"></div>${sortSelects()}</div>${filterChips()}
  <p class="count" id="rescount" aria-live="polite">${l.length} of ${ST.length} stations</p><div id="res">${resultList(l)}</div></div>`;
};
const refreshResults = () => { const l = filtered(); const r = $('#res'); if (r) r.innerHTML = resultList(l); const c = $('#rescount'); if (c) c.textContent = `${l.length} of ${ST.length} stations`; };

/* ---------- Map workspace ---------- */
const mcard = () => {
  const s = S.sel && get(S.sel); if (!s) return '';
  return `<div class="mc-top"><div><h2>${esc(s.name)}</h2><p>${esc(s.addr)}</p></div><button class="icon-btn" data-act="deselect" aria-label="Close station">${ico('x', 18)}</button></div>
  <div class="mc-meta">${chip(s)}<span class="num">${dm(s)}</span><span>${hrs(s)}</span><span>Updated ${ago(s.upd)}</span></div>
  <p class="mc-tel"><a href="tel:${esc(s.tel.replace(/\s/g, ''))}">${ico('phone', 13)} ${esc(s.tel)}</a></p>
  <div class="mc-a"><a class="btn primary sm" href="#/station/${s.id}/directions">${ico('nav', 15)} Directions</a><a class="btn outline sm" href="#/station/${s.id}">Details</a>${saveBtn(s, true)}</div>`;
};
V.map = () => `<div class="mapws" data-sheet="${S.sheet}">
  <section class="mp" aria-label="Station list"><button class="sheet-h" data-act="sheet" aria-expanded="${S.sheet === 'list'}"><i aria-hidden="true"></i><span id="msum"></span></button>
    <div class="mp-top">${locSelect('loc3')}<div class="search">${ico('search', 18)}<label class="sr" for="mq">Search stations</label><input id="mq" type="search" value="${esc(S.q)}" placeholder="Search stations" autocomplete="off"></div>${filterChips()}${sortSelects(false)}</div>
    <div class="mp-list" id="mplist"></div></section>
  <div class="mm"><div id="bigmap" class="mapbox" aria-label="Map of refilling stations"></div><div id="mcard" class="mcard" aria-live="polite"></div>
    <ul class="mkey" aria-label="Map key">${SKEYS.map(k => `<li>${gauge(k, 14)}${SM[k].label}</li>`).join('')}</ul>
    <button class="locate btn outline sm ${LIVE.on ? 'on' : ''}" data-act="${LIVE.on ? 'center' : 'gps'}">${ico('locate', 16)} ${LIVE.on ? 'Center on me' : 'Use my location'}</button></div></div>`;
function refreshMapList() {
  const l = filtered(), el = $('#mplist'); if (!el) return;
  el.innerHTML = l.length ? l.map(s => row(s, { compact: 1, pick: 1 })).join('') : empty('No stations match', 'Clear the filters to see every station.', '<button class="btn outline sm" data-act="clear">Clear filters</button>');
  const sm = $('#msum'); if (sm) sm.textContent = `${l.length} station${l.length == 1 ? '' : 's'}${S.sheet === 'list' ? ' · hide list' : ' · show list'}`;
  const ids = new Set(l.map(s => s.id));
  if (MAPS.lm) ST.forEach(s => { const m = MAPS.mk[s.id]; if (!m) return; const on = MAPS.lm.hasLayer(m); if (ids.has(s.id) && !on) m.addTo(MAPS.lm); if (!ids.has(s.id) && on) m.remove(); });
  const mc = $('#mcard'); if (mc) { mc.innerHTML = mcard(); mc.classList.toggle('open', !!S.sel); }
}
function selectStation(id, pan = true) {
  S.sel = id; paintPins(); refreshMapList();
  const s = get(id); if (pan && s && MAPS.lm) MAPS.lm.panTo([s.lat, s.lng], { animate: true });
  const r = $(`.mp-list .srow[data-id="${id}"]`); if (r) r.scrollIntoView({ block: 'nearest' });
}

/* ---------- Station details ---------- */
const water = s => {
  const t = s.yes + s.no, recent = (S.feed || []).filter(r => r.sid === s.id).slice(0, 3);
  return `<section class="community" aria-label="Community reports"><div class="sec-h"><h2>Community reports</h2><span class="tag">Unverified</span></div>
  <p class="muted">Reported by AquaFind users in the last 3 hours. These never change the official status.</p>
  ${t ? `<div class="vote"><div class="vote-bar" role="img" aria-label="${s.yes} say water, ${s.no} say no water"><i class="y" style="flex:${s.yes}"></i><i class="n" style="flex:${s.no}"></i></div><div class="vote-l"><span>${gauge('available', 14)}<b class="num">${s.yes}</b> say water</span><span>${gauge('out', 14)}<b class="num">${s.no}</b> say no water</span></div></div>` : '<p class="vote-none">No reports in the last 3 hours.</p>'}
  ${recent.length ? `<ul class="mini-feed">${recent.map(r => `<li>${gauge(r.has ? 'available' : 'out', 14)}<div><b>${r.has ? 'Water available' : 'No water'}</b> <span class="muted">${esc(r.by)} · ${ago(r.t)}</span>${r.note ? `<p>${esc(r.note)}</p>` : ''}</div></li>`).join('')}</ul>` : ''}
  <div class="btnrow"><button class="btn outline" data-act="qr" data-sid="${s.id}">${ico('plus', 16)} Report water status</button></div></section>`;
};
const reviewsSection = s => {
  const d = S.rv[s.id];
  if (!d) return `<section class="reviews" aria-label="Ratings and reviews"><div class="sec-h"><h2>Ratings &amp; reviews</h2></div>${skRows(2)}</section>`;
  const mine = d.items.find(r => r.mine), tot = d.count || 0;
  return `<section class="reviews" aria-label="Ratings and reviews"><div class="sec-h"><h2>Ratings &amp; reviews</h2></div>
  <div class="rv-sum"><div class="rv-avg"><b class="num">${tot ? (+d.avg).toFixed(1) : '–'}</b>${stars(d.avg, 18)}<span class="muted">${tot} review${tot === 1 ? '' : 's'}</span></div>
  <ul class="rv-dist" aria-label="Rating distribution">${[5, 4, 3, 2, 1].map(n => `<li><span class="num">${n}</span>${ico('star', 12, true)}<i class="rv-bar"><i style="width:${tot ? Math.round(d.dist[n - 1] / tot * 100) : 0}%"></i></i><span class="num muted">${d.dist[n - 1]}</span></li>`).join('')}</ul></div>
  <div class="btnrow"><button class="btn outline" data-act="rvopen" data-sid="${s.id}">${ico('star', 16)} ${mine ? 'Edit your review' : 'Rate this station'}</button></div>
  ${d.items.length ? `<ul class="rv-list">${d.items.map(r => `<li class="rv ${r.status === 'hidden' ? 'is-hidden' : ''}"><div class="rv-h">${avatar(r.mine ? S.user : { name: r.by, avatar: r.av }, 32)}<div><b>${r.mine ? 'You' : esc(r.by)}</b><span class="muted">${ago(r.upd)}${r.upd - r.t > 60000 ? ' · edited' : ''}</span></div>${stars(r.rating, 14)}</div>
    ${r.status === 'hidden' ? '<p class="note warn inl"><b>Hidden by a moderator.</b><span>Only you can see this review.</span></p>' : ''}${r.comment ? `<p class="rv-c">${esc(r.comment)}</p>` : ''}
    <div class="rv-a">${r.mine ? `<button class="btn sm quiet" data-act="rvopen" data-sid="${s.id}">Edit</button><button class="btn sm quiet danger" data-act="rvdel" data-sid="${s.id}">Delete</button>` : `<button class="btn sm quiet" data-act="rvflag" data-id="${r.id}" data-sid="${s.id}">${ico('flag', 14)} Report review</button>`}</div></li>`).join('')}</ul>` : '<p class="muted pad">No reviews yet. Be the first to share how this station was.</p>'}</section>`;
};
V.detail = () => {
  const s = get(currentRoute().id); if (!s) return notFound();
  const bad = s.status === 'out' || s.status === 'closed', alt = byDist(ST).find(x => x.status === 'available' && x.id !== s.id);
  const cap = { available: 'Station reports water is available.', low: 'Supply is running low. Go soon or call first.', out: 'No water to refill right now.', closed: 'The station is closed.' }[s.status];
  return `<div class="page detail">
  <a class="back" href="#/stations">${ico('back', 16)} Stations</a>
  <header class="d-head"><div><h1>${esc(s.name)}</h1><p>${esc(s.addr)}</p><p class="d-rate">${rateLine(s)}</p></div>${saveBtn(s, true)}</header>
  <div class="d-grid"><div class="d-main">
    <section class="status-hero st-${s.status}" aria-label="Official availability"><div class="sh-g">${gauge(s.status, 44)}</div><div><p class="kicker">Official status</p><p class="sh-l">${SM[s.status].label}</p><p class="sh-c">${cap}</p></div><p class="sh-t">Updated ${clock(s.upd)}<small>${ago(s.upd)} by the station</small></p></section>
    ${bad ? `<div class="note warn"><b>${s.status === 'out' ? 'No water right now.' : 'This station is closed.'}</b><span>${alt ? `Nearest available: <a href="#/station/${alt.id}">${esc(alt.name)}</a>, ${dm(alt)} away.` : 'No other station reports water right now.'}</span></div>` : ''}
    <dl class="facts"><div><dt>${ico('pin', 16)}Address</dt><dd>${esc(s.addr)}</dd></div><div><dt>${ico('phone', 16)}Contact</dt><dd><a href="tel:${esc(s.tel.replace(/\s/g, ''))}">${esc(s.tel)}</a></dd></div><div><dt>${ico('clock', 16)}Operating hours</dt><dd>${hrs(s)}<small>${isOpen(s) ? 'Open now' : 'Closed now'}</small></dd></div><div><dt>${ico('nav', 16)}Distance</dt><dd class="num">${dm(s)}<small>from ${esc(LC().n.split(',')[0])}</small></dd></div></dl>
    ${water(s)}${reviewsSection(s)}</div>
  <aside class="d-side"><div id="minimap" class="mapbox mini"></div><div class="btnstack"><a class="btn primary" href="#/station/${s.id}/directions">${ico('nav', 16)} Get directions</a><button class="btn outline" data-act="report">${ico('flag', 16)} Report incorrect info</button></div></aside></div></div>`;
};
V.directions = () => {
  const s = get(currentRoute().id); if (!s) return notFound();
  return `<div class="page dirs"><a class="back" href="#/station/${s.id}">${ico('back', 16)} ${esc(s.name)}</a>
  ${pageHead('Directions', `From ${esc(LC().n)} to ${esc(s.name)}`)}
  ${s.status === 'out' || s.status === 'closed' ? `<div class="note warn"><b>${s.status === 'out' ? 'No water right now.' : 'This station is closed.'}</b><span>You may want to choose another station.</span><a class="btn sm outline" href="#/stations?f=available">Find another station</a></div>` : ''}
  <div class="d-grid dgrid2"><div><div class="tabs" role="tablist" aria-label="Travel mode">${Object.keys(RT).map(k => `<button role="tab" class="tab ${S.mode === k ? 'on' : ''}" aria-selected="${S.mode === k}" data-act="dmode" data-p="${k}">${RT[k][1]}</button>`).join('')}</div><div id="dirinfo"></div></div><div id="dirmap" class="mapbox tall"></div></div></div>`;
};
V.report = () => {
  const s = get(currentRoute().id); if (!s) return notFound();
  const opts = [s.status === 'out' || s.status === 'closed' ? 'Water is actually available' : `No water despite "${SM[s.status].label}" status`, 'Station is closed', 'Wrong address or map location', 'Incorrect contact or hours', 'Other information'];
  return `<div class="page narrow"><a class="back" href="#/station/${s.id}">${ico('back', 16)} ${esc(s.name)}</a>${pageHead('Report incorrect information', 'Administrators review every report. You can follow its status under Community, My history.')}
  <form id="issueform" novalidate><div class="ref"><b>${esc(s.name)}</b><span>${esc(s.addr)}</span>${chip(s)}</div>
  <fieldset class="checks"><legend>What looks wrong?</legend>${opts.map((o, i) => `<label class="check"><input type="checkbox" name="iss" value="${esc(o)}"><span>${esc(o)}</span></label>`).join('')}</fieldset>
  <div class="field"><label for="rd">Details <span class="opt">optional</span></label><textarea id="rd" maxlength="500" rows="4" placeholder="What did you see, and when?"></textarea><p class="hint"><span id="cnt">0</span> / 500. Don't include personal information.</p></div>
  <p class="ferr" id="ierr" role="alert"></p><div class="btnrow"><button class="btn primary" type="submit">Submit report</button><a class="btn quiet" href="#/station/${s.id}">Cancel</a></div></form></div>`;
};

/* ---------- Community reports ---------- */
const waterForm = (p, sid) => `<form class="wform" data-form="water" data-p="${p}" novalidate>
  <div class="field"><label for="${p}st">Station</label><div class="select"><select id="${p}st">${byDist(ST).map(s => `<option value="${s.id}" ${s.id === sid ? 'selected' : ''}>${esc(s.name)} · ${dm(s)}</option>`).join('')}</select>${ico('chevd', 14)}</div></div>
  <fieldset class="field"><legend>What do you see?</legend><div class="radios"><label class="radio y"><input type="radio" name="${p}v" value="1">${gauge('available', 18)}<span>Has water</span></label><label class="radio n"><input type="radio" name="${p}v" value="0">${gauge('out', 18)}<span>No water</span></label></div></fieldset>
  <div class="field"><label for="${p}nt">Message <span class="opt">optional</span></label><textarea id="${p}nt" maxlength="300" rows="2" placeholder="e.g. Short line, water is clear"></textarea></div>
  <p class="ferr" id="${p}err" role="alert"></p><div class="btnrow"><button class="btn primary" type="submit">Submit report</button></div></form>`;
const feedItem = r => `<li class="fitem"><span class="f-g">${gauge(r.has ? 'available' : 'out', 20)}</span><div><p><a href="#/station/${r.sid}"><b>${esc(r.station)}</b></a> <span class="${r.has ? 't-yes' : 't-no'}">${r.has ? 'has water' : 'no water'}</span></p>${r.note ? `<p class="f-note">${esc(r.note)}</p>` : ''}<p class="muted who">${avatar(r.mine ? S.user : { name: r.by, avatar: r.av }, 20, 'xs')}<span>${r.mine ? 'You' : esc(r.by)} · ${ago(r.t)}</span></p></div></li>`;
V.reports = () => {
  const f = S.feed, mine = f ? f.filter(r => r.mine) : [];
  const list = S.repTab === 'recent'
    ? (f === null ? skRows(4) : f.length ? `<ul class="feed">${f.map(feedItem).join('')}</ul>` : empty('No reports yet', 'Be the first to tell others what you see at a station.'))
    : `<h3 class="sub-h">Water status reports</h3>${mine.length ? `<ul class="feed">${mine.map(feedItem).join('')}</ul>` : '<p class="muted pad">You have not reported water status yet.</p>'}
       <h3 class="sub-h">Incorrect information reports</h3>${S.mineIssues === null ? skRows(3) : S.mineIssues.length ? `<ul class="feed">${S.mineIssues.map(r => `<li class="fitem"><span class="f-g">${ico('flag', 18)}</span><div><p><a href="#/station/${r.sid}"><b>${esc(r.station)}</b></a> ${rtag(r.status)}</p><p>${esc(r.type)}</p>${r.note ? `<p class="f-note">${esc(r.note)}</p>` : ''}${r.adminNote ? `<p class="f-note admin-note"><b>Admin:</b> ${esc(r.adminNote)}</p>` : ''}<p class="muted">Sent ${ago(r.t)}${r.upd ? ' · updated ' + ago(r.upd) : ''}</p></div></li>`).join('')}</ul>` : '<p class="muted pad">You have not reported incorrect information.</p>'}
       <h3 class="sub-h">My reviews</h3>${S.myRevs === null ? skRows(2) : S.myRevs.length ? `<ul class="feed">${S.myRevs.map(r => `<li class="fitem"><span class="f-g">${ico('star', 18, true)}</span><div><p><a href="#/station/${r.sid}"><b>${esc(r.station)}</b></a> ${stars(r.rating, 13)}${r.status === 'hidden' ? ' <span class="tag rs-rejected">Hidden by moderator</span>' : ''}</p>${r.comment ? `<p class="f-note">${esc(r.comment)}</p>` : ''}<p class="muted">${ago(r.t)}</p></div></li>`).join('')}</ul>` : '<p class="muted pad">You have not reviewed a station yet. Open a station to rate it.</p>'}`;
  return `<div class="page">${pageHead('Community reports', 'Short, time-stamped reports from people who were just there.')}
  <div class="rep-grid"><section class="rep-form" aria-label="Report water status"><h2>Report water status</h2><p class="muted">Reports count for 3 hours. One report per station every 10 minutes.</p>${waterForm('rp', byDist(ST)[0]?.id)}</section>
  <section aria-label="Reports"><div class="tabs" role="tablist"><button role="tab" class="tab ${S.repTab === 'recent' ? 'on' : ''}" aria-selected="${S.repTab === 'recent'}" data-act="reptab" data-p="recent">Recent reports</button><button role="tab" class="tab ${S.repTab === 'mine' ? 'on' : ''}" aria-selected="${S.repTab === 'mine'}" data-act="reptab" data-p="mine">My history</button></div>${list}</section></div></div>`;
};

/* ---------- Saved ---------- */
V.saved = () => {
  const l = byDist(ST.filter(s => isSv(s.id)));
  return `<div class="page">${pageHead('Saved stations', `${l.length} saved. Availability is the latest official status.`, locSelect('loc4'))}
  ${l.length ? `<div class="slist">${rowHead()}${l.map(s => row(s, { rm: 1 })).join('')}</div>` : empty('No saved stations yet', 'Tap the heart on any station to keep it here.', '<a class="btn outline sm" href="#/stations">Browse stations</a>')}
  <p class="fine">Availability can change quickly. Check the last update time before you go.</p></div>`;
};

/* ---------- Notifications ---------- */
const NF = [['all', 'All'], ['unread', 'Unread'], ['availability', 'Availability'], ['saved', 'Saved stations'], ['nearby', 'Nearby'], ['announcement', 'Announcements']];
const nfMatch = n => S.nf === 'all' || (S.nf === 'unread' ? !n.read : S.nf === 'availability' ? nType(n) === 'availability' : nScope(n) === S.nf);
const TYPE_L = { availability: 'Availability update', community: 'Community report', announcement: 'Announcement', info: 'Station information' };
V.notifications = () => {
  const all = myN(), u = all.filter(n => !n.read).length, l = all.filter(nfMatch);
  return `<div class="page narrow">${pageHead('Notifications', u ? `${u} unread` : 'You are up to date.', `<button class="btn outline sm" data-act="readall" ${u ? '' : 'disabled'}>Mark all as read</button>`)}
  <div class="chips" role="group" aria-label="Filter notifications">${NF.map(c => `<button class="chipb ${S.nf === c[0] ? 'on' : ''}" data-act="nf" data-p="${c[0]}" aria-pressed="${S.nf === c[0]}">${c[1]}</button>`).join('')}</div>
  ${l.length ? `<ul class="nlist">${l.map(n => { const s = n.sid && get(n.sid), ty = nType(n); return `<li class="nitem ${n.read ? '' : 'un'}"><span class="n-m" aria-hidden="true">${ico(ty === 'announcement' ? 'megaphone' : 'drop', 16)}</span><div class="n-b"><p class="n-k">${TYPE_L[ty]}${s ? ' · ' + (ty === 'announcement' ? esc(s.name) : isSv(s.id) ? 'Saved station' : 'Nearby') : ''}${n.read ? '' : '<span class="new">New</span>'}</p><p class="n-t">${esc(ty === 'announcement' ? n.title : s ? s.name : n.title)}</p><p class="n-x">${esc(n.body)}</p><p class="n-f">${s ? chip(s) : ''}<span class="muted">${dateTime(n.t)} · ${ago(n.t)}</span></p></div><div class="n-a">${s ? `<a class="btn sm outline" href="#/station/${s.id}" data-act="nopen" data-id="${n.id}">View</a>` : ''}${n.read ? '' : `<button class="btn sm quiet" data-act="nread" data-id="${n.id}">Mark read</button>`}</div></li>`; }).join('')}</ul>` : empty('Nothing here', S.nf === 'all' ? 'Save a station or turn on nearby updates in Account.' : 'No notifications match this filter.')}
  <p class="fine">Updates come from station admins and community reports. Change what you receive in <a href="#/account">Account</a>.</p></div>`;
};

/* ---------- Account ---------- */
const sw = (id, on, label, desc) => `<div class="pref"><div><b id="${id}-l">${label}</b><p>${desc}</p></div><button class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-labelledby="${id}-l" data-act="${id}"><i></i></button></div>`;
const field = ({ id, label, type = 'text', ph = '', ac = '', val = '', hint = '', eye = false, opt = false }) => `<div class="field"><label for="${id}">${label}${opt ? ' <span class="opt">optional</span>' : ''}</label><div class="input ${eye ? 'has-eye' : ''}"><input id="${id}" type="${type}" placeholder="${ph}" ${ac ? `autocomplete="${ac}"` : ''} value="${esc(val)}" aria-describedby="${id}-e ${hint ? id + '-h' : ''}">${eye ? `<button type="button" class="eye" data-act="eye" data-t="${id}" aria-label="Show password" aria-pressed="false">${ico('eye', 18)}</button>` : ''}</div>${hint ? `<p class="hint" id="${id}-h">${hint}</p>` : ''}<p class="ferr" id="${id}-e" role="alert"></p></div>`;
V.account = () => {
  const u = S.user, since = u.since ? new Date(u.since).toLocaleDateString([], { month: 'long', year: 'numeric' }) : '';
  return `<div class="page narrow acct-page">${pageHead('Profile', 'Your photo, personal details, password and alerts.')}
  <section class="pcard" aria-label="Profile summary">
    <div class="pc-av">${avatar(u, 96, 'xl')}<button type="button" class="pc-cam" data-act="photo" aria-label="${u.avatar ? 'Change' : 'Add'} profile photo">${ico('camera', 16)}</button></div>
    <div class="pc-who"><h2>${esc(u.name)}</h2><p class="pc-mail">${esc(u.email)}</p><p class="pc-tags"><span class="tag">${u.role === 'superadmin' ? 'System admin' : u.role === 'admin' ? 'Station admin' : 'Personal account'}</span>${since ? `<span class="muted">Member since ${since}</span>` : ''}</p></div>
    <div class="pc-act"><button type="button" class="btn outline sm" data-act="photo">${ico('camera', 15)} ${u.avatar ? 'Change photo' : 'Upload photo'}</button>${u.avatar ? `<button type="button" class="btn outline sm danger" data-act="photo-rm">${ico('trash', 15)} Remove</button>` : ''}</div>
    <input type="file" id="pf" class="sr" accept="image/jpeg,image/png,image/webp" tabindex="-1" aria-label="Choose a profile photo">
  </section>
  <section class="set"><div class="set-l"><h2>Personal information</h2><p>Your name and contact details. Changes are saved only when you press Save.</p></div><form class="set-r" id="profform" novalidate>${field({ id: 'pn', label: 'Full name', val: u.name, ac: 'name' })}${field({ id: 'pe', label: 'Email address', type: 'email', val: u.email, ac: 'email' })}${field({ id: 'pp', label: 'Phone', type: 'tel', val: u.phone || '', ac: 'tel', opt: true })}<p class="dirty" id="pdirty" hidden>${ico('pencil', 14)} You have unsaved changes.</p><p class="ferr" id="perr" role="alert"></p><div class="btnrow"><button class="btn primary" type="submit" disabled>Save changes</button><button class="btn quiet" type="button" data-act="pcancel" disabled>Cancel</button></div></form></section>
  ${u.pw === false ? `<section class="set"><div class="set-l"><h2>Password</h2><p>You sign in with Google or Facebook.</p></div><div class="set-r"><p class="muted">This account has no AquaFind password. Your sign-in is handled by your Google or Facebook account.</p></div></section>` : `<section class="set"><div class="set-l"><h2>Password</h2><p>Use at least 6 characters. Longer is stronger.</p></div><form class="set-r" id="pwform" novalidate>${field({ id: 'p0', label: 'Current password', type: 'password', ac: 'current-password', eye: true })}${field({ id: 'p1', label: 'New password', type: 'password', ac: 'new-password', eye: true })}${field({ id: 'p2', label: 'Confirm new password', type: 'password', ac: 'new-password', eye: true })}<p class="ferr" id="pwerr" role="alert"></p><div class="btnrow"><button class="btn outline" type="submit">Update password</button></div></form></section>`}
  <section class="set"><div class="set-l"><h2>Notifications</h2><p>Choose which water updates reach you.</p></div><div class="set-r">${sw('alerts', S.alerts, 'Saved stations', 'Availability changes at the stations you saved.')}${sw('nearby', S.nearby, 'Nearby stations', 'Updates within 1 km of your selected location.')}</div></section>
  ${pwaCard()}
  <section class="set"><div class="set-l"><h2>Session</h2><p>Signing out ends this session on this device.</p></div><div class="set-r btnrow">${isStaff(u) ? `<a class="btn outline" href="#/admin">${ico('shield', 16)} Admin console</a>` : ''}<button class="btn outline danger" data-act="logout">${ico('logout', 16)} Sign out</button></div></section></div>`;
};

/* ---------- AquaBot ---------- */
const fmtT = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const GREET = "Hi, I'm AquaBot. Ask me where to find water, whether a station is open, or how to report water status.";
const stCards = m => m.st && m.st.length ? `<div class="mc">${m.st.map(id => get(id)).filter(Boolean).map(s => `<a href="#/station/${s.id}"><span>${esc(s.name)} · ${dm(s)}</span>${chip(s)}</a>`).join('')}</div>` : '';
/* one chat row; opts.stat = no entrance animation (history repaint), opts.plain = text only (set progressively while it is revealed) */
const msgHtml = (m, o = {}) => `<div class="crow ${m.role === 'user' ? 'mine' : 'bot'} ${o.stat ? 'static' : ''}" ${m.id ? `data-mid="${m.id}"` : ''}><div class="bub">${esc(o.plain ? '' : m.text)}</div>${o.plain ? '' : stCards(m)}<time class="mt" datetime="${new Date(m.t || Date.now()).toISOString()}">${fmtT(m.t || Date.now())}</time></div>`;
const typingRow = () => `<div class="crow bot" id="ty" role="status" aria-label="AquaBot is typing"><div class="bub"><div class="dots"><i></i><i></i><i></i></div></div></div>`;
const errRow = msg => `<div class="crow bot err" id="cerr" role="alert"><div class="bub">${esc(msg)}<br><button type="button" class="retry" data-act="cretry">${ico('refresh', 14)} Try again</button></div></div>`;
V.ask = () => (S.chat.length || (S.chat = [{ role: 'assistant', text: GREET, t: Date.now(), local: true }]), '') + `<div class="chat"><header class="chat-h"><a class="icon-btn back" href="#/" aria-label="Back to Home">${ico('back', 18)}</a><span class="chat-av" aria-hidden="true">${ico('spark', 20)}</span><div><b>AquaBot</b><span>Answers use live station data</span></div></header>
  <div id="msgs" class="msgs" aria-live="polite">${S.chat.map(m => msgHtml(m, { stat: true })).join('')}${S.typing ? typingRow() : ''}${S.chatFail ? errRow(S.chatFail) : ''}</div>
  <div class="sugg ${S.chat.length > 1 ? 'hide' : ''}" id="sugg">${SUGGESTIONS.map(t => `<button class="chipb" type="button" data-act="csug" data-p="${t}">${t}</button>`).join('')}</div>
  <form class="cin" id="chatform" autocomplete="off"><label class="sr" for="ci">Message AquaBot</label><input id="ci" placeholder="Ask about water near you" maxlength="500" enterkeyhint="send" autocomplete="off"><button class="send" type="submit" aria-label="Send message" disabled>${ico('send', 20)}</button></form></div>`;
const SUGGESTIONS = ['Nearest station with water', 'What is open now?', 'Which stations are low on water?', 'How do I report water status?'];

const notFound = () => `<div class="page narrow">${empty('Page not found', 'This station or page does not exist.', '<a class="btn outline sm" href="#/">Go home</a>')}</div>`;

/* ---------- Authentication ---------- */
const socials = () => OAUTH.html();
/* Animated hero mark: water rises inside the logo, the full mark lights up with a sparkle, then it drains and repeats (CSS only) */
const heroMark = () => {
  const i = 'hl' + (++LID), p = LOGO_STOPS.light, st = (cs, os) => cs.map((c, n) => `<stop offset="${os[n]}" stop-color="${c}"/>`).join('');
  return `<svg class="logo-live" width="44" height="44" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><defs><g id="${i}p"><path d="${LOGO_A}"/><path d="${LOGO_WAVE}"/></g><mask id="${i}m" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64"><use href="#${i}p" fill="#fff"/></mask>
<linearGradient id="${i}a" x1="0" y1="0" x2=".55" y2="1">${st(p[0], ['0', '.45', '1'])}</linearGradient><linearGradient id="${i}b" x1="0" y1="0" x2="1" y2=".45">${st(p[1], ['0', '.5', '1'])}</linearGradient><linearGradient id="${i}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E6FAFF"/><stop offset="1" stop-color="#4FC6EC"/></linearGradient></defs>
<g class="hl-ghost"><use href="#${i}p"/></g><g mask="url(#${i}m)"><g class="hl-rise"><g class="hl-flow b"><path d="${FLOW}" fill="#BDF3FF" opacity=".7"/></g><g class="hl-flow f"><path d="${FLOW}" fill="url(#${i}w)" transform="translate(0 3)"/></g></g></g>
<g class="hl-full"><path d="${LOGO_A}" fill="url(#${i}a)"/><path d="${LOGO_WAVE}" fill="url(#${i}b)"/></g><path class="hl-spark" d="M53 5l1.7 4.6L59.3 11.3 54.7 13 53 17.6 51.3 13 46.7 11.3 51.3 9.6z" fill="#fff"/></svg>`;
};
const authShell = (body) => `<main class="auth"><div class="auth-hero" aria-hidden="true"><i class="hero-topo"></i><i class="hero-orb o1"></i><i class="hero-orb o2"></i><div class="hero-bubbles"><i></i><i></i><i></i><i></i><i></i><i></i></div><svg class="hero-waves" viewBox="0 0 2400 120" preserveAspectRatio="none" focusable="false"><path class="hw1" d="M0 70q150-46 300 0t300 0 300 0 300 0 300 0 300 0 300 0 300 0V120H0z"/><path class="hw2" d="M0 86q150-34 300 0t300 0 300 0 300 0 300 0 300 0 300 0 300 0V120H0z"/></svg><i class="hero-grain"></i><span class="auth-logo"><i class="auth-ring"></i><i class="auth-ring r2"></i><i class="auth-ring r3"></i>${heroMark()}</span><b>AquaFind</b><span>Find water refills near you, live.</span><div class="hero-feats"><div class="hf"><span class="hf-i hf-live"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M12 3.2s6 6.1 6 10.4a6 6 0 0 1-12 0C6 9.3 12 3.2 12 3.2z"/></svg></span><div><strong>Live availability</strong><small>See which stations have water right now.</small></div></div><div class="hf"><span class="hf-i"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M20 14.5a2 2 0 0 1-2 2H9l-5 4V6.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/></svg></span><div><strong>Community reports</strong><small>Neighbours flag low supply and closures.</small></div></div><div class="hf"><span class="hf-i"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M3.5 11.2 20.5 3.5l-7.7 17-2.2-7.1z"/></svg></span><div><strong>Turn-by-turn directions</strong><small>Route straight to the nearest refill.</small></div></div></div><i class="wave"></i></div><div class="auth-in">${body}</div><p class="auth-foot">Surigao City · water refill stations${/Android/i.test(navigator.userAgent) && !matchMedia('(display-mode: standalone)').matches ? '<br><a class="apk-dl" href="/downloads/AquaFind.apk" download="AquaFind.apk">Download the Android app (APK)</a>' : ''}</p></main>`;
V.signin = () => authShell(`<h1>Sign in</h1><p class="auth-sub">See which refill stations have water before you leave home.</p>
  <form id="signin" novalidate>${field({ id: 'em', label: 'Email', type: 'email', ph: 'you@email.com', ac: 'email' })}${field({ id: 'pw', label: 'Password', type: 'password', ac: 'current-password', eye: true })}
  <div class="auth-row"><label class="check"><input type="checkbox" id="rm" checked><span>Keep me signed in</span></label><button type="button" class="link" data-act="forgot">Forgot password?</button></div>
  <p class="ferr form" id="er" role="alert"></p><button class="btn primary block" type="submit">Sign in</button></form>${socials()}
  <p class="auth-alt">New to AquaFind? <a href="#/signup">Create an account</a></p>
  <div class="demo"><span>Demo accounts</span><button type="button" class="link" data-act="demo" data-p="user">Fill user</button><button type="button" class="link" data-act="demo" data-p="admin">Fill station admin</button><button type="button" class="link" data-act="demo" data-p="super">Fill system admin</button></div>`);
V.signup = () => authShell(`<h1>Create account</h1><p class="auth-sub">Save stations and get alerts when their water status changes.</p>
  <form id="signup" novalidate>${field({ id: 'rn', label: 'Full name', ac: 'name' })}${field({ id: 're', label: 'Email', type: 'email', ph: 'you@email.com', ac: 'email' })}${field({ id: 'rp', label: 'Password', type: 'password', ac: 'new-password', eye: true, hint: 'At least 6 characters.' })}${field({ id: 'rc', label: 'Confirm password', type: 'password', ac: 'new-password', eye: true })}
  <div class="field"><label class="check"><input type="checkbox" id="tc" aria-describedby="tc-e"><span>I agree to the <button type="button" class="link" data-act="terms" data-p="Terms of Service">Terms of Service</button> and <button type="button" class="link" data-act="terms" data-p="Privacy Policy">Privacy Policy</button></span></label><p class="ferr" id="tc-e" role="alert"></p></div>
  <p class="ferr form" id="er" role="alert"></p><button class="btn primary block" type="submit">Create account</button></form>${socials()}
  <p class="auth-alt">Already registered? <a href="#/signin">Sign in</a></p>`);
