# 🎵 Harmonic Atlas

Interactive music theory reference — scales, chords, guitar/mandolin voicings, composition tool with improvisation mode. Runs as an installable PWA (Progressive Web App) directly in the browser.

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
- **+ button** — adds the chord to the composition tool

### Guitar tab

- Chord diagrams for all scale-degree chords
- **Full fretboard** — shows scale positions across all 6 strings; swipe/scroll horizontally
- CAGED-position voicings

### Mandolin tab

- **Scale voicings** tab — scale positions on 4 strings
- **Chop Chords** tab — closed-position triads and 7th chords for the chop technique

### Composition tool (purple ♩ button, top-right)

Draft and save multi-chord compositions with full playback and improvisation support:

- **+ New** — creates a new composition (stored in `localStorage`)
- **↙ Import progression** — copies the current scale's diatonic chords into the composition
- Chord search bar — type to find any chord and add it

**Per-chord controls:**
- **F / A** toggle — Full (strummed) or Arpeggio mode
- **Note value** dropdown (Whole / Half / Quarter / 8th / 16th) — controls strum rate (full) or arp step speed
- **Arp pattern** dropdown (↑ Up / ↓ Down / ↑↓ / ↓↑) — visible in arp mode
- **Beat count** (−/+) — duration of the chord in beats
- **◀ ▶** — reorder chords within the composition
- **≈** — chord substitution suggestions

**Global controls (All row):**
- **Full / Arp ↑ / Arp ↓ / Arp ↕** — set all chords to the same mode at once
- **Note value dropdown** — applies the selected speed to all chords immediately

**Playback:**
- **Play / Stop** — Transport-based playback (supports reliable loop + live updates)
- **BPM** input, **Loop** toggle
- **Strum** pattern selector (Straight / Folk / Ballad / Pop / Jazz / etc.)
- **Swing** selector (Straight / Light / Medium / Hard)
- **Drums** toggle + style selector (Auto / Rock / Funk / Jazz / Bossa / Waltz / Ballad / Reggae / HiHat / Click) — synthesized kick, snare, hi-hat, ride, clap via Web Audio API; Auto maps strum pattern to a matching drum style
- **Sound** selector — Piano (Salamander Grand) or Guitar (real acoustic guitar samples, nbrosowsky)
- Live loop update — adding/removing/reordering chords takes effect at the next loop cycle (no need to stop)

**Compact view** toggle — collapses all cards to chord name + degree only; individual cards expand on tap.

**♪ Improvise button** — opens the improvisation overlay:
- Large chord name + Roman numeral
- All chord tones shown as note bubbles
- **Scale suggestions** — quality-based, musically correct recommendations:
  - Maj7 / Δ7 → Ionian, Lydian, Major Pentatonic
  - Dom7 / 9 / altered → Mixolydian, Altered, Lydian Dominant, Blues
  - Min7 → Dorian, Aeolian, Minor Pentatonic, Phrygian
  - Half-dim / ø7 → Locrian, Locrian ♯2
  - Dim7 → Diminished (H-W), Diminished (W-H)
  - Aug → Whole Tone, Lydian Augmented
- **Next chord** preview
- **Timeline bar** with animated playhead showing position in the loop
- **⏸ Pause / Resume** button — pauses/resumes playback without leaving the overlay

---

## Audio

| Sound | Engine |
|---|---|
| Piano | Tone.js Sampler → Salamander Grand Piano samples (CDN) |
| Guitar | Tone.js Sampler → nbrosowsky acoustic guitar samples (CDN, 36 notes) |
| Drums | Raw Web Audio API synthesis (`_synthKick`, `_synthSnare`, `_synthHihat`, `_synthRide`, `_synthClap`) |
| Scale staff | `sampler.triggerAttackRelease` via Tone.Transport |
| Chord card buttons | `sampler.triggerAttackRelease` directly |

---

## Developer setup

### What's in this folder

