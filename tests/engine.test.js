// Engine tests for Harmonic Atlas: node tests/engine.test.js
//
// Loads the first <script> block of index.html in a Node VM with a do-nothing DOM,
// then checks the engine BY NAME ("E major pentatonic is E F# G# B C#", "C is
// x32010"). The v74 lesson: invariant-only checks (span, finger count) passed while
// the most important shapes were missing, so every check here names the expected
// content. No dependencies, nothing to install.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const block = html.match(/<script>\r?\n([\s\S]*?)<\/script>/)[1];

// A DOM stand-in that accepts any call or property access, so the app's top-level
// wiring runs without a browser and the pure functions are left to test.
function stub() {
  let p;
  const fn = function () {};
  p = new Proxy(fn, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => 0;
      if (k === Symbol.iterator) return function* () {};
      if (k === 'then') return undefined;
      if (k === 'length') return 0;
      if (k === 'toString' || k === 'valueOf') return () => '';
      if (k in t) return t[k];
      return p;
    },
    set(t, k, v) { t[k] = v; return true; },
    apply() { return p; },
    construct() { return p; },
    has() { return true; },
  });
  return p;
}
const store = {};
const ctx = {
  console: { log() {}, warn() {}, error() {} }, Math, JSON, Date, Set, Map, Array, Object, Number, String, Boolean,
  RegExp, Error, Promise, Symbol, WeakMap, WeakSet, parseInt, parseFloat, isNaN, isFinite, Infinity, NaN, undefined,
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  document: stub(), navigator: stub(), screen: stub(), location: stub(), history: stub(),
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  getComputedStyle: () => stub(), MutationObserver: function () { return { observe() {}, disconnect() {} }; },
  ResizeObserver: function () { return { observe() {}, disconnect() {} }; },
  fetch: () => new Promise(() => {}), innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
  performance: { now: () => 0 }, URL, URLSearchParams, addEventListener() {}, removeEventListener() {},
  alert() {}, confirm: () => true, btoa: s => Buffer.from(s, 'binary').toString('base64'),
  atob: s => Buffer.from(s, 'base64').toString('binary'), TextEncoder, TextDecoder,
};
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
try { vm.runInContext(block, ctx, { filename: 'index.html#script1' }); }
catch (e) { /* the page wiring may stop on the stub; the engine is defined above it */ }
const run = code => vm.runInContext(code, ctx);

let passed = 0;
const failures = [];
function check(name, fn) {
  try { fn(); passed++; }
  catch (e) { failures.push(name + ': ' + e.message); }
}
const eq = (got, want) => assert.strictEqual(got, want, `got ${got}, want ${want}`);

// ── Note names ──
check('noteNameToPc reads double and Unicode accidentals', () => {
  eq(run(`['Bbb','C##','E♭','Cb','E#','Cm'].map(noteNameToPc).join(',')`), '9,2,3,11,5,-1');
});
const scale = (k, name) => run(`spellScale(${k}, SCALES[${JSON.stringify(name)}].intervals, SCALES[${JSON.stringify(name)}]).join(' ')`);
check('C major', () => eq(scale(0, 'Major (Ionian)'), 'C D E F G A B'));
check('F major has Bb', () => eq(scale(5, 'Major (Ionian)'), 'F G A Bb C D E'));
check('Db major stays in flats', () => eq(scale(1, 'Major (Ionian)'), 'Db Eb F Gb Ab Bb C'));
check('C# minor, not Db minor', () => eq(scale(1, 'Aeolian (Natural Minor)'), 'C# D# E F# G# A B'));
check('G# minor, not Ab minor', () => eq(scale(8, 'Aeolian (Natural Minor)'), 'G# A# B C# D# E F#'));
check('E major pentatonic', () => eq(scale(4, 'Major Pentatonic'), 'E F# G# B C#'));
check('A major pentatonic', () => eq(scale(9, 'Major Pentatonic'), 'A B C# E F#'));
check('F# minor pentatonic', () => eq(scale(6, 'Minor Pentatonic'), 'F# A B C# E'));
check('C blues', () => eq(scale(0, 'Blues'), 'C Eb F Gb G Bb'));
check('E whole tone', () => eq(scale(4, 'Whole Tone'), 'E F# G# A# C D'));
check('C half-whole diminished', () => eq(scale(0, 'Half-Whole Diminished'), 'C Db Eb E F# G A Bb'));

