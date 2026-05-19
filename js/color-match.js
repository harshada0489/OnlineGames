/* =========================================================
   Color Match — match today's color with RGB sliders.
   One try per day. Deterministic from puzzle number.
   ========================================================= */

(function () {
  const GAME = 'color-match';
  const puzzleNum = getPuzzleNumber();
  document.getElementById('puzzleNum').textContent = 'Game #' + puzzleNum;

  // --- Generate today's target colour from the daily seed ---
  // Three independent random RGB channels often produce muddy near-greys that
  // look the same to the eye even when the numbers differ. Instead, the hue
  // is rotated by the golden angle (137.508°) each day — that guarantees
  // every consecutive day lands far away on the colour wheel — and the
  // saturation / lightness ranges stay in a "vivid" band so the daily target
  // is always a clearly recognisable colour, not a muddy mid-tone.
  const rnd = seededRandom(seedFor(GAME));
  const hue = (puzzleNum * 137.508) % 360;
  const sat = 60 + Math.floor(rnd() * 35);   // 60–95 %
  const lig = 42 + Math.floor(rnd() * 28);   // 42–70 %
  const target = hslToRgb(hue, sat, lig);

  // Standard HSL → RGB conversion. Inputs: h 0–360, s/l 0–100.
  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return {
      r: Math.round(f(0) * 255),
      g: Math.round(f(8) * 255),
      b: Math.round(f(4) * 255)
    };
  }

  const targetBlock = document.getElementById('targetBlock');
  const guessBlock  = document.getElementById('guessBlock');
  const rEl = document.getElementById('r');
  const gEl = document.getElementById('g');
  const bEl = document.getElementById('b');
  const rv  = document.getElementById('rv');
  const gv  = document.getElementById('gv');
  const bv  = document.getElementById('bv');
  const submitBtn = document.getElementById('submitBtn');

  targetBlock.style.background = `rgb(${target.r},${target.g},${target.b})`;
  updateGuess();

  [rEl, gEl, bEl].forEach(el => el.addEventListener('input', updateGuess));

  function updateGuess() {
    rv.textContent = rEl.value;
    gv.textContent = gEl.value;
    bv.textContent = bEl.value;
    guessBlock.style.background = `rgb(${rEl.value},${gEl.value},${bEl.value})`;
  }

  // Replays are allowed: every page load starts a fresh attempt at today's
  // puzzle. Stats / streak still record only the first play of the day
  // (handled inside markPlayedToday).
  submitBtn.addEventListener('click', onSubmit);

  function onSubmit() {
    const guess = { r: +rEl.value, g: +gEl.value, b: +bEl.value };
    const accuracy = colorAccuracy(guess, target);
    const grid = buildEmojiGrid(guess, target);
    const won = accuracy >= 85;  // generous threshold; the game is calm

    saveTodayResult(GAME, { accuracy, grid, guess, target });
    markPlayedToday(GAME, won);

    lockSliders();
    playTone(won ? 660 : 320);

    // Celebration popup for a really sharp eye (> 95 % accuracy).
    if (accuracy > 95) {
      partyBurst();
      showWinModal({
        emoji: '🎨',
        title: 'Beautiful match!',
        subtitle: `${accuracy}% accuracy`
      });
    }

    showResult(accuracy, grid, guess, false);
  }

  function lockSliders() {
    [rEl, gEl, bEl].forEach(el => el.disabled = true);
    submitBtn.disabled = true;
    submitBtn.style.display = 'none';
  }

  // --- Accuracy: 100% = exact match, 0% = max possible RGB distance ---
  function colorAccuracy(a, b) {
    const d = Math.sqrt(
      (a.r - b.r) ** 2 +
      (a.g - b.g) ** 2 +
      (a.b - b.b) ** 2
    );
    const maxD = Math.sqrt(3 * 255 * 255);
    return Math.round((1 - d / maxD) * 100);
  }

  // --- Build a 5-tile emoji grid based on per-channel closeness ---
  // 🟩 = very close, 🟨 = okay, ⬜ = far — for R, G, B, plus 2 overall.
  function buildEmojiGrid(g, t) {
    const tile = (diff) => {
      if (diff <= 20)  return '🟩';
      if (diff <= 60)  return '🟨';
      return '⬜';
    };
    const dR = Math.abs(g.r - t.r);
    const dG = Math.abs(g.g - t.g);
    const dB = Math.abs(g.b - t.b);
    const avg = (dR + dG + dB) / 3;
    return tile(dR) + tile(dG) + tile(dB) + tile(avg) + tile(avg);
  }

  function showResult(accuracy, grid, guess, replay) {
    document.getElementById('resultPanel').style.display = 'block';
    // Reveal the target now that the day's attempt is done.
    targetBlock.style.background = `rgb(${target.r},${target.g},${target.b})`;
    guessBlock.style.background  = `rgb(${guess.r},${guess.g},${guess.b})`;

    const won = accuracy >= 85;
    document.getElementById('resultTitle').textContent =
      replay ? `You played Color Match #${puzzleNum}` :
      won    ? `Beautiful! ${accuracy}% match 🎉`
             : `Today's match: ${accuracy}%`;

    document.getElementById('resultGrid').textContent = grid;
    document.getElementById('resultText').textContent = `Target rgb(${target.r}, ${target.g}, ${target.b}) — your guess rgb(${guess.r}, ${guess.g}, ${guess.b}).`;

    renderStatsMini(GAME, document.getElementById('statsMini'));
    startCountdown('cd');

    document.getElementById('shareBtn').addEventListener('click', () => {
      // Share text — never includes the actual RGB values.
      const text = `🎨 Color Match #${puzzleNum} — ${accuracy}% match\n${grid}\ndailycalmgames`;
      shareResult(text);
    });
  }

  // --- Render the small stats row (played / wins / streak / best) ---
  function renderStatsMini(game, el) {
    const s = loadStats(game);
    const winPct = s.played ? Math.round((s.wins / s.played) * 100) : 0;
    el.innerHTML = `
      <div class="stat"><span class="num">${s.played}</span><span class="lbl">Played</span></div>
      <div class="stat"><span class="num">${winPct}%</span><span class="lbl">Win %</span></div>
      <div class="stat"><span class="num">${s.currentStreak}</span><span class="lbl">Streak</span></div>
      <div class="stat"><span class="num">${s.bestStreak}</span><span class="lbl">Best</span></div>
    `;
  }
})();
