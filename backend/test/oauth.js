/* AquaFind Google / Facebook sign-in: real OAuth through Supabase Auth (PKCE).
   1. Button click -> supabase.auth.signInWithOAuth() sends the browser to Google's / Facebook's own login page.
   2. The provider sends the browser back here with ?code=... (or ?error=... if the person cancelled or refused).
   3. supabase-js swaps the code for a Supabase session; onAuthStateChange reports it.
   4. The Supabase access token goes to POST /api/auth/oauth. The server asks Supabase to verify it (the same check as
      supabase.auth.getUser), finds or creates the AquaFind account and returns AquaFind's normal session token.
   5. The temporary Supabase session is dropped from this browser; the AquaFind session is the one that persists.
   The anon key comes from the server (GET /api/auth/config), so nothing is hard-coded here and no secret ever reaches the browser. */
const OAUTH = (() => {
  const NAME = { google: 'Google', facebook: 'Facebook' };
  const ICON = {
    google: '<svg class="soc-i" viewBox="0 0 48 48" width="18" height="18" aria-hidden="true" focusable="false"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>',
    facebook: '<svg class="soc-i" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="#1877F2" d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.874V12h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12z"/></svg>'
  };
  const o = { busy: false, provider: '', err: '', pending: false };
  let cfg = null, sb = null, libP = null, handled = false;

  const loadLib = () => window.supabase?.createClient ? Promise.resolve() : (libP ||= new Promise((ok, no) => {
    const s = document.createElement('script'); s.src = 'vendor/supabase/supabase.js'; s.onload = ok;
    s.onerror = () => { libP = null; no(new Error('Could not load the sign-in library. Check your connection and try again.')); };
    document.head.appendChild(s);
  }));
  async function client() {
    if (!cfg) cfg = await api('GET', '/auth/config');
    if (!cfg.enabled) throw new Error('Google sign-in is not set up yet. Use your email and password.');
    await loadLib();
    // PKCE needs storage to survive the trip to the provider, so persistSession stays on; it is cleared again right after sign-in.
    return sb ||= window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: false, detectSessionInUrl: false } });
  }
  const label = p => o.busy && o.provider === p
    ? `<span class="spinner sm"></span> ${o.pending ? 'Signing you in…' : 'Opening ' + NAME[p] + '…'}`
    : `${ICON[p]} ${NAME[p]}`;
  const btn = p => `<button type="button" class="btn outline soc-btn" data-act="soc" data-p="${p}"${o.busy ? ' disabled' : ''} aria-busy="${o.busy && o.provider === p}">${label(p)}</button>`;
  const paint = () => {
    $$('.soc .soc-btn').forEach(b => { b.disabled = o.busy; b.setAttribute('aria-busy', o.busy && o.provider === b.dataset.p); b.innerHTML = label(b.dataset.p); });
    const m = $('#socmsg'); if (m) m.textContent = o.err;
  };
  const fail = msg => { o.busy = false; o.pending = false; o.err = msg; paint(); };

  async function start(p) {
    if (o.busy || !NAME[p]) return;                         // repeated clicks do nothing
    Object.assign(o, { busy: true, provider: p, err: '', pending: false }); paint();
    try {
      const c = cfg || (cfg = await api('GET', '/auth/config'));
      if (c.enabled && c.providers && !c.providers[p]) throw new Error(NAME[p] + ' sign-in is not switched on for this app yet.');
      const s = await client();
      try { sessionStorage.setItem('aqf_oauth_p', p); } catch { }
      const { error } = await s.auth.signInWithOAuth({ provider: p, options: { redirectTo: location.origin + location.pathname, ...(p === 'google' ? { queryParams: { prompt: 'select_account' } } : {}) } });
      if (error) throw error;                               // on success the browser is already leaving for the provider
    } catch (e) { fail(e.message || 'Sign-in could not start. Please try again.'); }
  }

  // Read what the provider sent back. Supabase uses the query string (PKCE) and, for errors, sometimes the hash.
  function readReturn() {
    const q = new URLSearchParams(location.search), h = new URLSearchParams(location.hash.replace(/^#\/?\??/, ''));
    const pick = k => q.get(k) || (h.has('error') ? h.get(k) : null);
    const code = q.get('code'), error = pick('error'), desc = pick('error_description');
    const had = !!(code || error);
    if (had) { try { history.replaceState(null, '', location.pathname + (h.has('error') ? '#/signin' : location.hash)); } catch { } }
    return { code, error, desc };
  }
  const RETURN = readReturn();   // read once, right away: the router rewrites the hash during start-up
  const lastProvider = () => { try { return sessionStorage.getItem('aqf_oauth_p') || ''; } catch { return ''; } };
  function clear() {
    try { sessionStorage.removeItem('aqf_oauth_p'); Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k)); } catch { }
  }
  async function finish(session) {
    try {
      const d = await api('POST', '/auth/oauth', { access_token: session.access_token });
      Object.assign(o, { busy: false, pending: false, err: '' });
      await enter(d, true);
    } catch (e) { fail(e.message || 'Sign-in could not be completed.'); if (e.status === 401) { /* token expired: they can simply try again */ } }
    finally { try { await sb?.auth.signOut({ scope: 'local' }); } catch { } clear(); }
  }
  // Called once at start-up: completes a sign-in the provider just redirected back from (or reports why it did not finish).
  async function callback() {
    const { code, error, desc } = RETURN;
    if (!code && !error) return;
    const p = lastProvider() || 'google'; Object.assign(o, { provider: p, busy: !!code && !error, pending: true, err: '' });
    if (S.user) { clear(); return; }                        // already signed in to AquaFind: ignore a stale return
    if (location.hash !== '#/signin' && location.hash !== '#/signup') { location.replace('#/signin'); }
    if (error) {
      clear();
      return fail(error === 'access_denied' ? `${NAME[p]} sign-in was cancelled or permission was not granted. You can try again or use your email and password.`
        : (desc ? desc.replace(/\+/g, ' ') : 'Sign-in with ' + NAME[p] + ' failed. Please try again.'));
    }
    paint();
    try {
      const s = await client();
      s.auth.onAuthStateChange((ev, session) => {            // supabase-js says when the code exchange produced a session
        if (ev === 'SIGNED_IN' && session && !handled) { handled = true; setTimeout(() => finish(session), 0); }   // not awaited here: supabase calls must not run inside this callback
      });
      const { error: ex } = await s.auth.exchangeCodeForSession(code);
      if (ex) { clear(); fail(`${NAME[p]} sign-in could not be completed (${ex.message}). Please try again.`); }
    } catch (e) { clear(); fail(e.message || 'Sign-in could not be completed.'); }
  }
  // Back button from the provider's page restores this page frozen in its "busy" state: unfreeze it.
  window.addEventListener('pageshow', e => { if (e.persisted && o.busy && !o.pending) { o.busy = false; o.err = ''; paint(); } });

  const html = () => `<div class="or"><span>or continue with</span></div><div class="soc">${btn('google')}</div><p class="ferr form soc-msg" id="socmsg" role="alert" aria-live="polite">${esc(o.err)}</p>`;
  return { html, start, callback, clear, state: o };
})();
