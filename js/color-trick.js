/* =========================================================
   Color Trick — daily Stroop-effect test.
   Show a colour word painted in a *different* colour;
   player taps the colour the text is painted in.
   10 rounds, no early termination on a wrong answer.
   Mid-game progress is persisted so a refresh resumes.
   ========================================================= */

(function () {
  const GAME = 'color-trick';
  const ROUNDS_TOTAL = 10;

  /* Four universal colours.
     `name` is also the word that may be drawn on screen.       */
  const COLORS = [
    { name: 'RED',    hex: '#E74C3C' },
    { name: 'BLUE',   hex: '#3498DB' },
    { name: 'GREEN',  hex: '#27AE60' },
    { name: 'YELLOW', hex: '#F1C40F' }
  ];

  /* Time given per round (ms). Difficulty ramps as the spec asks. */
  function roundDuration(i) {
    if (i < 3) return 3000;
    if (i < 7) return 2000;
    return 1500;
  }

  /* Ring geometry (matches strooply.html <svg viewBox> + r=130) */
  const RING_CIRC = 2 * Math.PI * 130;        // ≈ 816.81

  const puzzleNum = getPuzzleNumber();
  document.getElementById('puzzleNum').textContent = 'Game #' + puzzleNum;

  /* ---------- Build today's 10 rounds from the daily seed ----------
     Ink colour is forced to differ from the word — that's the Stroop conflict. */
  const rnd = seededRandom(seedFor(GAME));
  const rounds = [];
  for (let i = 0; i < ROUNDS_TOTAL; i++) {
    const w = Math.floor(rnd() * COLORS.length);
    let ink;
    do { ink = Math.floor(rnd() * COLORS.length); } while (ink === w);
    rounds.push({ word: COLORS[w], ink: COLORS[ink], duration: roundDuration(i) });
  }

  /* ---------- DOM refs ---------- */
  const stage     = document.getElementById('stage');
  const wordEl    = document.getElementById('word');   // also doubles as the Start button
  const ring      = document.getElementById('ringCircle');
  const roundEl   = document.getElementById('roundNum');
  const bar       = document.getElementById('roundsBar');
  const optButtons = Array.from(document.querySelectorAll('.strooply-btn'));

  /* Init ring (full) */
  ring.style.strokeDasharray  = RING_CIRC;
  ring.style.strokeDashoffset = 0;

  /* ---------- Mid-game progress (per-day, cleared at midnight) ---------- */
  const PROGRESS_KEY = 'dcg_color-trick_progress';
  function saveProgress(s) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ day: getTodayKey(), state: s }));
  }
  function loadProgress() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (p.day !== getTodayKey()) return null;   // stale
      return p.state;
    } catch (e) { return null; }
  }
  function clearProgress() { localStorage.removeItem(PROGRESS_KEY); }

  /* ---------- Game-specific extra stats (best score, best time, avg) ----------
     Lives next to the shared stats so the existing helpers stay untouched. */
  const EXTRA_KEY = 'dcg_color-trick_extras';
  function loadExtras() {
    try {
      const raw = localStorage.getItem(EXTRA_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { bestScore: 0, bestTime: null, totalScore: 0, gamesPlayed: 0 };
  }
  function saveExtras(e) { localStorage.setItem(EXTRA_KEY, JSON.stringify(e)); }

  /* ---------- State ---------- */
  let state = { current: 0, answers: [], totalMs: 0 };
  let timerId = null;
  let answeredThisRound = false;
  let roundStart = 0;
  let done = false;

  // Replays allowed — refresh to start a fresh attempt at today's rounds.
  // Stats / streak are only updated on the first play of the day.
  // (Mid-game progress below still resumes a session that was interrupted
  //  before finishing — that's helpful, not a lock-out.)

  /* ---------- Resume mid-game if there's saved progress ---------- */
  const resumed = loadProgress();
  if (resumed && resumed.current > 0 && resumed.current < ROUNDS_TOTAL) {
    state = resumed;
    wordEl.textContent = 'RESUME';
    roundEl.textContent = state.current + 1;
    // Reflect resumed progress on the bar so the user sees where they are.
    bar.style.width = `${(state.current / ROUNDS_TOTAL) * 100}%`;
  }

  // The word inside the circle IS the Start/Resume trigger.
  function onStartClick() {
    wordEl.removeEventListener('click', onStartClick);
    wordEl.removeEventListener('keydown', onStartKey);
    nextRound();
  }
  function onStartKey(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onStartClick();
    }
  }
  wordEl.addEventListener('click', onStartClick);
  wordEl.addEventListener('keydown', onStartKey);

  /* ---------- Round loop ---------- */
  function nextRound() {
    if (state.current >= ROUNDS_TOTAL) return finish();
    answeredThisRound = false;
    const r = rounds[state.current];

    // Update progress label + bar
    roundEl.textContent = state.current + 1;
    bar.style.width = `${(state.current / ROUNDS_TOTAL) * 100}%`;

    // Paint the word and drop the start-button look the first time round.
    wordEl.classList.remove('strooply-start');
    wordEl.removeAttribute('role');
    wordEl.removeAttribute('tabindex');
    wordEl.textContent = r.word.name;
    wordEl.style.color = r.ink.hex;
    stage.classList.remove('correct', 'wrong');

    // Reset ring to "full", then animate to "empty" over the round's duration.
    ring.style.transition = 'none';
    ring.style.strokeDashoffset = 0;
    void ring.getBoundingClientRect();          // force reflow
    ring.style.transition = `stroke-dashoffset ${r.duration}ms linear`;
    ring.style.strokeDashoffset = RING_CIRC;

    // Enable buttons
    optButtons.forEach(b => b.disabled = false);

    roundStart = performance.now();
    timerId = setTimeout(() => onAnswer(null), r.duration);
  }

  function onAnswer(pickedName) {
    if (answeredThisRound) return;
    answeredThisRound = true;
    clearTimeout(timerId);

    const r = rounds[state.current];
    const correct = pickedName === r.ink.name;
    // If they timed out, count the full duration; otherwise use real time.
    const elapsed = pickedName === null
      ? r.duration
      : Math.min(r.duration, performance.now() - roundStart);

    state.answers.push({ correct });
    state.totalMs += elapsed;
    state.current += 1;
    saveProgress(state);

    // Flash feedback + soft tone
    stage.classList.add(correct ? 'correct' : 'wrong');
    playTone(correct ? 660 : 280, 0.06);

    // Lock buttons + freeze ring at its current position
    optButtons.forEach(b => b.disabled = true);
    const cs = getComputedStyle(ring).strokeDashoffset;
    ring.style.transition = 'none';
    ring.style.strokeDashoffset = cs;

    setTimeout(() => {
      stage.classList.remove('correct', 'wrong');
      nextRound();
    }, 380);
  }

  // Wire up the colour buttons
  optButtons.forEach(b => {
    b.addEventListener('click', () => onAnswer(b.dataset.name));
  });

  /* ---------- Finish ---------- */
  function finish() {
    done = true;
    const correctCount = state.answers.filter(a => a.correct).length;
    const totalSec     = Math.round(state.totalMs / 1000);
    const grid         = state.answers.map(a => a.correct ? '🟩' : '🟥').join('');

    // Update extras (best score / best time / running average)
    const extras = loadExtras();
    const isNewBest =
      correctCount > extras.bestScore ||
      (correctCount === extras.bestScore && (extras.bestTime === null || totalSec < extras.bestTime));
    if (correctCount > extras.bestScore) {
      extras.bestScore = correctCount;
      extras.bestTime  = totalSec;
    } else if (correctCount === extras.bestScore && (extras.bestTime === null || totalSec < extras.bestTime)) {
      extras.bestTime = totalSec;
    }
    extras.totalScore  += correctCount;
    extras.gamesPlayed += 1;
    saveExtras(extras);

    // Mark today as played. "Win" = at least half correct, for streak purposes.
    const won = correctCount >= 5;
    saveTodayResult(GAME, { score: correctCount, totalSec, grid });
    markPlayedToday(GAME, won);
    clearProgress();

    if (won) {
      partyBurst();
      showWinModal({
        emoji: '🎨',
        title: `${correctCount}/${ROUNDS_TOTAL} in ${totalSec}s`,
        subtitle: isNewBest ? '★ New personal best' : 'Trusted your eyes'
      });
    }

    // Finalise visuals: full bar, ring depleted.
    bar.style.width = '100%';
    roundEl.textContent = ROUNDS_TOTAL;
    ring.style.transition = 'none';
    ring.style.strokeDashoffset = RING_CIRC;

    hideStageForResult();
    showResult({ score: correctCount, totalSec, grid }, false, isNewBest);
  }

  function hideStageForResult() {
    document.querySelector('.strooply-question').style.display = 'none';
    document.querySelector('.strooply-progress').style.display = 'none';
    stage.style.display = 'none';
    document.getElementById('options').style.display = 'none';
  }

  /* ---------- Result panel ---------- */
  function showResult(r, replay, isNewBest) {
    document.getElementById('resultPanel').style.display = 'block';
    document.getElementById('resultTitle').textContent =
      replay ? `You played Color Trick #${puzzleNum}`
             : `You scored ${r.score}/${ROUNDS_TOTAL} in ${r.totalSec}s 🎉`;

    document.getElementById('bestBadge').style.display = (!replay && isNewBest) ? 'inline-block' : 'none';
    document.getElementById('resultGrid').textContent = r.grid;
    document.getElementById('resultText').textContent =
      `🟩 correct  ·  🟥 missed`;

    renderStatsMini(document.getElementById('statsMini'));
    startCountdown('cd');

    document.getElementById('shareBtn').addEventListener('click', () => {
      const text = `🎨 Color Trick #${puzzleNum}\nScore: ${r.score}/${ROUNDS_TOTAL} in ${r.totalSec}s\n${r.grid}\ndailycalmgames`;
      shareResult(text);
    });
  }

  /* Stats row: played / best score / best time / avg score. */
  function renderStatsMini(el) {
    const s = loadStats(GAME);
    const x = loadExtras();
    const avg = x.gamesPlayed ? (x.totalScore / x.gamesPlayed).toFixed(1) : '0.0';
    const best = x.bestScore ? `${x.bestScore}/10` : '—';
    const bestT = (x.bestTime != null) ? `${x.bestTime}s` : '—';
    el.innerHTML = `
      <div class="stat"><span class="num">${s.played}</span><span class="lbl">Played</span></div>
      <div class="stat"><span class="num">${best}</span><span class="lbl">Best</span></div>
      <div class="stat"><span class="num">${bestT}</span><span class="lbl">Best time</span></div>
      <div class="stat"><span class="num">${avg}</span><span class="lbl">Avg</span></div>
      <div class="stat"><span class="num">${s.currentStreak}</span><span class="lbl">Streak</span></div>
    `;
  }
})();