// ── Chords ──
const chord = (pc, root, iv) => run(`spellChordFromRoot(${pc}, '${root}', ${JSON.stringify(iv)}).join(' ')`);
check('Fmaj7#11 spells its #11 as B', () => eq(chord(5, 'F', [0, 4, 7, 11, 6]), 'F A C E B'));
check('C7#11', () => eq(chord(0, 'C', [0, 4, 7, 10, 6]), 'C E G Bb F#'));
check('C7b13', () => eq(chord(0, 'C', [0, 4, 7, 10, 8]), 'C E G Bb Ab'));
check('V/ii in E major is C#7', () => {
  eq(run(`buildSecondaryDominants(4, SCALES['Major (Ionian)'].intervals, computeAllRomans(SCALES['Major (Ionian)'].intervals, SCALES['Major (Ionian)'])).find(x => x.label === 'V / ii').chord.root`), 'C#');
});
check('dim7 interval line says bb7', () => eq(run(`[0,3,6,9].map(s => iNameCtx(s, [0,3,6,9])).join(' ')`), '1 ♭3 ♭5 𝄫7'));
check('Lydian augmented 11th is named', () => eq(run(`classifyChord([0,4,8,11,14,18]).sym`), 'Δ9♯5♯11'));
check('no chord name is ? on any scale or size', () => {
  eq(run(`(() => { let bad = 0; for (const s of Object.keys(SCALES)) for (const m of [3,4,5,6,7]) { const iv = SCALES[s].intervals;
    for (let d = 0; d < iv.length; d++) { const r = classifyChord(chordIntervals(iv, d, Math.min(m, iv.length))); if (/\\?|Unknown/.test(r.sym + r.qual)) bad++; } } return bad; })()`), 0);
});
check('negative of CΔ9 is Fm9', () => eq(run(`(c => c.root + c.sym)(buildNegChord(['C','E','G','B','D'], 0))`), 'Fm9'));
check('b7 degree is the subtonic', () => eq(run(`degreeNames(SCALES['Aeolian (Natural Minor)'].intervals)[6]`), 'Subtonic'));
check('C major neighbours start with F and G major', () => {
  eq(run(`findScaleRelationships(0, 'Major (Ionian)').closely.slice(0, 2).map(x => x.label).sort().join(' | ')`), 'F Major (Ionian) | G Major (Ionian)');
});

// ── Guitar ──
const gtr = (r, iv) => run(`(v => v ? v.frets6.map(f => f < 0 ? 'x' : f).join('') : null)(getBasicVoicing(${r}, ${JSON.stringify(iv)}))`);
const M = [0, 4, 7], m = [0, 3, 7], D7 = [0, 4, 7, 10], M7 = [0, 4, 7, 11], m7 = [0, 3, 7, 10];
const OPEN = { C: [0, M, 'x32010'], G: [7, M, '320003'], D: [2, M, 'xx0232'], A: [9, M, 'x02220'], E: [4, M, '022100'],
  Am: [9, m, 'x02210'], Em: [4, m, '022000'], Dm: [2, m, 'xx0231'], E7: [4, D7, '020100'], A7: [9, D7, 'x02020'],
  D7: [2, D7, 'xx0212'], G7: [7, D7, '320001'], B7: [11, D7, 'x21202'], C7: [0, D7, 'x32310'], Cmaj7: [0, M7, 'x32000'],
  Fmaj7: [5, M7, 'xx3210'], Am7: [9, m7, 'x02010'], Em7: [4, m7, '020000'], Dm7: [2, m7, 'xx0211'],
  F: [5, M, '133211'], 'C#m': [1, m, 'x46654'] };
for (const [name, [r, iv, want]] of Object.entries(OPEN)) check('guitar ' + name, () => eq(gtr(r, iv), want));
check('no Basic triad leaves a string unmarked', () => {
  eq(run(`(() => { let bad = 0; for (let r = 0; r < 12; r++) for (const iv of [[0,4,7],[0,3,7],[0,3,6],[0,4,8]]) { const v = getBasicVoicing(r, iv); if (v && v.frets6.some(f => f === undefined)) bad++; } return bad; })()`), 0);
});
check('CAGED E shape of C starts below the root (fret 7 shown)', () => {
  eq(run(`computeScalePositions(SCALES['Major (Ionian)'].intervals, 0).find(p => p.label === 'E shape').startFret`), 6);
});
check('alt-dom shapes are movable and four-finger', () => {
  eq(run(`(() => { let bad = 0; ALT_DOM_VOICINGS.forEach(t => t.shapes.forEach(sh => { for (let r = 0; r < 12; r++) { const v = computeVoicingFromTemplate(r, sh); if (!v || v.frets6.some(f => f === 0)) bad++; } })); return bad; })()`), 0);
});

