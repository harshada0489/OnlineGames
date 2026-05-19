/* =========================================================
   Sum Path — make a connected path of digits that sums to the target.
   5x5 grid, single-digit cells, 3 tries per day.
   ========================================================= */

(function () {
  const GAME = 'sum-path';
  const SIZE = 5;
  const MAX_TRIES = 3;
  const puzzleNum = getPuzzleNumber();
  document.getElementById('puzzleNum').textContent = 'Game #' + puzzleNum;

  // --- Generate today's grid + target ---
  const rnd  = seededRandom(seedFor(GAME));
  const grid = [];
  for (let y = 0; y < SIZE; y++) {
    const row = [];
    for (let x = 0; x < SIZE; x++) row.push(1 + Math.floor(rnd() * 9));
    grid.push(row);
  }
  // Build a guaranteed-solvable target: take a random adjacent-walk and sum it.
  const target = buildSolvableTarget(grid, rnd);
  document.getElementById('targetNum').textContent = target;

  // --- DOM ---
  const gridEl     = document.getElementById('grid');
  const sumEl      = document.getElementById('curSum');
  const triesEl    = document.getElementById('triesLeft');
  const submitBtn  = document.getElementById('submitBtn');
  const resetBtn   = document.getElementById('resetBtn');

  // Path state — array of [x, y] coordinates, in order tapped.
  let path = [];
  let triesUsed = 0;
  let tryGrid   = '';        // emoji row for each attempt
  let done      = false;

  // Build the 5x5 cells in the DOM
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const c = document.createElement('div');
      c.className = 'numble-cell';
      c.dataset.x = x;
      c.dataset.y = y;
      c.textContent = grid[y][x];
      c.addEventListener('click', () => onTap(x, y, c));
      gridEl.appendChild(c);
    }
  }

  // Replays allowed — refresh to start a fresh attempt at today's puzzle.
  // Stats / streak are only updated on the first play of the day.
  submitBtn.addEventListener('click', onSubmit);
  resetBtn.addEventListener('click', clearPath);

  function onTap(x, y, el) {
    if (done) return;
    const idx = path.findIndex(p => p[0] === x && p[1] === y);

    if (idx === path.length - 1 && idx !== -1) {
      // Tapping the last cell again removes it (undo).
      path.pop();
    } else if (idx !== -1) {
      // Tapping an earlier cell trims the path back to that cell.
      path = path.slice(0, idx + 1);
    } else {
      // Otherwise it must be adjacent (4-way) to the current last cell.
      if (path.length > 0) {
        const [lx, ly] = path[path.length - 1];
        const adj = (Math.abs(lx - x) + Math.abs(ly - y)) === 1;
        if (!adj) {
          // Brief red flash so the user sees the tap was rejected.
          el.classList.add('invalid');
          playTone(220, 0.05);
          setTimeout(() => el.classList.remove('invalid'), 320);
          return;
        }
      }
      path.push([x, y]);
      playTone(420 + path.length * 20, 0.05);
    }
    redrawSelection();
  }

  function clearPath() {
    if (done) return;
    path = [];
    redrawSelection();
  }

  function redrawSelection() {
    const sel = new Set(path.map(([x, y]) => `${x},${y}`));
    gridEl.querySelectorAll('.numble-cell').forEach(c => {
      const key = `${c.dataset.x},${c.dataset.y}`;
      c.classList.toggle('selected', sel.has(key));
    });
    const s = path.reduce((acc, [x, y]) => acc + grid[y][x], 0);
    sumEl.textContent = s;
    sumEl.classList.toggle('over', s > target);

    // Auto-win the moment the running sum equals the target.
    // No need to wait for the Submit button — celebrate immediately.
    if (!done && path.length > 0 && s === target) autoWin();

    // Briefly highlight the cells the user can legally move to next.
    showAdjacentHint();
  }

  /* Light-green flash on the 4 neighbours of the last selected cell that
     aren't already on the path. Fades back to white after ~1 second.
     Calls cancel any previous hint so rapid taps don't pile up.            */
  let hintTimer = null;
  function showAdjacentHint() {
    // Clear any cells still showing the previous hint.
    gridEl.querySelectorAll('.numble-cell.hint').forEach(c => c.classList.remove('hint'));
    clearTimeout(hintTimer);
    if (done || path.length === 0) return;

    const [lx, ly] = path[path.length - 1];
    const inPath = new Set(path.map(([x, y]) => `${x},${y}`));
    const neighbours = [[lx + 1, ly], [lx - 1, ly], [lx, ly + 1], [lx, ly - 1]];

    neighbours.forEach(([nx, ny]) => {
      if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) return;
      if (inPath.has(`${nx},${ny}`)) return;
      const cell = gridEl.querySelector(`.numble-cell[data-x="${nx}"][data-y="${ny}"]`);
      if (cell) cell.classList.add('hint');
    });

    hintTimer = setTimeout(() => {
      gridEl.querySelectorAll('.numble-cell.hint').forEach(c => c.classList.remove('hint'));
    }, 1000);
  }

  function autoWin() {
    triesUsed += 1;
    tryGrid += '🟩 ';
    triesEl.textContent = Math.max(0, MAX_TRIES - triesUsed);
    partyBurst();
    showWinModal({
      emoji: '🔢',
      title: 'Got it!',
      subtitle: `Solved in ${triesUsed} ${triesUsed === 1 ? 'try' : 'tries'}`
    });
    finish(true);
  }

  // partyBurst() lives in shared.js so any game can fire confetti.

  function onSubmit() {
    if (done || path.length === 0) return;
    triesUsed += 1;
    const sum = path.reduce((acc, [x, y]) => acc + grid[y][x], 0);
    const won = (sum === target);
    tryGrid += won ? '🟩 ' : (sum > target ? '🟨 ' : '⬜ ');
    triesEl.textContent = Math.max(0, MAX_TRIES - triesUsed);

    if (won) {
      finish(true);
    } else if (triesUsed >= MAX_TRIES) {
      finish(false);
    } else {
      playTone(280, 0.08);
      path = [];
      redrawSelection();
    }
  }

  function finish(won) {
    done = true;
    submitBtn.disabled = true;
    resetBtn.disabled = true;
    saveTodayResult(GAME, { won, tries: triesUsed, grid: tryGrid.trim() });
    markPlayedToday(GAME, won);
    playTone(won ? 660 : 320, 0.18);
    showResult(won, triesUsed, tryGrid.trim(), false);
  }

  function showResult(won, tries, gridStr, replay) {
    document.getElementById('resultPanel').style.display = 'block';
    document.getElementById('resultTitle').textContent =
      replay ? `You played Sum Path #${puzzleNum}` :
      won    ? `Solved in ${tries} ${tries === 1 ? 'try' : 'tries'} 🎉`
             : `Out of tries — better luck tomorrow`;
    document.getElementById('resultGrid').textContent = gridStr;
    document.getElementById('resultText').textContent = won
      ? `Target was ${target}.`
      : `Target was ${target}.`;

    renderStatsMini(GAME, document.getElementById('statsMini'));
    startCountdown('cd');

    document.getElementById('shareBtn').addEventListener('click', () => {
      const text = `🔢 Sum Path #${puzzleNum} — ${won ? `Solved in ${tries} ${tries === 1 ? 'try' : 'tries'}` : 'X/' + MAX_TRIES}\n${gridStr}\ndailycalmgames`;
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

  /* Build a target that has at least one valid adjacent-path solution. */
  function buildSolvableTarget(g, rand) {
    const len = 3 + Math.floor(rand() * 4);   // path length 3..6
    let x = Math.floor(rand() * SIZE);
    let y = Math.floor(rand() * SIZE);
    const visited = new Set();
    visited.add(`${x},${y}`);
    let sum = g[y][x];
    for (let i = 1; i < len; i++) {
      const options = [];
      const tryAdd = (nx, ny) => {
        if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) return;
        if (visited.has(`${nx},${ny}`)) return;
        options.push([nx, ny]);
      };
      tryAdd(x + 1, y); tryAdd(x - 1, y); tryAdd(x, y + 1); tryAdd(x, y - 1);
      if (options.length === 0) break;
      const pick = options[Math.floor(rand() * options.length)];
      x = pick[0]; y = pick[1];
      visited.add(`${x},${y}`);
      sum += g[y][x];
    }
    return sum;
  }
})();
