/* =========================================================
   Daily Games — Shared Utilities
   ---------------------------------------------------------
   All games share these helpers:
     - Date / puzzle number formula
     - Seeded random generator (so every player gets the
       same puzzle on the same calendar day worldwide)
     - localStorage stats helpers
     - Theme toggle
     - Sound toggle
     - Share-to-clipboard helper
     - Countdown-to-midnight helper
   No external libraries. No network calls. No tracking.
   ========================================================= */

/* ---------- Launch date ----------
   Change this single value to reset puzzle #1.        */
const LAUNCH_DATE = new Date('2026-01-01T00:00:00');

/* ---------- Puzzle number ----------
   Counts whole calendar days from LAUNCH_DATE to "today" in the user's
   local timezone. We pass the y/m/d components through Date.UTC() so the
   arithmetic is a clean (days * 86,400,000) ms — otherwise, when the local
   timezone crosses a DST boundary between launch and today (e.g. spring
   forward in California), the millisecond difference is short by an hour
   and Math.floor() rounds the count down by 1, leaving the puzzle stuck on
   yesterday's number for the entire DST half of the year.                  */
function getPuzzleNumber() {
  const today = new Date();
  const startUTC = Date.UTC(LAUNCH_DATE.getFullYear(), LAUNCH_DATE.getMonth(), LAUNCH_DATE.getDate());
  const nowUTC   = Date.UTC(today.getFullYear(),       today.getMonth(),       today.getDate());
  const oneDay   = 1000 * 60 * 60 * 24;
  return Math.floor((nowUTC - startUTC) / oneDay) + 1;
}

/* ---------- Today's date key (YYYY-MM-DD) ---------- */
function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ---------- Seeded random ----------
   Mulberry32 — small, fast, deterministic.
   Same seed always returns the same sequence.          */