// ── Mandolin and banjo ──
const mando = (r, iv) => run(`getMandolinVoicing(${r}, ${JSON.stringify(iv)}).frets4.join('-')`);
check('mandolin G', () => eq(mando(7, M), '0-0-2-3'));
check('mandolin D', () => eq(mando(2, M), '2-0-0-2'));
check('mandolin Am', () => eq(mando(9, m), '2-2-3-0'));
check('mandolin Em', () => eq(mando(4, m), '0-2-2-0'));
check('mandolin big chop G = 7-5-2-3', () => {
  eq(run(`getGrips('mandolin', 7, [0,4,7], { allowOpen: false, limit: 6 }).some(g => g.frets.join('-') === '7-5-2-3' && g.name === 'Big Chop')`), true);
});
check('banjo C opens on 2-0-1-2', () => eq(run(`getGrips('banjo', 0, [0,4,7], { allowOpen: true, limit: 4 })[0].frets.join('-')`), '2-0-1-2'));
check('banjo drone fretted at 7 sounds A (g + 2)', () => {
  eq(run(`droneState(GRIP_INSTR.banjo, [7,7,7,7], 9, [0,4,7])`).tone, 0);
});

const banjo = (r, iv) => run(`(g => g[g.best || 0].frets.join('-'))(getGrips('banjo', ${r}, ${JSON.stringify(iv)}, { allowOpen: true, limit: 4 }))`);
check('banjo G is the open G', () => eq(banjo(7, M), '0-0-0-0'));
check('banjo D7 opens on 0-2-1-4', () => eq(banjo(2, D7), '0-2-1-4'));
check('banjo Ebm is the compact 4-3-4-4, not the stretched 4-3-4-1', () => eq(banjo(3, m), '4-3-4-4'));
check('no banjo grip reaches past four frets, and the drone never needs a fifth finger', () => {
  eq(run(`(() => { let bad = 0; for (const s of Object.keys(SCALES)) { const iv0 = SCALES[s].intervals;
    for (let k = 0; k < 12; k++) for (let d = 0; d < iv0.length; d++) for (const n of [3, 4]) { if (n > iv0.length) continue;
      const iv = chordIntervals(iv0, d, n), root = (k + iv0[d]) % 12, tset = [...new Set(iv.map(x => ((x % 12) + 12) % 12))];
      for (const open of [true, false]) for (const g of getGrips('banjo', root, iv, { allowOpen: open, limit: 4 })) {
        const fr = g.frets.filter(f => f > 0);
        if (fr.length && Math.max(...fr) - Math.min(...fr) > 3) bad++;
        const dr = droneState(GRIP_INSTR.banjo, g.frets, root, tset);
        if (dr && dr.fret > 0 && gripFingerCount(g.frets.map(f => f === 0 ? MUTE : f)) >= 4) bad++;
      } } } return bad; })()`), 0);
});

