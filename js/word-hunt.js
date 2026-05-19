/* =========================================================
   Word Hunt — six tries to guess today's five-letter word.
   Same word for everyone worldwide per calendar day.
   Standard Word Hunt grading: green (right letter, right slot),
   yellow (right letter, wrong slot), gray (not in word).
   Replays allowed; stats / streak only count first play of the day.
   ========================================================= */

(function () {
  const GAME = 'word-hunt';
  const WORD_LENGTH  = 5;
  const MAX_GUESSES  = 6;

  /* Curated list of common 5-letter words.
     Used as the daily-answer pool. The game accepts ANY 5-letter
     combination as a guess (no dictionary check) — that keeps things
     friendly and lightweight, while the answer is always a real word. */
  const WORDS = ('ABOUT ABOVE ACTOR ACUTE ADMIT ADOPT ADULT AFTER AGAIN AGENT ' +
    'AGREE AHEAD ALARM ALBUM ALERT ALIVE ALLOW ALONE ALONG ALTER ANGEL ANGER ' +
    'ANGLE ANGRY APPLE APPLY ARGUE ARISE ASSET AUDIO AUDIT AVOID AWAKE AWARD ' +
    'AWARE BADGE BAKER BASIC BEACH BEGAN BEGIN BEGUN BEING BELOW BENCH BIRTH ' +
    'BLACK BLAME BLAND BLANK BLAST BLEND BLESS BLIND BLOCK BLOOD BLOOM BOARD ' +
    'BOOST BOOTH BOUND BRAIN BRAND BRAVE BREAD BREAK BREED BRICK BRIDE BRIEF ' +
    'BRING BROAD BROKE BROWN BRUSH BUILD BUILT BUYER CABLE CANDY CARGO CARRY ' +
    'CATCH CAUSE CHAIN CHAIR CHARM CHART CHASE CHEAP CHECK CHESS CHEST CHIEF ' +
    'CHILD CHILL CIVIC CIVIL CLAIM CLASH CLASS CLEAN CLEAR CLERK CLICK CLIFF ' +
    'CLIMB CLOCK CLOSE CLOTH CLOUD CLOWN COACH COAST COULD COUNT COURT COVER ' +
    'CRACK CRAFT CRANE CRASH CRAZY CREAM CRIME CROSS CROWD CROWN CRUSH CURVE ' +
    'CYCLE DAILY DAIRY DANCE DEALT DEATH DEBUT DECAY DELAY DEPTH DOING DOUBT ' +
    'DOZEN DRAFT DRAMA DRANK DREAM DRESS DRIED DRINK DRIVE DROVE DRUNK EAGER ' +
    'EARLY EARTH EIGHT ELITE EMPTY ENEMY ENJOY ENTER ENTRY EQUAL ERROR EVENT ' +
    'EVERY EXACT EXIST EXTRA FAIRY FAITH FALSE FAULT FERRY FIBER FIELD FIFTH ' +
    'FIFTY FIGHT FINAL FIRST FIXED FLAME FLASH FLEET FLESH FLOOD FLOOR FLOUR ' +
    'FLUID FOCUS FORCE FORGE FORTH FORTY FORUM FOUND FRAME FRANK FRAUD FRESH ' +
    'FRONT FRUIT FULLY FUNNY GHOST GIANT GIVEN GLASS GLOBE GLORY GOING GRACE ' +
    'GRADE GRAIN GRAND GRANT GRAPH GRASS GRAVE GREAT GREEN GREET GRIEF GRILL ' +
    'GROSS GROUP GROVE GROWN GUARD GUESS GUEST GUIDE GUILT HABIT HAPPY HARSH ' +
    'HEART HEAVY HENCE HORSE HOTEL HOUSE HUMAN HUMOR HURRY IDEAL IMAGE IMPLY ' +
    'INDEX INNER INPUT IRONY ISSUE JOINT JOKER JUDGE JUICE KNIFE KNOCK KNOWN ' +
    'LABEL LARGE LASER LATER LAUGH LAYER LEARN LEASE LEAST LEAVE LEGAL LEMON ' +
    'LEVEL LIGHT LIMIT LIVER LOCAL LODGE LOGIC LOOSE LOVER LOWER LOYAL LUCKY ' +
    'LUNCH LYING MAGIC MAJOR MAKER MAPLE MARCH MATCH MAYBE MAYOR MEANT MEDIA ' +
    'MELON MERCY METAL METRO MIGHT MIXED MODEL MONEY MONTH MORAL MOTOR MOUNT ' +
    'MOUSE MOUTH MOVIE MUSIC NAIVE NEVER NEWLY NIGHT NOISE NORTH NOTED NOVEL ' +
    'NURSE OCCUR OCEAN OFFER OFTEN ONION ORDER OTHER OUGHT OUNCE OUTER PAINT ' +
    'PANEL PAPER PARTY PASTA PATCH PEACE PEACH PHASE PHONE PHOTO PIANO PIECE ' +
    'PILOT PITCH PIZZA PLACE PLAIN PLANE PLANT PLATE POINT POUND POWER PRESS ' +
    'PRICE PRIDE PRIME PRINT PRIOR PRIZE PROOF PROUD PROVE PULSE PUNCH QUART ' +
    'QUEEN QUERY QUEST QUICK QUIET QUITE QUOTE RADAR RADIO RAINY RAISE RANCH ' +
    'RANGE RAPID RATIO REACH READY REALM REBEL REFER RELAX RELAY RESET RIDGE ' +
    'RIFLE RIGHT RINSE RIVAL RIVER ROAST ROBIN ROBOT ROUGH ROUND ROUTE ROYAL ' +
    'RUSTY SAINT SALAD SAUCE SCALE SCARE SCARY SCENE SCOPE SCORE SENSE SEVEN ' +
    'SHADE SHAKE SHALL SHAME SHAPE SHARE SHARK SHARP SHEEP SHEET SHELF SHELL ' +
    'SHIFT SHINE SHINY SHIRT SHOCK SHOOT SHORE SHORT SHOWN SHRUB SIGHT SINCE ' +
    'SIXTH SIXTY SIZED SKATE SKILL SKIRT SKULL SLATE SLEEP SLICE SLIDE SLOPE ' +
    'SMALL SMART SMELL SMILE SMOKE SMOKY SNACK SNAKE SOLID SOLVE SORRY SOUND ' +
    'SOUTH SPACE SPARE SPEAK SPEED SPELL SPEND SPENT SPICE SPIKE SPILL SPINE ' +
    'SPLIT SPOIL SPOKE SPORT SPRAY STAFF STAGE STAIR STAKE STALK STAMP STAND ' +
    'START STATE STEAK STEAL STEAM STEEL STEEP STEER STICK STIFF STILL STING ' +
    'STINK STOCK STONE STOOL STORE STORM STORY STOVE STRAW STRIP STUCK STUDY ' +
    'STUFF STYLE SUGAR SUITE SUPER SWEAT SWEEP SWEET SWELL SWIFT SWING SWIRL ' +
    'SWORD TABLE TASTE TEACH TEETH TENSE THANK THEIR THEME THERE THESE THICK ' +
    'THIEF THING THINK THIRD THORN THOSE THREE THREW THROW THUMB TIGER TIGHT ' +
    'TIRED TITLE TODAY TOOTH TOPIC TOTAL TOUCH TOUGH TOWEL TOWER TOXIC TRACE ' +
    'TRACK TRADE TRAIN TRAIT TRASH TREAT TREND TRIAL TRIBE TRICK TRIED TROOP ' +
    'TRUCK TRULY TRUNK TRUST TRUTH TWICE TWIST UNCLE UNDER UNFIT UNION UNITE ' +
    'UNITY UNTIL UPPER UPSET URBAN USAGE USUAL VALID VALUE VAULT VIDEO VIRUS ' +
    'VISIT VITAL VIVID VOCAL VOICE WAGON WASTE WATCH WATER WEARY WHALE WHEAT ' +
    'WHEEL WHERE WHICH WHILE WHITE WHOLE WHOSE WIDTH WORLD WORRY WORSE WORST ' +
    'WORTH WOULD WRECK WRIST WRITE WRONG YIELD YOUNG YOUTH').split(/\s+/);

  const puzzleNum = getPuzzleNumber();
  document.getElementById('puzzleNum').textContent = 'Game #' + puzzleNum;

  // Pick today's word — same for everyone worldwide on the same calendar day.
  const rnd    = seededRandom(seedFor(GAME));
  const target = WORDS[Math.floor(rnd() * WORDS.length)];

  /* ---------- State ---------- */
  const guesses = [];        // submitted guesses (uppercase strings)
  let currentGuess = '';     // letters being typed for the current row
  let done = false;

  /* ---------- Build the 6 × 5 board ---------- */
  const boardEl = document.getElementById('board');
  for (let r = 0; r < MAX_GUESSES; r++) {
    const row = document.createElement('div');
    row.className = 'wordle-row';
    row.dataset.row = r;
    for (let c = 0; c < WORD_LENGTH; c++) {
      const tile = document.createElement('div');
      tile.className = 'wordle-tile';
      tile.dataset.row = r;
      tile.dataset.col = c;
      row.appendChild(tile);
    }
    boardEl.appendChild(row);
  }

  /* ---------- Build the on-screen keyboard ---------- */
  const KB_LAYOUT = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['ENTER','Z','X','C','V','B','N','M','BACK']
  ];
  const kbEl = document.getElementById('keyboard');
  KB_LAYOUT.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'wordle-kb-row';
    row.forEach(key => {
      const btn = document.createElement('button');
      btn.className = 'wordle-key';
      btn.dataset.key = key;
      if (key === 'ENTER' || key === 'BACK') btn.classList.add('wide');
      btn.textContent = key === 'BACK' ? '⌫' : key;
      btn.addEventListener('click', () => onKey(key));
      rowEl.appendChild(btn);
    });
    kbEl.appendChild(rowEl);
  });

  /* ---------- Input handling ---------- */
  document.addEventListener('keydown', (e) => {
    if (done) return;
    // Don't trap typing into form fields elsewhere — there are none on this page,
    // but be defensive in case the result panel later includes any.
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'Enter')      { onKey('ENTER'); e.preventDefault(); }
    else if (e.key === 'Backspace') { onKey('BACK');  e.preventDefault(); }
    else if (/^[a-zA-Z]$/.test(e.key)) { onKey(e.key.toUpperCase()); e.preventDefault(); }
  });

  function onKey(key) {
    if (done) return;
    if (key === 'ENTER') return submitGuess();
    if (key === 'BACK')  return deleteLetter();
    if (/^[A-Z]$/.test(key)) return addLetter(key);
  }

  function addLetter(L) {
    if (currentGuess.length >= WORD_LENGTH) return;
    currentGuess += L;
    paintCurrentRow();
    playTone(360 + currentGuess.length * 18, 0.03);
  }

  function deleteLetter() {
    if (currentGuess.length === 0) return;
    currentGuess = currentGuess.slice(0, -1);
    paintCurrentRow();
  }

  function paintCurrentRow() {
    const r = guesses.length;
    for (let c = 0; c < WORD_LENGTH; c++) {
      const tile = tileAt(r, c);
      const ch = currentGuess[c] || '';
      tile.textContent = ch;
      tile.classList.toggle('filled', !!ch);
    }
  }

  function submitGuess() {
    if (currentGuess.length !== WORD_LENGTH) {
      shakeRow(guesses.length);
      showToast('5 letters needed');
      return;
    }
    const guess = currentGuess;
    const grades = gradeGuess(guess, target);
    guesses.push(guess);
    currentGuess = '';
    revealRow(guesses.length - 1, grades, guess);
  }

  /* ---------- Word Hunt grading (handles duplicate letters correctly) ----------
     Pass 1: mark exact-position matches green, "consume" those target slots.
     Pass 2: for remaining guess letters, if a target slot still has that
             letter, mark yellow and consume that slot. Else gray.            */
  function gradeGuess(guess, ans) {
    const result = Array(WORD_LENGTH).fill('absent');
    const remaining = ans.split('');
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (guess[i] === ans[i]) {
        result[i] = 'correct';
        remaining[i] = null;
      }
    }
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (result[i] === 'correct') continue;
      const idx = remaining.indexOf(guess[i]);
      if (idx !== -1) {
        result[i] = 'present';
        remaining[idx] = null;
      }
    }
    return result;
  }

  /* ---------- Reveal animation + keyboard update ---------- */
  async function revealRow(rowIdx, grades, guess) {
    const tiles = boardEl.querySelectorAll(`.wordle-tile[data-row="${rowIdx}"]`);
    for (let i = 0; i < tiles.length; i++) {
      tiles[i].classList.add('flip');
      await wait(80);
      tiles[i].classList.add(grades[i]);
      playTone(420 + i * 30, 0.05);
      await wait(150);
    }

    // Update the keyboard so each letter reflects the BEST grade it's earned.
    const PRIORITY = { absent: 0, present: 1, correct: 2 };
    for (let i = 0; i < WORD_LENGTH; i++) {
      const keyBtn = kbEl.querySelector(`.wordle-key[data-key="${guess[i]}"]`);
      if (!keyBtn) continue;
      const existing = ['correct','present','absent'].find(c => keyBtn.classList.contains(c));
      if (!existing || PRIORITY[grades[i]] > PRIORITY[existing]) {
        if (existing) keyBtn.classList.remove(existing);
        keyBtn.classList.add(grades[i]);
      }
    }

    if (guess === target)            return finish(true);
    if (guesses.length >= MAX_GUESSES) return finish(false);
  }

  function shakeRow(rowIdx) {
    const row = boardEl.querySelector(`.wordle-row[data-row="${rowIdx}"]`);
    if (!row) return;
    row.classList.remove('shake');
    void row.offsetWidth;       // restart animation
    row.classList.add('shake');
  }

  function tileAt(r, c) {
    return boardEl.querySelector(`.wordle-tile[data-row="${r}"][data-col="${c}"]`);
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  /* ---------- Finish ---------- */
  function finish(won) {
    done = true;
    const emojiGrid = guesses.map(g => {
      return gradeGuess(g, target)
        .map(c => c === 'correct' ? '🟩' : c === 'present' ? '🟨' : '⬜')
        .join('');
    }).join('\n');

    saveTodayResult(GAME, { won, tries: guesses.length, grid: emojiGrid, target });
    markPlayedToday(GAME, won);

    if (won) {
      playTone(660, 0.18);
      partyBurst();
      showWinModal({
        emoji: '📝',
        title: `Solved in ${guesses.length} / ${MAX_GUESSES}!`,
        subtitle: target
      });
    } else {
      playTone(280, 0.18);
    }

    setTimeout(() => showResult(won, emojiGrid), won ? 700 : 400);
  }

  function showResult(won, grid) {
    document.getElementById('resultPanel').style.display = 'block';
    document.getElementById('resultTitle').textContent = won
      ? `Got it in ${guesses.length} / ${MAX_GUESSES} 🎉`
      : `Today's word`;
    document.getElementById('resultWord').textContent = target;
    document.getElementById('resultGrid').textContent = grid;

    renderStatsMini(document.getElementById('statsMini'));
    startCountdown('cd');

    document.getElementById('shareBtn').addEventListener('click', () => {
      const tryLabel = won ? `${guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
      const text = `📝 Word Hunt #${puzzleNum} — ${tryLabel}\n${grid}\ndailycalmgames`;
      shareResult(text);
    });
  }

  function renderStatsMini(el) {
    const s = loadStats(GAME);
    const winPct = s.played ? Math.round((s.wins / s.played) * 100) : 0;
    el.innerHTML = `
      <div class="stat"><span class="num">${s.played}</span><span class="lbl">Played</span></div>
      <div class="stat"><span class="num">${winPct}%</span><span class="lbl">Win %</span></div>
      <div class="stat"><span class="num">${s.currentStreak}</span><span class="lbl">Streak</span></div>
      <div class="stat"><span class="num">${s.bestStreak}</span><span class="lbl">Best</span></div>
    `;
  }
})();