function seededRandom(seed) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* Build an integer seed from puzzle number + game name */
function seedFor(gameName) {
  const p = getPuzzleNumber();
  let h = 2166136261;
  const str = `${gameName}-${p}`;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ---------- localStorage helpers ---------- */
function storageKey(gameName, suffix) {
  return `dcg_${gameName}_${suffix}`;
}

function loadStats(gameName) {
  try {
    const raw = localStorage.getItem(storageKey(gameName, 'stats'));
    if (!raw) return defaultStats();
    return JSON.parse(raw);
  } catch (e) {
    return defaultStats();
  }
}

function defaultStats() {
  return {
    played: 0,
    wins: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastPlayed: null,
    lastWon: null
  };
}

function saveStats(gameName, stats) {
  localStorage.setItem(storageKey(gameName, 'stats'), JSON.stringify(stats));
}

/* Has the user already played today's puzzle? */
function hasPlayedToday(gameName) {
  return localStorage.getItem(storageKey(gameName, 'today')) === getTodayKey();
}

/* Mark today as played, and update stats (win = true / false).
   Players can replay any game as many times as they like in a day, but
   only the FIRST play of the day updates the lifetime stats / streak —
   otherwise refreshes would inflate "Played" and break streak semantics. */
function markPlayedToday(gameName, won) {
  const todayKey = getTodayKey();
  const alreadyMarkedToday =
    localStorage.getItem(storageKey(gameName, 'today')) === todayKey;
  localStorage.setItem(storageKey(gameName, 'today'), todayKey);
  if (alreadyMarkedToday) return;     // replay — leave stats alone

  const stats = loadStats(gameName);
  stats.played += 1;

  if (won) {
    stats.wins += 1;
    // Streak logic: if last win was yesterday, +1, else reset to 1
    if (stats.lastWon) {
      const last = new Date(stats.lastWon);
      const now  = new Date(todayKey);
      const diff = Math.round((now - last) / (1000 * 60 * 60 * 24));
      stats.currentStreak = (diff === 1) ? stats.currentStreak + 1 : 1;
    } else {
      stats.currentStreak = 1;
    }
    if (stats.currentStreak > stats.bestStreak) {
      stats.bestStreak = stats.currentStreak;
    }
    stats.lastWon = todayKey;
  } else {
    stats.currentStreak = 0;
  }

  stats.lastPlayed = todayKey;
  saveStats(gameName, stats);
}

/* Save / load the user's emoji result for today's puzzle  */
function saveTodayResult(gameName, resultObj) {
  localStorage.setItem(storageKey(gameName, 'result'), JSON.stringify(resultObj));
}
function loadTodayResult(gameName) {
  try {
    const raw = localStorage.getItem(storageKey(gameName, 'result'));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/* ---------- Theme (dark / light) ---------- */
function applyTheme() {
  const t = localStorage.getItem('dcg_theme') || 'light';
  document.documentElement.setAttribute('data-theme', t);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = (t === 'dark') ? '☀' : '☾';
}
function toggleTheme() {
  const cur = localStorage.getItem('dcg_theme') || 'light';
  localStorage.setItem('dcg_theme', cur === 'dark' ? 'light' : 'dark');
  applyTheme();
}

/* ---------- Sound (optional) ---------- */
function isSoundOn() {
  return localStorage.getItem('dcg_sound') === 'on';
}
function toggleSound() {
  const on = isSoundOn();
  localStorage.setItem('dcg_sound', on ? 'off' : 'on');
  const btn = document.getElementById('soundToggle');
  if (btn) btn.textContent = on ? '🔇' : '🔊';
}
function applySoundButton() {
  const btn = document.getElementById('soundToggle');
  if (btn) btn.textContent = isSoundOn() ? '🔊' : '🔇';
}
/* Play a soft tone using the WebAudio API. No external files. */
function playTone(freq = 440, duration = 0.12) {
  if (!isSoundOn()) return;
  try {
    const ctx = playTone._ctx || (playTone._ctx = new (window.AudioContext || window.webkitAudioContext)());
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.value = 0.07;
    o.connect(g).connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    o.stop(ctx.currentTime + duration);
  } catch (e) { /* silent */ }
}

/* ---------- Share helper ---------- */
function shareResult(text) {
  // Try the modern share API first (better mobile UX).
  if (navigator.share) {
    navigator.share({ text }).catch(() => copyText(text));
  } else {
    copyText(text);
  }
}
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(showToast, () => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); showToast(); }
  catch (e) { /* silent */ }
  document.body.removeChild(ta);
}
function showToast(msg = 'Copied!') {
  let t = document.getElementById('dcgToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'dcgToast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._tid);
  showToast._tid = setTimeout(() => t.classList.remove('show'), 1600);
}

/* ---------- Confetti burst ----------
   Shared celebration helper. Any game can call partyBurst() to spawn ~60
   coloured pieces that fly out from the centre and fade. Pure CSS animation
   driven by the .confetti-wrap / .confetti-piece classes in style.css.     */
function partyBurst() {
  const wrap = document.createElement('div');
  wrap.className = 'confetti-wrap';
  document.body.appendChild(wrap);

  const colors = ['#6AAA64', '#C9B458', '#E74C3C', '#3498DB', '#F1C40F', '#A569BD'];
  const PIECES = 60;
  for (let i = 0; i < PIECES; i++) {
    const p = document.createElement('span');
    p.className = 'confetti-piece';
    p.style.background = colors[i % colors.length];
    const angle = Math.random() * Math.PI * 2;
    const dist  = 140 + Math.random() * 260;
    p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    p.style.setProperty('--rot', `${Math.floor(Math.random() * 720 - 360)}deg`);
    p.style.animationDuration = `${1000 + Math.random() * 500}ms`;
    p.style.animationDelay    = `${Math.random() * 120}ms`;
    wrap.appendChild(p);
  }
  setTimeout(() => wrap.remove(), 1800);
}

/* ---------- Win modal ----------
   Generic celebration popup. Each game calls
       showWinModal({ emoji, title, subtitle })
   to overlay a small centred card on top of the page. The user dismisses it
   with the Continue button or by clicking the dim backdrop.
   Pair with partyBurst() for the full confetti effect.                     */
function showWinModal(opts) {
  // If a previous modal is still on screen, replace it.
  const prev = document.querySelector('.win-modal-backdrop');
  if (prev) prev.remove();

  const m = document.createElement('div');
  m.className = 'win-modal-backdrop';
  m.innerHTML = `
    <div class="win-modal" role="dialog" aria-modal="true">
      <div class="win-modal-emoji">${opts.emoji || '🎉'}</div>
      <h3>${opts.title || 'You won!'}</h3>
      ${opts.subtitle ? `<div class="win-modal-sub">${opts.subtitle}</div>` : ''}
      <button class="btn">Continue</button>
    </div>
  `;
  document.body.appendChild(m);
  const close = () => m.remove();
  m.querySelector('button').addEventListener('click', close);
  // Click on dim backdrop (but not the card itself) also closes.
  m.addEventListener('click', (e) => { if (e.target === m) close(); });
}

/* ---------- Countdown to next midnight ---------- */
function startCountdown(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  function tick() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const diff = next - now;
    const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    el.textContent = `${h}:${m}:${s}`;
  }
  tick();
  setInterval(tick, 1000);
}

