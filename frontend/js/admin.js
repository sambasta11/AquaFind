/* AquaFind admin console (station admins). Compact tables, filters and forms. */
'use strict';
const AD_SECTIONS = [['overview', 'Overview', 'home'], ['availability', 'Availability', 'drop'], ['issues', 'Issue reports', 'flag'], ['community', 'Community reports', 'users'], ['announcements', 'Announcements', 'megaphone'], ['people', 'Followers', 'heart']];
async function loadAdmin() {
  const [history, wr, people, ann, reports] = await Promise.all([api('GET', '/admin/history'), api('GET', '/admin/water-reports'), api('GET', '/admin/people'), api('GET', '/admin/announcements'), api('GET', '/reports')]);
  Object.assign(S.ad, { history, wr, people, ann, loaded: true }); S.reports = reports;
}
const dur = ms => { const m = Math.max(1, Math.round(ms / M)); return m < 60 ? m + ' min' : m < 1440 ? Math.round(m / 60) + ' hr' : Math.round(m / 1440) + ' d'; };
const tbl = (cols, rows, empt) => rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>${cols.map(c => `<th scope="col">${c}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td data-l="${esc(cols[i])}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<p class="muted pad">${empt}</p>`;
const aHead = (t, sub, a = '') => `<header class="ahead"><div><h1>${t}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${a}</header>`;

const AV = {};
let AD_LAST = '', AD_FRESH = true;      // animate a section only when you arrive on it, not on every live refresh
const CU = {};                          // last shown value per counter, so a refresh counts from the old number
new MutationObserver(() => document.querySelectorAll('[data-count]:not([data-cu])').forEach(el => {
  el.dataset.cu = 1; const to = +el.dataset.count, k = el.dataset.key, from = CU[k] ?? 0; CU[k] = to;
  if (from === to || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const t0 = performance.now(), d = 900; el.textContent = from;
  const step = t => { const p = Math.min(1, (t - t0) / d); el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
})).observe(document.getElementById('app') || document.documentElement, { childList: true, subtree: true });
const akpi = (label, val, key, sub, cls, href) => `<a class="kpi ${cls}" href="${href}"><dt>${label}</dt><dd class="num" data-count="${val}" data-key="${key}">${val}</dd><small>${sub}</small></a>`;
const repOpen = r => r.status === 'pending' || r.status === 'approved';
const repBtns = r => r.status === 'resolved' || r.status === 'rejected' ? `<button class="btn sm quiet" data-act="rstat" data-id="${r.id}" data-p="pending">Reopen</button>`
  : `${r.status === 'pending' ? `<button class="btn sm outline" data-act="rstat" data-id="${r.id}" data-p="approved">Approve</button><button class="btn sm quiet danger" data-act="rstat" data-id="${r.id}" data-p="rejected">Reject</button>` : ''}<button class="btn sm outline" data-act="rstat" data-id="${r.id}" data-p="resolved">Resolve</button>`;
AV.overview = s => {
  const open = S.reports.filter(repOpen), h = S.ad.history, hr = new Date().getHours(), hi = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const tot = (s.yes + s.no) || 0, yp = tot ? Math.round(s.yes / tot * 100) : 0;
  const tl = h.slice(0, 6).map((r, i) => `<li class="tl-${r.status}"><i class="tl-dot"></i><div><b>${SM[r.status].label}</b><span class="muted">${dateTime(r.t)}${i === 0 ? ' · current' : ''}</span></div><span class="num tl-dur">${dur((i ? h[i - 1].t : Date.now()) - r.t)}</span></li>`).join('');
  return `<div class="ov${AD_FRESH ? ' fx' : ''}">${aHead('Overview', esc(s.name))}
  <section class="ov-hero st-${s.status}" aria-label="Current station status"><div class="ov-hero-l"><span class="ov-gauge">${gauge(s.status, 46)}</span><div><span class="ov-eyebrow">${hi}, here is your station right now</span><h2>${SM[s.status].label}</h2><p><i class="ov-live"></i>Updated ${ago(s.upd)} \u00b7 Open ${s.o}:00\u2013${s.c}:00</p></div></div>
    <div class="ov-hero-r"><a class="ov-act main" href="#/admin/availability">Update status</a><a class="ov-act" href="#/admin/announcements">Post announcement</a></div></section>
  <dl class="kpis ov-kpis">${akpi('Followers', S.ad.people.length, 'fol', 'saved this station', 'k-ocean', '#/admin/people')}
  ${akpi('Open issue reports', open.length, 'iss', `${S.reports.length} total`, open.length ? 'k-alert' : 'k-ok', '#/admin/issues')}
  ${akpi('Says water', s.yes, 'yes', 'community, last 3 hr', 'k-ok', '#/admin/community')}
  ${akpi('Says no water', s.no, 'no', 'community, last 3 hr', s.no ? 'k-out' : 'k-aqua', '#/admin/community')}</dl>
  ${tot ? `<div class="ov-vote" aria-label="Community agreement"><div class="ov-vote-h"><b>Community agreement</b><span class="muted">${yp}% report water available</span></div><span class="ov-bar"><i class="seg-available" style="width:${yp}%"></i><i class="seg-out" style="width:${100 - yp}%"></i></span></div>` : ''}
  <div class="a-cols ov-cols"><section><div class="sec-h"><h2>Needs attention</h2><a class="link" href="#/admin/issues">All reports</a></div>${open.length ? `<ul class="alist ov-att">${open.slice(0, 4).map(r => `<li><div><b>${esc(r.type)}</b><p class="muted">${esc(r.note || 'No details')} \u00b7 ${esc(r.by)} \u00b7 ${ago(r.t)}</p></div><span class="btnline">${repBtns(r)}</span></li>`).join('')}</ul>` : '<div class="ov-empty"><b>All clear</b><p class="muted">No open issue reports.</p></div>'}</section>
  <section><div class="sec-h"><h2>Status history</h2></div>${tl ? `<ul class="ov-tl">${tl}</ul>` : '<p class="muted pad">No changes recorded.</p>'}</section></div></div>`;
};
const AV_DESC = { available: 'Water is ready for refills.', low: 'Running low, limited refills left.', out: 'No water at the moment.', closed: 'The station is closed right now.' };
AV.availability = s => {
  if (!S.as) S.as = s.status;
  return `<div class="avl${AD_FRESH ? ' fx' : ''}">${aHead('Availability', 'Update what users see. Followers are notified.')}
  <div class="a-cols av-cols"><section class="av-card"><div class="sec-h"><h2>Water status</h2><span class="av-now av-${s.status}"><i class="ov-live"></i>Now ${SM[s.status].label.toLowerCase()} \u00b7 ${ago(s.upd)}</span></div>
  <div class="radios stat av-pick" role="radiogroup" aria-label="Water status">${SKEYS.map(k => `<label class="radio av-opt av-${k} ${S.as === k ? 'on' : ''}"><input type="radio" name="as" value="${k}" ${S.as === k ? 'checked' : ''} data-act="aset" data-p="${k}"><span class="av-ic">${gauge(k, 26)}</span><span class="av-t"><b>${SM[k].label}</b><small>${AV_DESC[k]}</small></span><i class="av-chk" aria-hidden="true"></i></label>`).join('')}</div>
  <div class="av-foot"><p class="muted">Followers are notified when the status changes.</p><button class="btn primary" data-act="aupd" ${S.as === s.status ? 'disabled' : ''}>Update status</button></div></section>
  <section class="av-card"><div class="sec-h"><h2>Station information</h2></div><form id="infoform" class="cform" novalidate>${field({ id: 'an', label: 'Station name', val: s.name })}${field({ id: 'aa', label: 'Address', val: s.addr })}${field({ id: 'ap', label: 'Contact number', type: 'tel', val: s.tel })}
  <div class="two">${field({ id: 'ao', label: 'Opens (0\u201323)', type: 'number', val: s.o })}${field({ id: 'ac', label: 'Closes (1\u201324)', type: 'number', val: s.c })}</div><p class="ferr" id="aerr" role="alert"></p><button class="btn outline" type="submit">Save information</button></form></section></div></div>`;
};
AV.issues = () => {
  const f = S.rf, l = S.reports.filter(r => f === 'all' || (f === 'open' ? repOpen(r) : !repOpen(r)));
  return `${aHead('Issue reports', 'Corrections users have asked for.')}
  <div class="tabs" role="tablist" aria-label="Filter reports">${[['open', 'Open'], ['resolved', 'Closed'], ['all', 'All']].map(c => `<button role="tab" class="tab ${f === c[0] ? 'on' : ''}" aria-selected="${f === c[0]}" data-act="rf" data-p="${c[0]}">${c[1]}${c[0] === 'open' ? ` <span class="num">${S.reports.filter(repOpen).length}</span>` : ''}</button>`).join('')}</div>
  ${tbl(['Reported', 'By', 'Issue', 'Details', 'Status', ''], l.map(r => [dateTime(r.t), esc(r.by), esc(r.type), esc(r.note || '—'), rtag(r.status), `<span class="btnline">${repBtns(r)}</span>`]), 'No reports in this view.')}`;
};
AV.community = () => `${aHead('Community reports', 'Water status reports for your station. Remove spam or mistaken reports.')}
  ${tbl(['Reported', 'Reporter', 'Says', 'Message', ''], S.ad.wr.map(r => [dateTime(r.t), esc(r.by), `<span class="st st-${r.has ? 'available' : 'out'}">${gauge(r.has ? 'available' : 'out', 14)}<span>${r.has ? 'Has water' : 'No water'}</span></span>`, esc(r.note || '—'), `<button class="btn sm quiet danger" data-act="wrdel" data-id="${r.id}">Remove</button>`]), 'No community reports yet.')}`;
AV.announcements = () => `${aHead('Announcements', 'Sent to users who saved your station, and shown in their notifications.')}
  <div class="a-cols"><section><div class="sec-h"><h2>New announcement</h2></div><form id="annform" class="cform" novalidate>${field({ id: 'at', label: 'Title', val: '' })}<div class="field"><label for="ab">Message</label><textarea id="ab" rows="4" maxlength="500"></textarea><p class="ferr" id="ab-e" role="alert"></p></div><p class="ferr" id="anerr" role="alert"></p><button class="btn primary" type="submit">Publish announcement</button></form></section>
  <section><div class="sec-h"><h2>Sent</h2></div>${S.ad.ann.length ? `<ul class="alist">${S.ad.ann.map(a => `<li><div><b>${esc(a.title)}</b><p>${esc(a.body)}</p><p class="muted">${dateTime(a.t)}</p></div></li>`).join('')}</ul>` : '<p class="muted pad">Nothing sent yet.</p>'}</section></div>`;
AV.people = () => `${aHead('Followers', 'Users who saved your station. Contact details are not shown.')}
  ${tbl(['Name', 'Water reports', 'Issue reports', 'Member since'], S.ad.people.map(p => [esc(p.name), `<span class="num">${p.water_reports}</span>`, `<span class="num">${p.issue_reports}</span>`, new Date(p.since).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })]), 'No followers yet.')}`;

function adminView(sec) {
  const s = get(S.user.station);
  if (!s) return '<main class="adm-main"><p class="muted pad">This admin account has no station assigned.</p></main>';
  if (!AV[sec]) sec = 'overview';
  const open = S.reports.filter(repOpen).length;
  if (S.ad.loaded) { AD_FRESH = AD_LAST !== sec; AD_LAST = sec; }
  return `<div class="adm"><aside class="adm-side"><a class="brand" href="#/admin">${logo(24, { light: true })}<span>AquaFind</span></a><p class="adm-st"><span>Station admin</span>${esc(s.name)}</p>
  <nav aria-label="Admin sections">${AD_SECTIONS.map(a => `<a href="#/admin/${a[0]}" class="${sec === a[0] ? 'on' : ''}" ${sec === a[0] ? 'aria-current="page"' : ''}>${ico(a[2], 17)}<span>${a[1]}</span>${a[0] === 'issues' && open ? `<b class="cnt num">${open}</b>` : ''}</a>`).join('')}</nav>
  <div class="adm-foot"><a href="#/">${ico('back', 15)} Back to app</a><button class="link" data-act="logout">${ico('logout', 15)} Sign out</button></div></aside>
  <main class="adm-main" id="main">${S.ad.loaded ? AV[sec](s) : skRows(5)}</main></div>`;
}