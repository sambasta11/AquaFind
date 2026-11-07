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
const repOpen = r => r.status === 'pending' || r.status === 'approved';
const repBtns = r => r.status === 'resolved' || r.status === 'rejected' ? `<button class="btn sm quiet" data-act="rstat" data-id="${r.id}" data-p="pending">Reopen</button>`
  : `${r.status === 'pending' ? `<button class="btn sm outline" data-act="rstat" data-id="${r.id}" data-p="approved">Approve</button><button class="btn sm quiet danger" data-act="rstat" data-id="${r.id}" data-p="rejected">Reject</button>` : ''}<button class="btn sm outline" data-act="rstat" data-id="${r.id}" data-p="resolved">Resolve</button>`;
AV.overview = s => {
  const open = S.reports.filter(repOpen), h = S.ad.history;
  const rows = h.slice(0, 8).map((r, i) => [`${dateTime(r.t)}`, `<span class="st st-${r.status}">${gauge(r.status, 14)}<span>${SM[r.status].label}</span></span>`, `<span class="num">${dur((i ? h[i - 1].t : Date.now()) - r.t)}</span>`]);
  return `${aHead('Overview', esc(s.name))}
  <dl class="figs"><div><dt>Current status</dt><dd><span class="st st-${s.status}">${gauge(s.status, 16)}<span>${SM[s.status].label}</span></span><small>Updated ${ago(s.upd)}</small></dd></div>
  <div><dt>Followers</dt><dd class="num">${S.ad.people.length}<small>saved this station</small></dd></div>
  <div><dt>Open issue reports</dt><dd class="num">${open.length}<small>${S.reports.length} total</small></dd></div>
  <div><dt>Community, last 3 hr</dt><dd class="num">${s.yes} / ${s.no}<small>water / no water</small></dd></div></dl>
  <div class="a-cols"><section><div class="sec-h"><h2>Needs attention</h2><a class="link" href="#/admin/issues">All reports</a></div>${open.length ? `<ul class="alist">${open.slice(0, 4).map(r => `<li><div><b>${esc(r.type)}</b><p class="muted">${esc(r.note || 'No details')} · ${esc(r.by)} · ${ago(r.t)}</p></div><span class="btnline">${repBtns(r)}</span></li>`).join('')}</ul>` : '<p class="muted pad">No open issue reports.</p>'}</section>
  <section><div class="sec-h"><h2>Status history</h2></div>${tbl(['Changed', 'Status', 'Held for'], rows, 'No changes recorded.')}</section></div>`;
};
AV.availability = s => {
  if (!S.as) S.as = s.status;
  return `${aHead('Availability', 'Update what users see. Followers are notified.')}
  <div class="a-cols"><section><div class="sec-h"><h2>Water status</h2></div><div class="radios stat" role="radiogroup" aria-label="Water status">${SKEYS.map(k => `<label class="radio ${S.as === k ? 'on' : ''} st-${k}"><input type="radio" name="as" value="${k}" ${S.as === k ? 'checked' : ''} data-act="aset" data-p="${k}">${gauge(k, 20)}<span>${SM[k].label}</span></label>`).join('')}</div>
  <p class="muted pad">Currently <b>${SM[s.status].label}</b>, updated ${ago(s.upd)}.</p><button class="btn primary" data-act="aupd" ${S.as === s.status ? 'disabled' : ''}>Update status</button></section>
  <section><div class="sec-h"><h2>Station information</h2></div><form id="infoform" class="cform" novalidate>${field({ id: 'an', label: 'Station name', val: s.name })}${field({ id: 'aa', label: 'Address', val: s.addr })}${field({ id: 'ap', label: 'Contact number', type: 'tel', val: s.tel })}
  <div class="two">${field({ id: 'ao', label: 'Opens (0–23)', type: 'number', val: s.o })}${field({ id: 'ac', label: 'Closes (1–24)', type: 'number', val: s.c })}</div><p class="ferr" id="aerr" role="alert"></p><button class="btn outline" type="submit">Save information</button></form></section></div>`;
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
  return `<div class="adm"><aside class="adm-side"><a class="brand" href="#/admin">${logo(24, { light: true })}<span>AquaFind</span></a><p class="adm-st"><span>Station admin</span>${esc(s.name)}</p>
  <nav aria-label="Admin sections">${AD_SECTIONS.map(a => `<a href="#/admin/${a[0]}" class="${sec === a[0] ? 'on' : ''}" ${sec === a[0] ? 'aria-current="page"' : ''}>${ico(a[2], 17)}<span>${a[1]}</span>${a[0] === 'issues' && open ? `<b class="cnt num">${open}</b>` : ''}</a>`).join('')}</nav>
  <div class="adm-foot"><a href="#/">${ico('back', 15)} Back to app</a><button class="link" data-act="logout">${ico('logout', 15)} Sign out</button></div></aside>
  <main class="adm-main" id="main">${S.ad.loaded ? AV[sec](s) : skRows(5)}</main></div>`;
}
