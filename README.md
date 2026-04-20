# 🎵 Harmonic Atlas

Interactive music theory reference — scales, chords, guitar/mandolin voicings, chord progression builder. Runs as an installable PWA (Progressive Web App) directly in the browser.

**Live app:** https://kkjsf.github.io/harmonic-atlas

---

## Feature overview

### Scale & chord panel

- Pick any **root note** and **scale** (major, minor, modes, jazz scales, etc.) from the top controls
- The **Circle of Fifths** highlights related keys and borrowed chords
- **Scale staff** — click the ♪ button to play the scale ascending; notes are rendered on a music staff
- **Interval arcs** — toggle "Steps" to see interval distances between notes
- **Negative harmony** — toggle to mirror all chords through the tonal axis (CoF highlighting is suppressed while active; hover chord cards to see per-note transformation arrows)

### Chord cards

Each scale degree shows a chord card with:
- Chord name, quality, and note names
- **▶ play button** (top-right corner, appears on hover) — plays the chord as a strummed hit, then an ascending arpeggio so you can hear both the harmony and the individual notes
- Staff notation toggle
- Improv scale suggestions (e.g. Dorian over a minor 7th)

### Guitar tab

- Chord diagrams for all scale-degree chords
- **Full fretboard** — shows scale positions across all 6 strings; swipe/scroll horizontally
- CAGED-position voicings

### Mandolin tab

- **Scale voicings** tab — scale positions on 4 strings
- **Chop Chords** tab — closed-position triads and 7th chords for the chop technique; open strings allowed where they fit the voicing

### Progression builder

- Click any chord card to add it to the progression
- Drag to reorder; set per-chord beat count
- **Play / Stop** — plays the progression in loop using the Salamander Grand Piano sound
- BPM, time signature, and swing controls
- **Zoom view** — full-screen progression view with playhead
- Export as text chord chart

---

## Audio

All audio uses **Tone.js** with the **Salamander Grand Piano** sample library — real recorded piano samples, not synthesized tones. Samples load once on page open (a small "⟳ loading samples…" indicator shows during loading).

- Chord play button: strummed chord → ascending arpeggio
- Scale staff: ascending scale playback
- Progression player: strummed chords with bass note emphasis and slight humanization

---

## Developer setup

### What's in this folder

```
harmonic-atlas/
├── index.html          ← The entire app (HTML + CSS + JS, ~9000 lines)
├── manifest.json       ← PWA config (name, icon, theme)
├── sw.js               ← Service worker (network-first for HTML, cache-first for assets)
├── dev-server.js       ← Local dev server with live-reload
├── start.bat           ← Windows launcher (double-click)
├── start.sh            ← Mac/Linux launcher
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    ├── apple-touch-icon.png
    └── favicon-32.png
```

### One-time setup

You only need **Node.js** installed — nothing else. Download it at https://nodejs.org (LTS).

### Daily workflow

**Windows:** double-click `start.bat`
**Mac/Linux:** run `node dev-server.js` in terminal

```
╔══════════════════════════════════════════╗
║   🎵  Harmonic Atlas — Dev Server         ║
╠══════════════════════════════════════════╣
║  PC:    http://localhost:3000             ║
║  Phone: http://192.168.1.42:3000          ║
╚══════════════════════════════════════════╝
```

The page auto-reloads every time `index.html` is saved.

### Deploying

Push to the `main` branch — GitHub Pages redeploys automatically in ~30 seconds.

```bash
git add index.html
git commit -m "your message"
git push
```

---

## Technical notes

### Architecture

- **Single-file app** — all CSS, JS, and HTML live in `index.html`. Intentional: easier to share and edit.
- **No JS framework** — vanilla JS only. External resources: Google Fonts (CSS) and Tone.js (audio, loaded from CDN).
- **Audio:** Tone.js 14.8.49 (CDN) + Salamander Grand Piano samples (CDN, streamed on load)
- **PWA:** `manifest.json` + `sw.js`. Service worker uses network-first for HTML navigation and cache-first for static assets.

### Audio subsystem

`initSampler()` creates a `Tone.Sampler` backed by Salamander mp3 files and connects it to `Tone.getDestination()`. All three audio paths share the same sampler:

| Path | Function |
|---|---|
| Chord card play button | `addCardPlayBtn` → `sampler.triggerAttackRelease` |
| Scale staff playback | `schedule()` inside the staff SVG click handler |
| Progression player | `playChordAt` → strum hits via `getStrumDurations` |

`Tone.start()` is called on first user interaction (touchstart/mousedown/keydown) to satisfy the browser autoplay policy. `Tone.getContext().rawContext` is aliased as `progAudioCtx` solely to read `ctx.currentTime` for scheduling offsets — all actual audio is routed through Tone.

`progStop()` calls `sampler.releaseAll()` to immediately silence all playing notes.

### Key functions

| Function | Purpose |
|---|---|
| `initSampler()` | Creates Tone.Sampler, shows/hides loading indicator |
| `midiToNoteName(midi)` | Converts MIDI int → Tone note string (e.g. 60 → "C4") |
| `spreadChordOctaves(pcs)` | Voices a set of pitch classes across octaves for smooth ascending playback |
| `playChordAt(ctx, pcs, startTime, duration, sound)` | Schedules a chord with strum pattern via sampler |
| `getStrumDurations(duration, beats)` | Returns strum hit timing/velocity pattern |
| `progPlay()` / `progStop()` | Progression playback start/stop |
| `addCardPlayBtn(card, notes)` | Adds ▶ button to chord cards (chord + arpeggio) |
| `addCardStaff(card, notes)` | Adds staff notation toggle to chord cards |
| `wireChordCards()` | Binds click-to-add-progression on all chord cards |
| `computeClosedMandoVoicing` / `getChopMandoVoicing` | Mandolin chop chord voicings |
| `makeScaleFretboardSVG` | Full horizontal fretboard SVG |

### Service worker cache

Cache key: `harmonic-atlas-v10`. Bump the version in `sw.js` when adding new static assets that need to be cached offline. HTML is always fetched fresh (network-first).
