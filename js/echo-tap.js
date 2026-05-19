/* =========================================================
   Echo Tap — daily Simon-style memory game.
   The pad sequence is deterministic from the daily seed,
   so every player sees the same colour order.
   Game ends on the first mistake. Your highest level is saved.
   ========================================================= */

(function () {
  const GAME = 'echo-tap';
  const MAX_LEVEL = 20;
  const puzzleNum = getPuzzleNumber();
  document.getElementById('puzzleNum').textContent = 'Game #' + puzzleNum;

  // --- Build today's master sequence (up to MAX_LEVEL pads) ---
  // Level N uses the first N elements of this array.
  const rnd = seededRandom(seedFor(GAME));
  const masterSeq = [];
  for (let i = 0; i < MAX_LEVEL; i++) masterSeq.push(Math.floor(rnd() * 4));

  // Each pad has a tone — gentle pentatonic for a calm feel.
  const TONES = [392, 523, 440, 587];   // G4, C5, A4, D5

  const pads      = Array.from(document.querySelectorAll('.seq-pad'));
  const levelEl   = document.getElementById('level');
  const statusEl  = document.getElementById('status');
  const startBtn  = document.getElementById('startBtn');

  let level = 1;
  let userIdx = 0;
  let accepting = false;
  let done = false;

  // Replays allowed — refresh to start a fresh attempt at today's sequence.
  // Stats / streak are only updated on the first play of the day.
  startBtn.addEventListener('click', startRound);

  pads.forEach(p => {
    p.addEventListener('click', () => onPadTap(parseInt(p.dataset.i, 10)));
  });

  function startRound() {
    startBtn.disabled = true;
    startBtn.style.display = 'none';
    playRound();
  }

  async function playRound() {
    accepting = false;
    statusEl.textContent = 'Watch…';
    levelEl.textContent = level;
    setPadsEnabled(false);
    await wait(500);

    const seq = masterSeq.slice(0, level);
    for (let i = 0; i < seq.length; i++) {
      await flashPad(seq[i]);
      await wait(180);
    }
    statusEl.textContent = 'Your turn';
    userIdx = 0;
    accepting = true;
    setPadsEnabled(true);
  }

  function onPadTap(i) {
    if (!accepting || done) return;
    const seq = masterSeq.slice(0, level);
    flashPad(i, /*tap=*/true);

    if (i !== seq[userIdx]) {
      // Mistake — game over for today.
      accepting = false;
      setPadsEnabled(false);
      finish(level - 1);          // highest fully-completed level
      return;
    }
    userIdx += 1;
    if (userIdx >= seq.length) {
      accepting = false;
      setPadsEnabled(false);
      if (level >= MAX_LEVEL) {
        finish(MAX_LEVEL);        // perfect day
      } else {
        level += 1;
        setTimeout(playRound, 500);
      }
    }
  }

  function finish(reached) {
    done = true;
    const won = reached >= 5;      // calm threshold: 5+ feels like a win
    saveTodayResult(GAME, { level: reached });
    markPlayedToday(GAME, won);
    if (won) {
      partyBurst();
      showWinModal({
        emoji: '🎵',
        title: `Level ${reached}!`,
        subtitle: reached >= MAX_LEVEL ? 'Perfect memory' : 'Highest today'
      });
    }
    showResult(reached, false);
  }

  function showResult(reached, replay) {
    document.getElementById('resultPanel').style.display = 'block';
    document.getElementById('resultTitle').textContent =
      replay ? `You played Echo Tap #${puzzleNum}` : `You reached level ${reached} 🎉`;
    document.getElementById('resultText').textContent =
      reached === 0 ? `Tomorrow is another chance.` : `Highest level today: ${reached}.`;

    renderStatsMini(GAME, document.getElementById('statsMini'));
    startCountdown('cd');

    document.getElementById('shareBtn').addEventListener('click', () => {
      const text = `🎵 Echo Tap #${puzzleNum} — Reached level ${reached}\ndailycalmgames`;
      shareResult(text);
    });
  }

  function setPadsEnabled(on) {
    pads.forEach(p => p.disabled = !on);
  }

  function flashPad(i, isTap) {
    return new Promise(resolve => {
      const pad = pads[i];
      pad.classList.add('active');
      playTone(TONES[i], 0.22);
      setTimeout(() => {
        pad.classList.remove('active');
        resolve();
      }, isTap ? 160 : 360);
    });
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

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
