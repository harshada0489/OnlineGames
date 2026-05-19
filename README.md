# Daily Games

Seven small daily puzzles. One new set per day. Same puzzles for everyone in the world on the same date, results shareable as emoji.

- 🎨 **Color Match** — match today's colour using RGB sliders
- 🧩 **Daily Maze** — escape a 10×10 maze
- 🔢 **Sum Path** — tap a path of digits that adds to the target
- 🧠 **Pattern Find** — pick what comes next in five visual sequences
- 🎵 **Echo Tap** — watch a colour sequence, then repeat it back
- 🎨 **Color Trick** — pick the colour the text is painted in, not the word it spells (Stroop effect)
- 📝 **Word Hunt** — six tries to guess today's five-letter word

## Design rules

- **Static site only.** Pure HTML, CSS, JavaScript. No backend, no database, no API calls.
- **No login, no signup, no accounts.**
- **No ads, popups, trackers, analytics, or third-party scripts.**
- **All progress in `localStorage`** — never on a server.
- **Same puzzle worldwide** per calendar day, generated from `(today − launch date)` and a seeded random.
- **One play per game per day.** No replay.
- **Mobile-first.** Big tap targets, no horizontal scroll, no zoom needed.
- **No language used in gameplay.** Visual / numeric only.

## Folder layout

```
/index.html         Homepage with seven game cards
/color-match.html   Color Match game
/daily-maze.html    Daily Maze game
/sum-path.html      Sum Path game
/pattern-find.html  Pattern Find game
/echo-tap.html      Echo Tap game
/color-trick.html   Color Trick game
/word-hunt.html     Word Hunt game
/about.html         About page
/privacy.html       Privacy Policy
/terms.html         Terms of Service
/css/style.css      Shared styles (light + dark)
/js/shared.js       Shared utilities: date, seeded RNG, storage, share
/js/color-match.js
/js/daily-maze.js
/js/sum-path.js
/js/pattern-find.js
/js/echo-tap.js
/js/color-trick.js
/js/word-hunt.js
/README.md
```

## Run locally

The site is plain files — open `index.html` in a browser and it works. But because some browsers restrict `localStorage` on the `file://` protocol, it's friendlier to serve it locally:

```bash
# Python 3 (built into macOS and most Linux):
python3 -m http.server 8000

# Or Node, if you have it:
npx serve .
```

Then visit <http://localhost:8000>.

## Deploy free on Vercel or Netlify

Both treat this as a "static site." No build step.

### Vercel
1. Push this folder to a GitHub repo.
2. Go to <https://vercel.com> → New Project → import the repo.
3. Framework Preset: **Other**. Build command: *(leave empty)*. Output directory: *(leave empty)*.
4. Deploy. You'll get a free `*.vercel.app` URL.

### Netlify
1. Push this folder to GitHub, **or** drag-and-drop the folder onto <https://app.netlify.com/drop>.
2. Build command: *(leave empty)*. Publish directory: `.` (the project root).
3. Deploy. You'll get a free `*.netlify.app` URL.

### Any plain static host
Any of these also work with zero config: GitHub Pages, Cloudflare Pages, Surge.sh, Render static sites.

## Change the launch date

The launch date controls puzzle numbering — puzzle #1 is the launch day, puzzle #2 is the day after, and so on.

Edit one line in `js/shared.js`:

```js
const LAUNCH_DATE = new Date('2026-01-01T00:00:00');
```

Change the date string to your real launch day. Save and refresh.

## Reset your local progress

Open the browser dev tools console on the site and run:

```js
Object.keys(localStorage).filter(k => k.startsWith('dcg_')).forEach(k => localStorage.removeItem(k));
```

## Why no framework?

Every game stays under ~10 KB of JavaScript. The whole site loads on a slow phone in under a second. There's nothing to break, nothing to update, and no supply chain.

## Licence

Do whatever you like with it.
