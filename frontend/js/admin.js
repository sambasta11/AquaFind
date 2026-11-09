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
  if (from === to) return;
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
const REP_SEEN = {};                      // last status shown per report, so a changed card can flash
const REP_META = { pending: ['Pending', 'rp-pending'], approved: ['Approved', 'rp-approved'], resolved: ['Resolved', 'rp-resolved'], rejected: ['Rejected', 'rp-rejected'] };
const repWait = r => { const h = (Date.now() - r.t) / 36e5; return r.status === 'pending' && h >= 24 ? `<span class="iss-late">Waiting ${dur(Date.now() - r.t)}</span>` : ''; };
const issCard = (r, i, fresh) => {
  const chg = REP_SEEN[r.id] !== undefined && REP_SEEN[r.id] !== r.status;
  return `<li class="iss-card st-${r.status}${fresh && REP_SEEN[r.id] === undefined ? ' in' : ''}${chg ? ' chg' : ''}" style="--i:${Math.min(i, 9)}">
    <span class="iss-ic" aria-hidden="true">${ico('flag', 18)}</span>
    <div class="iss-body">
      <div class="iss-top"><b class="iss-type">${esc(r.type)}</b>${rtag(r.status)}${repWait(r)}</div>
      <p class="iss-note ${r.note ? '' : 'muted'}">${esc(r.note || 'No details were added.')}</p>
      ${r.adminNote ? `<p class="admin-note"><b>Admin note:</b> ${esc(r.adminNote)}</p>` : ''}
      <div class="iss-meta"><span class="iss-by"><i aria-hidden="true">${esc(initials(r.by || '?'))}</i>${esc(r.by)}</span><span class="muted" title="${esc(dateTime(r.t))}">${ago(r.t)}</span></div>
    </div>
    <div class="iss-act"><span class="btnline">${repBtns(r)}</span></div>
  </li>`;
};
AV.issues = () => {
  const f = S.rf, all = S.reports, cnt = k => all.filter(r => r.status === k).length;
  const l = all.filter(r => f === 'all' || (f === 'open' ? repOpen(r) : !repOpen(r)));
  const stats = [['pending', 'Pending review'], ['approved', 'Approved'], ['resolved', 'Resolved'], ['rejected', 'Rejected']];
  const tabs = [['open', 'Open', all.filter(repOpen).length], ['resolved', 'Closed', all.filter(r => !repOpen(r)).length], ['all', 'All', all.length]];
  const html = `<div class="iss${AD_FRESH ? ' fx' : ''}">${aHead('Issue reports', 'Corrections users have asked for. Review each one, then approve, reject or resolve it.')}
  <dl class="iss-stats">${stats.map(([k, lb]) => `<div class="iss-stat ${REP_META[k][1]}"><dt>${lb}</dt><dd class="num" data-count="${cnt(k)}" data-key="iss-${k}">${cnt(k)}</dd></div>`).join('')}</dl>
  <div class="tabs iss-tabs" role="tablist" aria-label="Filter reports">${tabs.map(c => `<button role="tab" class="tab ${f === c[0] ? 'on' : ''}" aria-selected="${f === c[0]}" data-act="rf" data-p="${c[0]}">${c[1]} <span class="num iss-n">${c[2]}</span></button>`).join('')}</div>
  ${l.length ? `<ul class="iss-list" aria-live="polite">${l.map((r, i) => issCard(r, i, AD_FRESH)).join('')}</ul>`
    : `<div class="iss-empty"><span class="iss-check" aria-hidden="true">${ico('check', 26)}</span><b>${f === 'open' ? 'All clear' : 'Nothing here'}</b><p class="muted">${f === 'open' ? 'No open issue reports. New corrections from users will show up here.' : 'No reports in this view.'}</p></div>`}</div>`;
  all.forEach(r => { REP_SEEN[r.id] = r.status; });
  return html;
};
const WR_SEEN = new Set(), AN_SEEN = new Set();   // cards already shown, so only new ones animate in
const cmCard = (r, i, fresh) => {
  const has = !!r.has, isNew = fresh && !WR_SEEN.has(r.id);
  return `<li class="cm-card ${has ? 'cm-yes' : 'cm-no'}${isNew ? ' in' : ''}" style="--i:${Math.min(i, 9)}">
    <span class="cm-ic" aria-hidden="true">${gauge(has ? 'available' : 'out', 22)}</span>
    <div class="cm-body">
      <div class="cm-top"><b>${has ? 'Has water' : 'No water'}</b><span class="muted" title="${esc(dateTime(r.t))}">${ago(r.t)}</span></div>
      <p class="cm-msg ${r.note ? '' : 'muted'}">${esc(r.note || 'No message was added.')}</p>
      <div class="cm-meta"><span class="iss-by"><i aria-hidden="true">${esc(initials(r.by || '?'))}</i>${esc(r.by)}</span></div>
    </div>
    <button class="btn sm quiet danger cm-rm" data-act="wrdel" data-id="${r.id}" aria-label="Remove report from ${esc(r.by)}">${ico('trash', 15)}<span>Remove</span></button>
  </li>`;
};
AV.community = () => {
  const l = S.ad.wr, yes = l.filter(r => r.has).length, no = l.length - yes, yp = l.length ? Math.round(yes / l.length * 100) : 0;
  const html = `<div class="cm${AD_FRESH ? ' fx' : ''}">${aHead('Community reports', 'Water status reports for your station. Remove spam or mistaken reports.')}
  <dl class="iss-stats cm-stats"><div class="iss-stat rp-resolved"><dt>Says water</dt><dd class="num" data-count="${yes}" data-key="cm-yes">${yes}</dd></div><div class="iss-stat rp-rejected"><dt>Says no water</dt><dd class="num" data-count="${no}" data-key="cm-no">${no}</dd></div></dl>
  ${l.length ? `<div class="ov-vote cm-vote" aria-label="Community agreement"><div class="ov-vote-h"><b>Community agreement</b><span class="muted">${yp}% say water is available</span></div><span class="ov-bar"><i class="seg-available" style="width:${yp}%"></i><i class="seg-out" style="width:${100 - yp}%"></i></span></div>
  <ul class="iss-list cm-list">${l.map((r, i) => cmCard(r, i, AD_FRESH)).join('')}</ul>`
    : `<div class="iss-empty"><span class="iss-check" aria-hidden="true">${ico('users', 26)}</span><b>No community reports yet</b><p class="muted">When users report the water status at your station, it shows up here.</p></div>`}</div>`;
  l.forEach(r => WR_SEEN.add(r.id));
  return html;
};
const anCard = (a, i, fresh) => `<li class="an-card${(fresh || AN_SEEN.size) && !AN_SEEN.has(a.id) ? ' in' : ''}" style="--i:${Math.min(i, 9)}">
  <span class="an-ic" aria-hidden="true">${ico('megaphone', 18)}</span>
  <div class="an-body"><b class="an-t">${esc(a.title)}</b><p class="an-b">${esc(a.body)}</p><p class="muted an-d">${dateTime(a.t)} \u00b7 ${ago(a.t)}</p></div></li>`;
