# 🎵 Harmonic Atlas

Interactive music theory reference — scales, chords, guitar/mandolin voicings, chord progression builder. Runs as an installable PWA (Progressive Web App) directly in the browser.

**Live app:** https://kkjsf.github.io/harmonic-atlas

---

## Feature overview

### Scale & chord panel

- Pick any **root note** and **scale** (major, minor, modes, jazz scales, etc.) from the top controls
- The **Circle of Fifths** highlights related keys and borrowed chords
- **Scale staff** — click the ♪ button to play the scale ascending; notes rendered on a music staff
- **Interval arcs** — toggle "Steps" to see interval distances between notes
- **Negative harmony** — toggle to mirror all chords through the tonal axis; per-note transformation arrows shown on hover; chord cards use distinct colors to indicate mirrored relationships

### Chord cards

Each scale degree shows a chord card with:
- Chord name, quality, and note names
- **▶ play button** (top-right corner, appears on hover) — strummed full chord
- **arp button** — ascending arpeggio playback
- Staff notation toggle
- Improv scale suggestions (e.g. Dorian over a minor 7th)
- **+ button** — adds the chord to the progression builder

### Guitar tab

- Chord diagrams for all scale-degree chords
- **Full fretboard** — shows scale positions across all 6 strings; swipe/scroll horizontally
- CAGED-position voicings

### Mandolin tab

- **Scale voicings** tab — scale positions on 4 strings
- **Chop Chords** tab — closed-position triads and 7th chords for the chop technique

### Progression builder

- Click the **+** button on any chord card to add it to the progression
- Drag to reorder; set per-chord beat count with **−/+** buttons
- Per-chord **F / A** toggle — Full (strummed) or Arpeggio mode
- Per-chord **note value** dropdown (Whole / Half / Quarter / Eighth / 16th) — controls how many times the chord repeats within its beat window
- Per-chord **arp pattern** dropdown (↑ Up / ↓ Down / ↑↓ Up-Down / ↓↑ Down-Up) — visible in arp mode
- **Play / Stop** — plays the progression using Tone.js + Salamander Grand Piano samples
- BPM, time signature, swing, and strum-pattern controls
- **Zoom view** — full-screen progression view with playhead
- Export as text chord chart

### Compositions

Draft and save multi-chord compositions with full playback control:

- **+ New** — creates a new composition (stored in `localStorage`)
- **↙ Import progression** — copies the current progression builder into the composition
- Per-chord controls (same as progression builder): F/A mode, note value, arp pattern, beat count (−/+)
- Per-chord **reorder** — ◀ ▶ arrows in the card header to shift chord position
- **Compact view** toggle — collapses all cards to chord name + degree only; individual cards can also be tapped/clicked to expand on mobile
- **Play / Stop** — Transport-based playback (supports reliable Stop)
- **BPM** input, **Loop** toggle
- **Drums** toggle — adds synthesized kick + snare + hi-hat; style selector:
  - *Rock (hat)* — kick on beats 1 & 3, snare on 2 & 4, closed hi-hat on every 8th note
  - *Simple* — kick + snare only, no hi-hat
  - *Hi-hat only* — hi-hat 8ths only
- **Notes** textarea — free text for lyrics, key, feel, etc.
- Compositions persist across reloads via `localStorage` key `harmonic-compositions`

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
- **Theme:** dark mode only
- **PWA:** `manifest.json` + `sw.js`. Service worker uses network-first for HTML navigation and cache-first for static assets.

### Audio subsystem

`initSampler()` creates a `Tone.Sampler` backed by Salamander mp3 files and connects it to `Tone.getDestination()`. Audio paths:

| Path | Engine |
|---|---|
| Chord card play/arp buttons | `addCardPlayBtn` → `sampler.triggerAttackRelease` |
| Scale staff playback | `schedule()` inside the staff SVG click handler |
| Progression player | `playChordAt` (full/strum) or `_progScheduleArp` / `_progScheduleFull` |
| Composition player | `Tone.Transport.schedule` → sampler (supports reliable Stop/Loop) |
| Composition drums | Raw Web Audio API — `_synthKick`, `_synthSnare`, `_synthHihat` |

`Tone.start()` is called on first user interaction to satisfy browser autoplay policy. Composition playback uses `Tone.Transport` exclusively — this enables `Tone.Transport.cancel(0)` for a clean stop. A `_compPlayGen` counter guards stale callbacks after stop.

Progression playback uses direct `ctx.currentTime` scheduling (not Transport) — `progStop()` calls `sampler.releaseAll()` to silence notes.

### Key functions

| Function | Purpose |
|---|---|
| `initSampler()` | Creates Tone.Sampler, shows/hides loading indicator |
| `midiToNoteName(midi)` | MIDI int → Tone note string (e.g. 60 → "C4") |
| `spreadChordOctaves(pcs)` | Voices pitch classes across octaves for smooth playback |
| `playChordAt(ctx, pcs, startTime, duration, sound)` | Schedules a strummed chord (strum patterns, bass emphasis) |
| `_arpIndex(s, n, pattern)` | Maps step index to voiced note index for a given arp pattern |
| `_progScheduleArp(pcs, start, dur, noteVal, beatDur, pattern)` | Arp playback for progression builder |
| `_progScheduleFull(ctx, pcs, start, dur, noteVal, beatDur)` | Repeated full chord for non-default note values |
| `_synthKick(actx, time)` | Synthesized kick: sub oscillator + click transient |
| `_synthSnare(actx, time)` | Synthesized snare: bandpass noise + tonal body |
| `_synthHihat(actx, time, open)` | Synthesized hi-hat: highpass noise burst |
| `compStartPlayback(id)` / `compStopPlayback()` | Composition Transport-based playback |
| `compRenderDetail(comp)` / `compRenderChordRow(comp)` | Composition UI rendering |
| `compLoad()` / `compSave()` / `compUpdate()` / `compCreate()` / `compDelete()` | localStorage CRUD for compositions |
| `progPlay()` / `progStop()` | Progression playback start/stop |
| `renderProgSlots()` | Renders progression builder chord slots |
| `addCardPlayBtn(card, notes)` | Adds full + arp play buttons to chord cards |
| `makeScaleFretboardSVG` | Full horizontal fretboard SVG |
| `computeClosedMandoVoicing` / `getChopMandoVoicing` | Mandolin chop chord voicings |

### Composition data model

Each composition is a plain JS object stored as JSON in `localStorage`:

```js
{
  id: "comp_<timestamp>",
  title: "My progression",
  bpm: 90,
  loop: false,
  drums: true,
  drumsStyle: "rock",       // "rock" | "simple" | "hihat"
  text: "verse idea...",
  chords: [
    {
      name: "C", sym: "maj7", roman: "Imaj7",
      pcs: [0, 4, 7, 11],   // pitch classes
      beats: 4,              // duration in beats
      noteVal: 2,            // 1=whole 2=half 4=quarter 8=eighth 16=sixteenth
      playMode: "full",      // "full" | "arp"
      arpPattern: "up"       // "up" | "down" | "updown" | "downup"
    }
  ]
}
```

### Service worker cache

Cache key: `harmonic-atlas-v10`. Bump the version in `sw.js` when adding new static assets that need to be cached offline. HTML is always fetched fresh (network-first).
