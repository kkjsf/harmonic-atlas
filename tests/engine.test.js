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