AV.announcements = () => {
  const n = S.ad.people.length, l = S.ad.ann;
  const html = `<div class="an${AD_FRESH ? ' fx' : ''}">${aHead('Announcements', 'Sent to users who saved your station, and shown in their notifications.')}
  <div class="a-cols an-cols"><section class="an-compose"><div class="sec-h"><h2>New announcement</h2></div><p class="muted an-to">${ico('users', 14)} Goes to <b class="num">${n}</b> ${n === 1 ? 'follower' : 'followers'}</p>
  <form id="annform" class="cform" novalidate>${field({ id: 'at', label: 'Title', val: '' })}<div class="field"><label for="ab">Message</label><textarea id="ab" rows="4" maxlength="500" placeholder="What do your followers need to know?"></textarea><div class="an-foot"><p class="ferr" id="ab-e" role="alert"></p><span class="an-count muted num" id="ab-n" aria-live="off">0/500</span></div></div><p class="ferr" id="anerr" role="alert"></p><button class="btn primary an-send" type="submit">${ico('send', 16)} Publish announcement</button></form></section>
  <section class="an-sent"><div class="sec-h"><h2>Sent</h2>${l.length ? `<span class="muted num">${l.length}</span>` : ''}</div>${l.length ? `<ul class="an-list">${l.map((a, i) => anCard(a, i, AD_FRESH)).join('')}</ul>` : `<div class="iss-empty an-empty"><span class="iss-check" aria-hidden="true">${ico('megaphone', 24)}</span><b>Nothing sent yet</b><p class="muted">Your published announcements will be listed here.</p></div>`}</section></div></div>`;
  l.forEach(a => AN_SEEN.add(a.id));
  return html;
};
document.addEventListener('input', e => { if (e.target && e.target.id === 'ab') { const c = document.getElementById('ab-n'); if (c) { c.textContent = e.target.value.length + '/500'; c.classList.toggle('warn', e.target.value.length > 450); } } });
const FOL_SEEN = new Set();
const folCard = (p, i, fresh) => `<li class="fo-card${fresh && !FOL_SEEN.has(p.name + p.since) ? ' in' : ''}" style="--i:${Math.min(i, 11)}">
  <span class="fo-av" aria-hidden="true">${esc(initials(p.name || '?'))}</span>
  <div class="fo-body"><b class="fo-name">${esc(p.name)}</b><span class="muted fo-since">Following since ${new Date(p.since).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</span></div>
  <div class="fo-chips"><span class="fo-chip fo-w" title="Water reports">${gauge('available', 13)}<b class="num">${p.water_reports}</b><small>water</small></span><span class="fo-chip fo-i" title="Issue reports">${ico('flag', 13)}<b class="num">${p.issue_reports}</b><small>issues</small></span></div>
</li>`;
AV.people = () => {
  const l = S.ad.people, wk = l.filter(p => Date.now() - new Date(p.since).getTime() < 7 * 864e5).length;
  const wsum = l.reduce((a, p) => a + (+p.water_reports || 0), 0), isum = l.reduce((a, p) => a + (+p.issue_reports || 0), 0);
  const html = `<div class="fo${AD_FRESH ? ' fx' : ''}">${aHead('Followers', 'Users who saved your station. Contact details are not shown.')}
  <dl class="iss-stats fo-stats"><div class="iss-stat rp-approved"><dt>Followers</dt><dd class="num" data-count="${l.length}" data-key="fo-n">${l.length}</dd></div><div class="iss-stat rp-resolved"><dt>New this week</dt><dd class="num" data-count="${wk}" data-key="fo-wk">${wk}</dd></div><div class="iss-stat rp-pending"><dt>Water reports</dt><dd class="num" data-count="${wsum}" data-key="fo-w">${wsum}</dd></div><div class="iss-stat rp-rejected"><dt>Issue reports</dt><dd class="num" data-count="${isum}" data-key="fo-i">${isum}</dd></div></dl>
  ${l.length ? `<ul class="fo-list">${l.map((p, i) => folCard(p, i, AD_FRESH)).join('')}</ul>`
    : `<div class="iss-empty"><span class="iss-check" aria-hidden="true">${ico('heart', 26)}</span><b>No followers yet</b><p class="muted">When users save your station, they will appear here and get your announcements.</p></div>`}</div>`;
  l.forEach(p => FOL_SEEN.add(p.name + p.since));
  return html;
};

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