/* ---------- Page bootstrap ----------
   Every page calls this on load to install the top bar.   */
function setupTopBar() {
  applyTheme();
  applySoundButton();
  const tb = document.getElementById('themeToggle');
  if (tb) tb.addEventListener('click', toggleTheme);
  const sb = document.getElementById('soundToggle');
  if (sb) sb.addEventListener('click', toggleSound);
}

/* Auto-run on every page that includes this script */
document.addEventListener('DOMContentLoaded', setupTopBar);

/* =========================================================
   Cookie consent + Google Consent Mode v2 + tag loading
   ---------------------------------------------------------
   Loads Google Analytics and/or Google AdSense ONLY after the
   user explicitly accepts. Respects the Global Privacy Control
   browser signal (treats GPC as auto-decline). Persists the
   user's choice in localStorage so the banner doesn't reappear.
   The footer "Cookie Settings" / "Do Not Sell or Share" links
   call window.openConsentSettings() to re-open the chooser.
   ========================================================= */

/* ---- Fill these in with your real Google IDs.
   Leave a value empty to disable that service. -------------- */
const GA_MEASUREMENT_ID = 'G-X6438ZM58Z';            // GA4 property for puzzleminute.com / onceadaygame.com
const ADSENSE_CLIENT_ID = '';                       // e.g. 'ca-pub-1234567890123456'

const CONSENT_KEY = 'dcg_consent';

function loadConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function saveConsent(state) {
  state.timestamp = new Date().toISOString();
  state.version = 1;
  localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
}

/* Set Google Consent Mode v2 defaults. Must run BEFORE any
   Google tag (gtag.js, AdSense) is loaded, so the tags start
   in a "denied" state and don't drop any cookies until the
   user makes a choice.                                         */
function initConsentMode() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  gtag('consent', 'default', {
    ad_storage:           'denied',
    ad_user_data:         'denied',
    ad_personalization:   'denied',
    analytics_storage:    'denied',
    functionality_storage:'granted',
    security_storage:     'granted',
    wait_for_update: 500
  });
}

function applyConsent(state) {
  gtag('consent', 'update', {
    ad_storage:         state.advertising ? 'granted' : 'denied',
    ad_user_data:       state.advertising ? 'granted' : 'denied',
    ad_personalization: state.advertising ? 'granted' : 'denied',
    analytics_storage:  state.analytics   ? 'granted' : 'denied'
  });
  if (state.analytics || state.advertising) loadGoogleTags();
}

/* Inject the gtag.js and AdSense scripts. Idempotent — safe to
   call more than once.                                         */
function loadGoogleTags() {
  if (loadGoogleTags._loaded) return;
  loadGoogleTags._loaded = true;

  if (GA_MEASUREMENT_ID) {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
  }
  if (ADSENSE_CLIENT_ID) {
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADSENSE_CLIENT_ID;
    document.head.appendChild(s);
  }
}

/* Single helper that records the decision, fires Consent Mode
   updates, loads tags if needed, and dismisses the UI.         */
function decideConsent(state) {
  saveConsent(state);
  applyConsent(state);
  const b = document.querySelector('.cookie-banner');
  if (b) b.remove();
  const m = document.querySelector('.consent-modal-backdrop');
  if (m) m.remove();
}

/* Bottom-sticky banner shown on first visit.                  */
function buildCookieBanner() {
  if (document.querySelector('.cookie-banner')) return;
  const banner = document.createElement('div');
  banner.className = 'cookie-banner';
  banner.innerHTML =
    '<div class="cookie-banner-text">' +
      '<strong>We use cookies.</strong> Daily Games uses cookies for analytics and to show ads. ' +
      'Read our <a href="privacy.html">Privacy Policy</a>.' +
    '</div>' +
    '<div class="cookie-banner-actions">' +
      '<button class="cookie-btn cookie-customize" type="button">Customize</button>' +
      '<button class="cookie-btn cookie-reject"    type="button">Reject all</button>' +
      '<button class="cookie-btn cookie-accept"    type="button">Accept all</button>' +
    '</div>';
  document.body.appendChild(banner);
  banner.querySelector('.cookie-accept').onclick    = () => decideConsent({ analytics: true,  advertising: true  });
  banner.querySelector('.cookie-reject').onclick    = () => decideConsent({ analytics: false, advertising: false });
  banner.querySelector('.cookie-customize').onclick = () => showConsentModal();
}

