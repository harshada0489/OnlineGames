/* =========================================================
   Pattern Find — 5 rounds of "what comes next?".
   Patterns get harder each round. All from the daily seed.
   ========================================================= */

(function () {
  const GAME = 'pattern-find';
  const ROUNDS = 5;
  const puzzleNum = getPuzzleNumber();
  document.getElementById('puzzleNum').textContent = 'Game #' + puzzleNum;

  // Pool of universally-recognised symbols (no language).
  const SYMBOLS = ['🔴', '🔵', '🟢', '🟡', '🟣', '⚫', '⚪', '🟠'];

  // --- Build five rounds for the day ---
  const rnd = seededRandom(seedFor(GAME));
  const rounds = [];
  for (let i = 0; i < ROUNDS; i++) rounds.push(buildRound(i, rnd));

  // --- State ---
  let current = 0;
  let results = '';        // emoji grid (🟩 / ⬜) of correctness per round
  let wins    = 0;
  let done    = false;

  const seqEl   = document.getElementById('sequence');
  const optsEl  = document.getElementById('options');
  const roundEl = document.getElementById('roundNum');

  // Replays allowed — refresh to start a fresh attempt at today's rounds.
  // Stats / streak are only updated on the first play of the day.
  renderRound();

  function renderRound() {
    const r = rounds[current];
    roundEl.textContent = current + 1;

    // Sequence with the last slot as "?"
    seqEl.innerHTML = '';
    r.sequence.forEach(sym => {
      const slot = document.createElement('div');
      slot.className = 'pattern-slot';
      slot.textContent = sym;
      seqEl.appendChild(slot);
    });
    const q = document.createElement('div');
    q.className = 'pattern-slot q';
    q.textContent = '?';
    seqEl.appendChild(q);

    // Four option buttons
    optsEl.innerHTML = '';
    r.options.forEach(sym => {
      const b = document.createElement('button');
      b.className = 'opt';
      b.textContent = sym;
      b.addEventListener('click', () => onPick(sym));
      optsEl.appendChild(b);
    });
  }

  function onPick(sym) {
    if (done) return;
    const r = rounds[current];
    const won = (sym === r.answer);
    results += won ? '🟩' : '⬜';
    if (won) wins += 1;
    playTone(won ? 660 : 280, 0.08);

    current += 1;
    if (current >= ROUNDS) finish();
    else renderRound();
  }

  function finish() {
    done = true;
    // Win condition: at least 3 of 5 correct.
    const ok = wins >= 3;
    saveTodayResult(GAME, { grid: results, wins });
    markPlayedToday(GAME, ok);
    if (ok) {
      partyBurst();
      showWinModal({
        emoji: '🧠',
        title: `${wins} / ${ROUNDS} correct!`,
        subtitle: wins === ROUNDS ? 'Perfect run' : 'Pattern spotted'
      });
    }
    showResult(false);
  }

  function showResult(replay) {
    document.getElementById('resultPanel').style.display = 'block';
    document.getElementById('resultTitle').textContent =
      replay ? `You played Pattern Find #${puzzleNum}` :
      `You got ${wins} / ${ROUNDS} ${wins >= 3 ? '🎉' : ''}`;
    document.getElementById('resultGrid').textContent = results;

    renderStatsMini(GAME, document.getElementById('statsMini'));
    startCountdown('cd');

    document.getElementById('shareBtn').addEventListener('click', () => {
      const text = `🧠 Pattern Find #${puzzleNum} — ${wins}/${ROUNDS}\n${results}\ndailycalmgames`;
      shareResult(text);
    });
  }

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

  /* ---------- Round builder ----------
     Difficulty grows with the round index:
       0,1: 2-symbol repeat        AB AB AB ?
       2:   3-symbol repeat        ABC ABC ?
       3:   ABBA / ABAB style
       4:   4-symbol rotation      ABCD ABCD ?                                */
  function buildRound(idx, rand) {
    const pick = () => SYMBOLS[Math.floor(rand() * SYMBOLS.length)];
    const distinctPick = (existing) => {
      let s;
      do { s = pick(); } while (existing.includes(s));
      return s;
    };

    let pattern, answer;
    if (idx <= 1) {
      // ABABA → next = B
      const a = pick();
      const b = distinctPick([a]);
      pattern = [a, b, a, b, a];
      answer  = b;
    } else if (idx === 2) {
      // ABCAB → next = C
      const a = pick();
      const b = distinctPick([a]);
      const c = distinctPick([a, b]);
      pattern = [a, b, c, a, b];
      answer  = c;
    } else if (idx === 3) {
      // AABBA → next = A (mirror pattern AABB | AA)
      const a = pick();
      const b = distinctPick([a]);
      pattern = [a, a, b, b, a];
      answer  = a;
    } else {
      // ABCDA → next = B (period 4 repeat)
      const a = pick();
      const b = distinctPick([a]);
      const c = distinctPick([a, b]);
      const d = distinctPick([a, b, c]);
      pattern = [a, b, c, d, a];
      answer  = b;
    }

    // Build 4 options: the correct one + 3 distractors, shuffled.
    const opts = new Set([answer]);
    while (opts.size < 4) opts.add(SYMBOLS[Math.floor(rand() * SYMBOLS.length)]);
    const shuffled = Array.from(opts).sort(() => rand() - 0.5);

    return { sequence: pattern, answer, options: shuffled };
  }
})();