// ── Piano ──
// Fingerings as pianochord.org prints them: C, C/E, C/G, C7, Cmaj7, Dm7, Bdim, Csus4, Csus2.
const NAMES = ['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const pf = (r, iv, k) => run(`(o => o.fingRH.join('') + '/' + o.fingLH.join(''))(pianoOneHand(${r}, ${JSON.stringify(iv)})[${k}])`);
const pkeys = arr => arr.map(m => NAMES[m % 12]).join(' ');
check('piano C root position RH 1-3-5, LH 5-3-1', () => eq(pf(0, M, 0), '135/531'));
check('piano C/E RH 1-2-5, LH 5-3-1', () => eq(pf(0, M, 1), '125/531'));
check('piano C/G RH 1-3-5, LH 5-2-1', () => eq(pf(0, M, 2), '135/521'));
check('piano C7, Cmaj7, Dm7 RH 1-2-3-5, LH 5-3-2-1', () => eq([pf(0, D7, 0), pf(0, M7, 0), pf(2, m7, 0)].join(' '), '1235/5321 1235/5321 1235/5321'));
check('piano Cmaj7/E puts 4-5 on the B-C semitone', () => eq(pf(0, M7, 1).split('/')[0], '1245'));
check('piano Bdim RH 1-3-5, LH 5-3-1', () => eq(pf(11, [0, 3, 6], 0), '135/531'));
check('piano Csus4 RH 1-4-5, LH 5-2-1; Csus2 RH 1-2-5, LH 5-4-1', () => eq(pf(0, [0, 5, 7], 0) + ' ' + pf(0, [0, 2, 7], 0), '145/521 125/541'));
check('piano G13 rootless A = B E F A, B = F A B E', () => {
  const o = JSON.parse(run(`JSON.stringify(pianoOneHand(7, [0,4,7,10,14,17,21]))`));
  eq(o.map(x => x.pill + ':' + pkeys(x.rh)).join(' | '), 'A:B E F A | B:F A B E');
});
check('piano Dm9 rootless A = F A C E', () => eq(pkeys(JSON.parse(run(`JSON.stringify(pianoOneHand(2, [0,3,7,10,14])[0].rh)`))), 'F A C E'));
const two = (r, iv) => JSON.parse(run(`JSON.stringify(pianoTwoHand(${r}, ${JSON.stringify(iv)}))`));
check('piano two hands: G13 keeps its third and loses the 11th', () => {
  eq(two(7, [0, 4, 7, 10, 14, 17, 21]).every(o => { const k = pkeys(o.lh.concat(o.rh)); return k.includes('B') && !k.includes('C'); }), true);
});
check('piano two hands: G11 loses its third and keeps the 11th', () => {
  eq(two(7, [0, 4, 7, 10, 14, 17]).every(o => { const k = pkeys(o.lh.concat(o.rh)).split(' '); return !k.includes('B') && k.includes('C'); }), true);
});
check('piano two hands: CΔ9 under R-7 is C B | G D E', () => {
  const o = two(0, [0, 4, 7, 11, 14]).find(x => x.key === '7');
  eq(pkeys(o.lh) + ' | ' + pkeys(o.rh), 'C B | G D E');
});
check('every piano voicing on every scale is fingered, in reach, and keeps its root and third', () => {
  eq(run(`(() => { const bad = []; for (const s of Object.keys(SCALES)) { const sd = SCALES[s];
    for (let k = 0; k < 12; k++) { const sn = spellScale(k, sd.intervals, sd), list = [];
      for (const n of [3, 4, 5, 6, 7]) if (n <= sn.length) for (let d = 0; d < sn.length; d++) list.push({ r: noteNameToPc(buildChord(sn, d, n)[0]), iv: chordIntervals(sd.intervals, d, n) });
      for (const c of list) { const all = pianoOneHand(c.r, c.iv).concat(pianoTwoHand(c.r, c.iv));
        if (!all.length) bad.push('none');
        for (const o of all) { const keys = o.lh.concat(o.rh), pcs = new Set(keys.map(m => m % 12));
          if (o.fingRH.length !== o.rh.length || o.fingLH.length !== (o.kind === 'two' ? o.lh : o.rh).length) bad.push('fingers');
          if (o.rh[o.rh.length - 1] - o.rh[0] > 12) bad.push('reach');
          if (o.kind !== 'rootless' && !pcs.has(c.r)) bad.push('root');
          const third = c.iv.find(x => x === 3 || x === 4);
          // only the 11-over-major-third rule (checked by name above) may take the third out
          if (third !== undefined && pianoKeptTones(c.iv).includes(third) && !pcs.has((c.r + third) % 12)) bad.push('third');
        } } } } return bad.length; })()`), 0);
});

// ── Sound: each card plays the voicing it draws ──
const snd = v => run(`(s => s.notes.map(midiToNoteName).join(' ') + (s.arp ? ' / ' + s.arp.map(midiToNoteName).join(' ') : ''))(voicingSound(${v}))`);
check('guitar C (x32010) strums C3 E3 G3 C4 E4', () => eq(snd(`{ frets6: [-1, 3, 2, 0, 1, 0] }`), 'C3 E3 G3 C4 E4'));
check('mandolin G (0-0-2-3) strums G3 D4 B4 G5', () => eq(snd(`{ frets4: [0, 0, 2, 3] }`), 'G3 D4 B4 G5'));
check('banjo open G brushes the g drone first and ends the roll on it', () => {
  eq(snd(`{ instr: 'banjo', grip: { frets: [0, 0, 0, 0] }, rootPc: 7, iv: [0, 4, 7] }`), 'G4 D3 G3 B3 D4 / D3 G3 B3 D4 G4');
});
check('banjo C barre at 5 leaves the drone out of the roll (unison with the 1st string)', () => {
  eq(snd(`{ instr: 'banjo', grip: { frets: [5, 5, 5, 5] }, rootPc: 0, iv: [0, 4, 7] }`), 'G4 G3 C4 E4 G4 / G3 C4 E4 G4');
});
check('banjo C (2-0-1-2) rolls up to the drone', () => {
  eq(snd(`{ instr: 'banjo', grip: { frets: [2, 0, 1, 2] }, rootPc: 0, iv: [0, 4, 7] }`), 'G4 E3 G3 C4 E4 / E3 G3 C4 E4 G4');
});
check('plucked strings are in tune (banjo D4, mandolin E5 within 2 cents)', () => {
  const cents = run(`(() => { const sr = 48000, ctx = { sampleRate: sr, createBuffer: (c, n) => { const d = new Float32Array(n); return { getChannelData: () => d }; } };
    return [['banjo', 62], ['mandolin', 76]].map(([i, m]) => { const d = pluckBuffer(ctx, i, m).getChannelData(0), f0 = 440 * Math.pow(2, (m - 69) / 12);
      const r = lag => { let s = 0; for (let k = 4800; k < 9600; k++) s += d[k] * d[k + lag]; return s; };
      let bl = 0, best = -Infinity; for (let lag = Math.floor(sr / f0 / 1.06); lag <= Math.ceil(sr / f0 * 1.06); lag++) { const v = r(lag); if (v > best) { best = v; bl = lag; } }
      const y0 = r(bl - 1), y1 = r(bl), y2 = r(bl + 1), f = sr / (bl + 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2));
      return Math.abs(1200 * Math.log2(f / f0)) < 2; }).join(','); })()`);
  eq(cents, 'true,true');
});
check('mandolin and banjo samples span every tuning and 15 frets up the top string', () => {
  eq(run(`['mandolin', 'banjo'].map(i => { const r = SAMPLE_SETS[i], all = TUNER_INSTR[i].presets.flatMap(p => p[1]);
    return Math.min(...all) >= r.lo && Math.max(...all) + 15 <= r.hi; }).join()`), 'true,true');
});
check('every mandolin and banjo note has its sample file (no 404 on load)', () => {
  const bad = [];
  for (const instr of ['mandolin', 'banjo']) {
    const r = JSON.parse(run(`JSON.stringify(SAMPLE_SETS.${instr})`));
    for (let m = r.lo; m <= r.hi; m++) if (!fs.existsSync(path.join(__dirname, '..', 'samples', instr, m + '.mp3'))) bad.push(instr + ' ' + m);
  }
  eq(bad.join() || 'ok', 'ok');
});
check('the composition player moves notes into the instrument by octaves (C2 bass on mandolin = C4)', () => {
  eq(run(`[fitToRange(36, SAMPLE_SETS.mandolin), fitToRange(48, SAMPLE_SETS.banjo), fitToRange(43, SAMPLE_SETS.banjo), fitToRange(95, SAMPLE_SETS.mandolin)].join()`), '60,48,55,83');
});
check('every sample set has a revision for its URLs (the service worker caches them for good)', () => {
  eq(run(`Object.values(SAMPLE_SETS).every(r => Number.isInteger(r.rev) && r.rev > 0)`), true);
});
check('a note plays from the closest recording, none past 3 semitones', () => {
  eq(run(`[nearestSample({ 55: 1, 57: 1, 60: 1 }, 56.4), nearestSample({ 55: 1, 57: 1 }, 55.4), nearestSample({ 55: 1 }, 58.5), nearestSample({}, 60)].join()`), '57,55,,');
});
check('a sample starts 3 ms before its attack, past the MP3 head padding', () => {
  eq(run(`(() => { const x = new Float32Array(44100); for (let i = 1105; i < x.length; i++) x[i] = (i % 2 ? 0.5 : -0.5) * Math.exp(-(i - 1105) / 9000);
    return Math.round(sampleStart(x, 44100) * 44100); })()`), 973);
});

// ── Tuner ──
check('tuner standard tunings are the instruments\' own', () => {
  eq(run(`[TUNER_INSTR.guitar.presets[0][1].join() === GUITAR_MIDI.join(), TUNER_INSTR.mandolin.presets[0][1].join() === MANDO_MIDI.join(),
    TUNER_INSTR.banjo.presets[0][1].join() === [GRIP_INSTR.banjo.drone.midi].concat(GRIP_INSTR.banjo.midi).join()].join()`), 'true,true,true');
});
check('tuner preset names read gDGBD / DADGAD', () => {
  const name = (i, p) => run(`TUNER_INSTR.${i}.presets.find(p => p[0] === ${JSON.stringify(p)})[1].map(m => tunerLabel(m).n).join(' ')`);
  eq(name('banjo', 'Open G') + ' | ' + name('banjo', 'Double C') + ' | ' + name('guitar', 'DADGAD') + ' | ' + name('mandolin', 'Cross A (AEAE)'),
    'G D G B D | G C G C D | D A D G A D | A E A E');
});
check('tuner: low E down 2 is Drop D, banjo drone up 1 is custom', () => {
  eq(run(`[TUNER_INSTR.guitar.presets[tunerPresetIndex('guitar', [38,45,50,55,59,64])][0], tunerPresetIndex('banjo', [68,50,55,59,62])].join()`), 'Drop D,-1');
});
check('tuner: banjo drone in A-flat aims at 415.3 Hz', () => {
  eq(run(`tunerLabel(68).n + tunerLabel(68).o + ' ' + tunerHz(68, 440).toFixed(1)`), 'A♭4 415.3');
});
check('tuner: a G played on an A-flat drone reads a semitone and a bit low', () => {
  eq(run(`[tunerOffsetText(-117), tunerOffsetText(191), tunerOffsetText(-200), tunerOffsetText(4.4), tunerOffsetText(-0.2)].join(' | ')`), '−1 st 17¢ | +1 st 91¢ | −2 st | +4¢ | −0¢');
});
check('tuner: Auto picks the closest string, a lock keeps its own', () => {
  eq(run(`[tunerTarget([40,45,50,55,59,64], 44.7, null).idx, tunerTarget([67,50,55,59,62], 67, 0).target, tunerTarget([], 60.4, null).target].join()`), '1,67,60');
});
check('tuner YIN within 1 cent from 65 Hz to 1.3 kHz, no octave error on a loud 2nd harmonic', () => {
  eq(run(`(() => { const sr = 48000, bad = [];
    for (const f of [65.41, 82.41, 110, 196, 293.66, 415.3, 659.26, 1318.5]) for (const h2 of [0.5, 5]) {
      const x = new Float32Array(4096);
      for (let i = 0; i < x.length; i++) x[i] = 0.1 * (Math.sin(2 * Math.PI * f * i / sr) + h2 * Math.sin(4 * Math.PI * f * i / sr + 1) + 0.4 * Math.sin(6 * Math.PI * f * i / sr + 2));
      const r = tunerYin(x, sr, Math.min(55, f * 0.66), 1500);
      if (!r || Math.abs(1200 * Math.log2(r.f / f)) > 1) bad.push(f + 'x' + h2);
    } return bad.join() || 'ok'; })()`), 'ok');
});
check('tuner reads plucked strings through a phone-like mic (A-flat drone at the attack, low E, mandolin E)', () => {
  eq(run(`(() => { const sr = 48000, ctx = { sampleRate: sr, createBuffer: (c, n) => { const d = new Float32Array(n); return { getChannelData: () => d }; } };
    const hp = x => { const a = 1 / (1 + 2 * Math.PI * 250 / sr); let px = 0, py = 0; return x.map(v => { py = a * (py + v - px); px = v; return py; }); };
    return [['banjo', 68, 50], ['guitar', 40, 38], ['mandolin', 76, 55]].map(([i, m, low]) => {
      const x = hp(hp(pluckBuffer(ctx, i, m).getChannelData(0).slice(2400 - 1000, 2400 + 4096))).slice(1000);
      const r = tunerYin(x, sr, tunerHz(low, 440) * 0.66, 1500);
      return r && Math.abs(1200 * Math.log2(r.f / tunerHz(m, 440))) < 3; }).join(); })()`), 'true,true,true');
});
check('tuner YIN hears nothing in noise', () => {
  eq(run(`(() => { let s = 7; const x = new Float32Array(4096).map(() => ((s = s * 16807 % 2147483647) / 2147483647 - 0.5) * 0.2);
    const r = tunerYin(x, 48000, 55, 1500); return r === null || r.conf < 0.75; })()`), true);
});

// ── Tonnetz (Chords › Tonnetz) ──
const tzName = `(c => tzSpellTriad(c.root, c.minor)[0] + (c.minor ? 'm' : ''))`;
check('Tonnetz: P, L and R are involutions on all 24 triads, and each keeps two notes', () => {
  eq(run(`(() => { let bad = 0; for (let r = 0; r < 12; r++) for (const minor of [false, true]) { const t = tzNearestTri({ root: r, minor }, 0, 0);
    for (const op of 'PLR') { const n = TZ_OPS[op](t), a = tzTriPcs(tzTriChord(t)), b = tzTriPcs(tzTriChord(n));
      if (!tzSameTri(TZ_OPS[op](n), t) || a.filter(p => b.includes(p)).length !== 2) bad++; } } return bad; })()`), 0);
});
check('Tonnetz: C goes to Cm by P, Em by L, Am by R', () => {
  eq(run(`(t => 'PLR'.split('').map(op => ${tzName}(tzTriChord(TZ_OPS[op](t)))).join(' '))({ i: 0, j: 0, up: true })`), 'Cm Em Am');
});
check('Tonnetz: R L R L R L R from C lands on Cm (= P)', () => {
  eq(run(`(() => { let t = { i: 0, j: 0, up: true }; for (const op of 'RLRLRLR') t = TZ_OPS[op](t); return ${tzName}(tzTriChord(t)); })()`), 'Cm');
});
const place = (k, s, m) => `(() => { const d = tzDegreeChords(${k}, ${JSON.stringify(s)}, ${JSON.stringify(m)}); return { d, p: tzPlaceKey(d.chords, ${k}) }; })()`;
check('Tonnetz: the C major ribbon Dm F Am C Em G is contiguous, each chord sharing an edge with the next', () => {
  eq(run(`(({ d, p }) => { const order = [1, 3, 5, 0, 2, 4];
    const names = order.map(i => d.chords[i].name).join(' ');
    const edges = order.slice(1).map((i, x) => p[i].verts.filter(v => p[order[x]].verts.some(w => tzSameV(v, w))).length).join('');
    return names + ' ' + edges + ' ' + order.every(i => p[i].tri); })(${place(0, 'Major (Ionian)', '3')})`), 'Dm F Am C Em G 22222 true');
});
check('Tonnetz: A harmonic minor places 4 triangles (Am Dm E F) and 3 other chords (Bdim Caug G#dim)', () => {
  eq(run(`(({ d, p }) => d.chords.filter((c, i) => p[i].tri).map(c => c.name).join(' ') + ' | ' + d.chords.filter((c, i) => !p[i].tri && p[i].verts.length === 3).map(c => c.name).join(' '))(${place(9, 'Harmonic Minor', '3')})`),
    'Am Dm E F | Bdim Caug G#dim');
});
check('Tonnetz: the map names chords as the List does (C major 7ths)', () => {
  eq(run(`tzDegreeChords(0, 'Major (Ionian)', '4').chords.map(c => c.numeral + ' ' + c.name).join(', ')`), 'I CΔ7, ii Dm7, iii Em7, IV FΔ7, V G7, vi Am7, vii° Bø7');
});
check('Tonnetz: 7th shapes, CΔ7 = 2 triangles / 5 edges, G7 = 1 / 4, B°7 = 0 / 3', () => {
  const shp = (r, iv) => `(s => s.tris.length + '/' + s.edges.length)(tzShapeOf(tzGreedyShape(${JSON.stringify(iv.map(x => (r + x) % 12))}, tzNearestVertex(${r}, 0, 0))))`;
  eq(run(`[${shp(0, [0, 4, 7, 11])}, ${shp(7, [0, 4, 7, 10])}, ${shp(11, [0, 3, 6, 9])}].join(' ')`), '2/5 1/4 0/3');
});
check('Tonnetz: the selected chord grows its 7th on the placed key (CΔ7, G7 in C major, B°7 in C harmonic minor)', () => {
  const sel = (k, s, deg) => `(({ d, p }) => (x => x.tris.length + '/' + x.edges.length)(tzShapeOf(tzSelShape(p[${deg}].verts, d.chords[${deg}].pcs))))(${place(k, s, '4')})`;
  eq(run(`[${sel(0, 'Major (Ionian)', 0)}, ${sel(0, 'Major (Ionian)', 4)}, ${sel(0, 'Harmonic Minor', 6)}].join(' ')`), '2/5 1/4 0/3');
});
check('Tonnetz: the negative mirror in C maps C to Cm and G to Fm, on pitch classes and on the map', () => {
  const geo = (r, minor) => `(t => ${tzName}(tzTriChord(tzMirrorTri(tzAxisNear(0, ...tzCentroid(tzTriVerts(t))), t))))(tzNearestTri({ root: ${r}, minor: ${minor} }, 0, 0))`;
  eq(run(`[[0,4,7],[7,11,2]].map(c => c.map(p => tzMirrorPc(p, 0)).sort((a, b) => a - b).join(',')).join(' ') + ' ' + ${geo(0, false)} + ' ' + ${geo(7, false)}`), '0,3,7 0,5,8 Cm Fm');
});
check('Tonnetz: the map mirror is the app\'s negative-harmony mirror for every pitch class and key', () => {
  eq(run(`(() => { let bad = 0; for (let t = 0; t < 12; t++) for (let pc = 0; pc < 12; pc++) if (tzMirrorPc(pc, t) !== negMirrorPcCoF(pc, t)) bad++; return bad; })()`), 0);
});
check('Tonnetz: voice-leading text C to Am is "G→A +2"', () => eq(run(`tzVlText([0, 4, 7], [9, 0, 4], pcToName, pcToName)`), 'G→A +2'));
check('Tonnetz: shortest voice-leading moves C to Am by one tone, keeping C and E', () => {
  eq(run(`tzVoiceLead([60, 64, 67], [9, 0, 4]).join(' ')`), '60 64 69');
});
check('Tonnetz: every scale, key and chord mode places without throwing, every degree on the map', () => {
  eq(run(`(() => { const bad = []; for (const s of Object.keys(SCALES)) for (let k = 0; k < 12; k++) for (const m of HASH_MODES) {
    try { const d = tzDegreeChords(k, s, m), p = tzPlaceKey(d.chords, k);
      if (!d.chords.length || p.some(x => !x || !x.verts || x.verts.length !== 3 || x.verts.some(v => !v))) bad.push(s + ' ' + k + ' ' + m); }
    catch (e) { bad.push(s + ' ' + k + ' ' + m + ': ' + e.message); } } return bad.slice(0, 3).join('; ') || 'ok'; })()`), 'ok');
});
check('Tonnetz: C major pentatonic (no triangle) and C whole tone (all augmented lines) place around the tonic', () => {
  eq(run(`['Major Pentatonic', 'Whole Tone'].map(s => { const d = tzDegreeChords(0, s, '3'), p = tzPlaceKey(d.chords, 0);
    return p.filter(x => x.tri).length + ':' + p[0].verts.some(v => tzPcAt(...v) === 0); }).join(' ')`), '0:true 0:true');
});
check('Tonnetz: modes the map cannot draw fall back to the triads and say so', () => {
  eq(run(`(d => d.chords.map(c => c.name).join(' ') + ' | ' + d.note)(tzDegreeChords(0, 'Major (Ionian)', 'secdom'))`),
    "C Dm Em F G Am Bdim | Secondary dominants are shown in List view; the map shows the scale's triads.");
});
check('Tonnetz: a link to the Tonnetz sub-view survives', () => eq(run(`decodeHash('#k=7&s=Dorian&m=3&v=tonnetz').view`), 'tonnetz'));

// ── Shared links and share codes ──
check('a malformed link is ignored, not fatal', () => eq(run(`[decodeHash('#k=0&s=%25'), decodeHash('#k=0&s=constructor')].join(',')`), ','));
check('a link keeps known values only', () => eq(run(`JSON.stringify(decodeHash('#k=2&s=Dorian&m=99&v=zzz'))`), '{"key":2,"scale":"Dorian","mode":"4","view":"list"}'));

const total = passed + failures.length;
if (failures.length) {
  console.error(failures.map(f => '  FAIL ' + f).join('\n'));
  process.stderr.write(`${passed}/${total} passed\n`);
  process.exit(1);
}
process.stdout.write(`${passed}/${total} passed\n`);