/* Centred modal with per-category toggles. Opened by the
   "Customize" banner button and the footer "Cookie Settings" link. */
function showConsentModal() {
  const cur = loadConsent() || { analytics: false, advertising: false };
  const m = document.createElement('div');
  m.className = 'consent-modal-backdrop';
  m.innerHTML =
    '<div class="consent-modal" role="dialog" aria-modal="true">' +
      '<h3>Cookie &amp; Privacy Choices</h3>' +
      '<p class="consent-modal-sub">Choose which cookies to allow. Required cookies always work.</p>' +
      '<label class="consent-row">' +
        '<input type="checkbox" checked disabled />' +
        '<div><strong>Required</strong><div class="consent-row-desc">' +
          'Saves your theme, scores, and streaks on this device. Never sent anywhere.' +
        '</div></div>' +
      '</label>' +
      '<label class="consent-row">' +
        '<input type="checkbox" id="consentAnalytics" ' + (cur.analytics ? 'checked' : '') + ' />' +
        '<div><strong>Analytics</strong><div class="consent-row-desc">' +
          'Google Analytics. Helps us see which games are used.' +
        '</div></div>' +
      '</label>' +
      '<label class="consent-row">' +
        '<input type="checkbox" id="consentAds" ' + (cur.advertising ? 'checked' : '') + ' />' +
        '<div><strong>Advertising</strong><div class="consent-row-desc">' +
          'Google AdSense. Allows personalised ads — declining still shows ads, just non-personalised.' +
        '</div></div>' +
      '</label>' +
      '<div class="consent-modal-actions">' +
        '<button class="btn secondary" id="consentRejectAll">Reject all</button>' +
        '<button class="btn"           id="consentSave">Save choices</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(m);
  m.querySelector('#consentSave').onclick = () => decideConsent({
    analytics:   document.getElementById('consentAnalytics').checked,
    advertising: document.getElementById('consentAds').checked
  });
  m.querySelector('#consentRejectAll').onclick = () => decideConsent({ analytics: false, advertising: false });
  m.addEventListener('click', (e) => { if (e.target === m) m.remove(); });
}

/* Exposed globally so footer links can call it. */
window.openConsentSettings = showConsentModal;

/* Bootstrap — runs immediately on script load, BEFORE any
   Google scripts could possibly inject anything. The banner
   itself is deferred to DOMContentLoaded since it needs <body>. */
(function consentBoot() {
  initConsentMode();
  const stored = loadConsent();
  const gpcOn  = navigator.globalPrivacyControl === true;

  if (stored) {
    // Already decided — re-apply.
    applyConsent(stored);
  } else if (gpcOn) {
    // GPC signal = auto-decline both categories silently.
    decideConsent({ analytics: false, advertising: false });
  } else {
    // First visit — show the banner once the body exists.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', buildCookieBanner);
    } else {
      buildCookieBanner();
    }
  }
})();

/* ---------- Day rollover watchdog ----------
   The puzzle for a given game is derived from getPuzzleNumber(), which is
   only recomputed when the page (re)loads. If the user leaves a tab open
   across local midnight, the visible state stays frozen on yesterday's
   puzzle / result. This watcher reloads the page when the local calendar
   day changes, so they see the new daily puzzle automatically.

   Two triggers:
     1. Periodic check (60s) while the tab is open.
     2. On visibilitychange — handles the common case of returning to a tab
        the next morning.                                                    */
(function watchDayRollover() {
  const startedOn = getTodayKey();
  function check() {
    if (getTodayKey() !== startedOn) {
      // Force a fresh fetch path so any cached HTML/JS re-evaluates the date.
      location.reload();
    }
  }
  setInterval(check, 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) check();
  });
  // Also covers focus events (some browsers fire only this for tab return).
  window.addEventListener('focus', check);
})();