```
harmonic-atlas/
├── index.html          ← The entire app (HTML + CSS + JS, ~10 000 lines)
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
- **Audio:** Tone.js 14.8.49 (CDN) + Salamander Grand Piano + nbrosowsky acoustic guitar samples
- **Theme:** dark mode only
- **PWA:** `manifest.json` + `sw.js`. Service worker uses network-first for HTML navigation and cache-first for static assets.

### Audio subsystem

`initSampler()` creates a `Tone.Sampler` backed by Salamander mp3 files. `initGuitarSampler()` creates a second `Tone.Sampler` backed by nbrosowsky acoustic guitar mp3s (loaded lazily when Guitar sound is selected).

| Path | Engine |
|---|---|
| Chord card play/arp buttons | `addCardPlayBtn` → `sampler.triggerAttackRelease` |
| Scale staff playback | `Tone.Transport.schedule` → sampler |
| Composition player | `Tone.Transport.schedule` → `activeSampler` (piano or guitar) |
| Composition drums | Raw Web Audio API — `_synthKick`, `_synthSnare`, `_synthHihat`, `_synthRide`, `_synthClap` |

`Tone.start()` is called on first user interaction to satisfy browser autoplay policy. Composition playback uses `Tone.Transport` exclusively — this enables `Tone.Transport.cancel(0)` for a clean stop. A `_compPlayGen` counter guards stale callbacks after stop. A `compPendingRestart` flag triggers a seamless loop restart at the next cycle boundary when chords are modified during playback.

### Key functions

| Function | Purpose |
|---|---|
| `initSampler()` | Creates Tone.Sampler for piano, shows/hides loading indicator |
| `initGuitarSampler()` | Creates Tone.Sampler for acoustic guitar (lazy) |
| `midiToNoteName(midi)` | MIDI int → Tone note string (e.g. 60 → "C4") |
| `spreadChordOctaves(pcs)` | Voices pitch classes across octaves for smooth playback |
| `getStrumDurations(chDur, beats)` | Returns hit objects `{offset, dur, velocity, up, isFirst}` based on active strum + swing |
| `_arpIndex(s, n, pattern)` | Maps step index to voiced note index for a given arp pattern |
| `_synthKick / _synthSnare / _synthHihat / _synthRide / _synthClap` | Drum synthesis via Web Audio API |
| `compStartPlayback(id)` / `compStopPlayback()` | Composition Transport-based playback |
| `compRenderDetail(comp)` / `compRenderChordRow(comp)` | Composition UI rendering |
| `compLoad()` / `compSave()` / `compUpdate()` / `compCreate()` / `compDelete()` | localStorage CRUD for compositions |
| `getImprovSuggestions(chord)` | Quality-based scale suggestions for the improv overlay |
| `updateImprovOverlay(comp, idx)` | Updates improv overlay for the currently playing chord |
| `makeScaleFretboardSVG` | Full horizontal fretboard SVG |
| `computeClosedMandoVoicing` / `getChopMandoVoicing` | Mandolin chop chord voicings |

### Composition data model

Each composition is a plain JS object stored as JSON in `localStorage` (key: `harmonic-compositions`):

```js
{
  id: "comp_<timestamp>",
  title: "My progression",
  bpm: 90,
  loop: false,
  drums: true,
  drumsStyle: "funk",      // "auto"|"rock"|"funk"|"jazz"|"bossa"|"waltz"|"ballad"|"reggae"|"hihat"|"click"
  sound: "piano",          // "piano" | "guitar"
  strum: "Straight",       // strum pattern name
  swing: 0,                // 0=straight, 30=light, 55=medium, 75=hard
  text: "verse idea...",
  chords: [
    {
      name: "C", sym: "Δ7", roman: "IΔ7",
      pcs: [0, 4, 7, 11],   // pitch classes
      beats: 4,              // duration in beats
      noteVal: 4,            // 1=whole 2=half 4=quarter 8=eighth 16=sixteenth
      playMode: "full",      // "full" | "arp"
      arpPattern: "up"       // "up" | "down" | "updown" | "downup"
    }
  ]
}
```

### Service worker cache

Cache key: `harmonic-atlas-v10`. Bump the version in `sw.js` when adding new static assets that need to be cached offline. HTML is always fetched fresh (network-first).
