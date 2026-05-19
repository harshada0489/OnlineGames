/* =========================================================
   Daily Maze — daily 10x10 maze.
   Same maze worldwide each day. Solved by reaching the exit.
   ========================================================= */

(function () {
  const GAME  = 'daily-maze';
  const SIZE  = 10;                   // 10x10 grid
  const puzzleNum = getPuzzleNumber();
  document.getElementById('puzzleNum').textContent = 'Game #' + puzzleNum;

  // --- Generate the maze with a seeded recursive backtracker ---
  // Each cell stores its 4 walls. The seed is derived from the date.
  const rnd  = seededRandom(seedFor(GAME));
  const maze = buildMaze(SIZE, rnd);

  // --- Player state ---
  let px = 0, py = 0;                 // start: top-left
  const ex = SIZE - 1, ey = SIZE - 1; // exit:  bottom-right
  let moves = 0;
  let done  = false;

  // --- Canvas setup ---
  const canvas = document.getElementById('mazeCanvas');
  const ctx    = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);

  function resize() {
    // Make the canvas crisp on hi-dpi screens.
    const w = canvas.clientWidth || 380;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = w * dpr;
    canvas.height = w * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  // Replays allowed — every page load starts a fresh attempt at today's maze.
  // Stats / streak are only updated on the first play of the day.

  // --- Input: keyboard, on-screen pad, touch swipe ---
  window.addEventListener('keydown', e => {
    const k = e.key;
    if (k === 'ArrowUp'    || k === 'w') { move(0, -1); e.preventDefault(); }
    if (k === 'ArrowDown'  || k === 's') { move(0,  1); e.preventDefault(); }
    if (k === 'ArrowLeft'  || k === 'a') { move(-1, 0); e.preventDefault(); }
    if (k === 'ArrowRight' || k === 'd') { move(1,  0); e.preventDefault(); }
  });

  document.querySelectorAll('.maze-controls .btn').forEach(b => {
    b.addEventListener('click', () => {
      const d = b.getAttribute('dir') || b.dataset.dir;
      if (d === 'up')    move(0, -1);
      if (d === 'down')  move(0,  1);
      if (d === 'left')  move(-1, 0);
      if (d === 'right') move(1,  0);
    });
  });

  // Swipe gesture support on the canvas
  let touchStart = null;
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, { passive: true });
  canvas.addEventListener('touchend', e => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1, 0);
    else                              move(0, dy > 0 ? 1 : -1);
    touchStart = null;
  });

  // --- Movement ---
  function move(dx, dy) {
    if (done) return;
    const cell = maze[py][px];
    if (dx ===  1 && cell.walls.r) return;
    if (dx === -1 && cell.walls.l) return;
    if (dy ===  1 && cell.walls.b) return;
    if (dy === -1 && cell.walls.t) return;
    px += dx; py += dy;
    moves += 1;
    document.getElementById('moveCount').textContent = moves;
    playTone(420, 0.05);
    draw();
    if (px === ex && py === ey) finish();
  }

  function finish() {
    done = true;
    saveTodayResult(GAME, { moves });
    markPlayedToday(GAME, true);
    playTone(660, 0.18);
    partyBurst();
    showWinModal({
      emoji: '🧩',
      title: 'You escaped!',
      subtitle: `${moves} moves`
    });
    showResult(false);
  }

  // --- Render the maze ---
  function draw() {
    const W = canvas.clientWidth || 380;
    const cell = W / SIZE;
    ctx.clearRect(0, 0, W, W);

    // Background
    ctx.fillStyle = getCSS('--surface');
    ctx.fillRect(0, 0, W, W);

    // Exit tile
    ctx.fillStyle = getCSS('--accent');
    ctx.globalAlpha = 0.18;
    ctx.fillRect(ex * cell, ey * cell, cell, cell);
    ctx.globalAlpha = 1;

    // Walls
    ctx.strokeStyle = getCSS('--text');
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const c = maze[y][x];
        const X = x * cell, Y = y * cell;
        if (c.walls.t) { ctx.moveTo(X, Y);             ctx.lineTo(X + cell, Y); }
        if (c.walls.l) { ctx.moveTo(X, Y);             ctx.lineTo(X, Y + cell); }
        if (c.walls.r) { ctx.moveTo(X + cell, Y);      ctx.lineTo(X + cell, Y + cell); }
        if (c.walls.b) { ctx.moveTo(X, Y + cell);      ctx.lineTo(X + cell, Y + cell); }
      }
    }
    ctx.stroke();

    // Player token (calm green circle)
    ctx.fillStyle = getCSS('--accent');
    const cx = px * cell + cell / 2;
    const cy = py * cell + cell / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  function getCSS(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#000';
  }

  // --- Result panel ---
  function showResult(replay) {
    const panel = document.getElementById('resultPanel');
    panel.style.display = 'block';
    document.getElementById('resultTitle').textContent =
      replay ? `You played Daily Maze #${puzzleNum}` : `You escaped Daily Maze #${puzzleNum} 🎉`;
    document.getElementById('resultText').textContent =
      `Solved in ${moves} moves. Minimum path is ${SIZE * 2 - 2} steps in a straight world (real path is longer).`;

    renderStatsMini(GAME, document.getElementById('statsMini'));
    startCountdown('cd');

    document.getElementById('shareBtn').addEventListener('click', () => {
      const text = `🧩 Daily Maze #${puzzleNum} — Solved in ${moves} moves\ndailycalmgames`;
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

  /* ----- Maze generation (seeded recursive backtracker) ----- */
  function buildMaze(n, rand) {
    const grid = [];
    for (let y = 0; y < n; y++) {
      const row = [];
      for (let x = 0; x < n; x++) {
        row.push({ visited: false, walls: { t: true, b: true, l: true, r: true } });
      }
      grid.push(row);
    }

    const stack = [];
    let cx = 0, cy = 0;
    grid[cy][cx].visited = true;

    while (true) {
      const neighbours = [];
      if (cy > 0     && !grid[cy - 1][cx].visited) neighbours.push(['t',  0, -1]);
      if (cy < n - 1 && !grid[cy + 1][cx].visited) neighbours.push(['b',  0,  1]);
      if (cx > 0     && !grid[cy][cx - 1].visited) neighbours.push(['l', -1,  0]);
      if (cx < n - 1 && !grid[cy][cx + 1].visited) neighbours.push(['r',  1,  0]);

      if (neighbours.length === 0) {
        if (stack.length === 0) break;
        const prev = stack.pop();
        cx = prev[0]; cy = prev[1];
        continue;
      }

      stack.push([cx, cy]);
      const pick = neighbours[Math.floor(rand() * neighbours.length)];
      const [dir, dx, dy] = pick;
      // Tear down the wall between current and next.
      grid[cy][cx].walls[dir] = false;
      const opp = { t: 'b', b: 't', l: 'r', r: 'l' }[dir];
      grid[cy + dy][cx + dx].walls[opp] = false;
      cx += dx; cy += dy;
      grid[cy][cx].visited = true;
    }
    return grid;
  }
})();
