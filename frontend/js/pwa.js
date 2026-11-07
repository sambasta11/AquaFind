/* AquaFind PWA runtime: service worker, update prompt, install flow (Android + iOS), offline indicator. */
'use strict';
const PWA = (() => {
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const iosSafari = isIOS && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const P = { synced: null, netBad: false, deferred: null, installedNow: false, isIOS, iosSafari };
  const DISMISS = 'aqf-install-dismissed', DAYS = 14;
  const dismissed = () => { try { return Date.now() - +localStorage.getItem(DISMISS) < DAYS * 864e5; } catch { return false; } };
  const emit = () => window.dispatchEvent(new Event('pwa-change'));

  /* 'installed' | 'prompt' (Android/desktop Chrome/Edge) | 'ios' | 'none' */
  P.state = () => standalone() || P.installedNow ? 'installed' : P.deferred ? 'prompt' : isIOS ? 'ios' : 'none';
  P.showBanner = () => ['prompt', 'ios'].includes(P.state()) && !dismissed();
  P.dismiss = () => { try { localStorage.setItem(DISMISS, Date.now()); } catch { } emit(); };
  P.install = async () => {
    if (!P.deferred) return false;
    const d = P.deferred; P.deferred = null; d.prompt();
    const { outcome } = await d.userChoice.catch(() => ({ outcome: 'dismissed' }));
    if (outcome !== 'accepted') emit(); // prompt can only be used once; the browser offers it again later
    return outcome === 'accepted';
  };
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); P.deferred = e; emit(); });
  window.addEventListener('appinstalled', () => { P.deferred = null; P.installedNow = true; emit(); if (typeof toast === 'function') toast('AquaFind is installed. Open it from your home screen.', 'ok'); });

  /* Connectivity: the browser flag plus real request failures (a phone can be "online" with no working data). */
  const bar = document.createElement('div'); bar.id = 'netbar'; bar.setAttribute('role', 'status'); bar.setAttribute('aria-live', 'polite'); bar.hidden = true;
  const paintNet = () => {
    const off = !navigator.onLine || P.netBad, h = document.documentElement;
    h.classList.toggle('offline', off); bar.hidden = !off;
    if (off) bar.textContent = P.synced
      ? `Offline. Availability was last updated at ${new Date(P.synced).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} and may be out of date.`
      : 'Offline. Live station availability cannot be loaded.';
  };
  P.netFail = () => { if (!P.netBad) { P.netBad = true; paintNet(); } };
  P.netOk = () => { if (P.netBad) { P.netBad = false; paintNet(); } };
  P.markSynced = () => { P.synced = Date.now(); P.netOk(); };
  window.addEventListener('offline', paintNet);
  window.addEventListener('online', () => { paintNet(); window.dispatchEvent(new Event('aqf-online')); });
  const host = () => document.getElementById('phone') || document.body;
  document.addEventListener('DOMContentLoaded', () => { host().prepend(bar); paintNet(); });
  if (document.body) { host().prepend(bar); paintNet(); }

  /* Service worker + update prompt. Needs HTTPS (or localhost). */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
    let reloading = false; const had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!had || reloading) return; reloading = true; location.reload(); });
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').then(reg => {
      const offer = w => {
        const t = document.createElement('div'); t.className = 'updbar'; t.setAttribute('role', 'alert');
        t.innerHTML = '<span>A new version of AquaFind is ready.</span><button type="button">Update</button>';
        t.querySelector('button').onclick = () => w.postMessage('SKIP_WAITING');
        host().append(t);
      };
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener('updatefound', () => { const w = reg.installing; w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); }); });
      setInterval(() => reg.update().catch(() => { }), 60 * 60 * 1000);
    }).catch(() => { }));
  }
  return P;
})();
window.PWA = PWA;
