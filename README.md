# 🎵 Harmonic Atlas — Developer Setup

## What's in this folder

```
harmonic-atlas/
├── index.html          ← The entire app (one file)
├── manifest.json       ← PWA config (name, icon, theme)
├── sw.js               ← Service worker (offline caching)
├── dev-server.js       ← Local dev server with live-reload
├── start.bat           ← Windows launcher (double-click)
├── start.sh            ← Mac/Linux launcher
└── icons/
    ├── icon-192.png    ← Android launcher icon
    ├── icon-512.png    ← Android splash / store icon
    ├── apple-touch-icon.png
    └── favicon-32.png
```

---

## One-time setup

You only need **Node.js** installed — nothing else.
Download it free at https://nodejs.org (pick "LTS").

---

## Daily workflow

### 1. Start the dev server

**Windows:** double-click `start.bat`
**Mac/Linux:** double-click `start.sh` or run `node dev-server.js` in terminal

You'll see:
```
╔══════════════════════════════════════════╗
║   🎵  Harmonic Atlas — Dev Server         ║
╠══════════════════════════════════════════╣
║  PC:    http://localhost:3000             ║
║  Phone: http://192.168.1.42:3000          ║   ← your actual IP
╚══════════════════════════════════════════╝
```

### 2. Open in browser (PC)

Go to **http://localhost:3000**

The page auto-reloads every time `index.html` is saved.

### 3. Open on your Android phone

- Make sure phone is on the **same WiFi** as your PC
- Open Chrome and go to **http://192.168.x.x:3000** (the IP shown in the terminal)
- The page live-reloads on your phone too when you save on the PC

---

## Working with Claude

When you want an evolution:

1. Start the dev server so you can see changes live
2. Ask Claude to make the change
3. Claude edits `index.html` and gives you the updated file
4. **Replace** the `index.html` in this folder with the new one
5. The browser reloads automatically — you see the result instantly

> **Tip:** Keep Claude's chat open in one window, the app in another.
> You'll see changes appear in real time as you confirm each step.

---

## Deploying to your phone (production)

When you're happy with the changes:

1. Push the updated `index.html` to GitHub (see below)
2. GitHub Pages redeploys automatically in ~30 seconds
3. Open Chrome on Android → visit your GitHub Pages URL
4. The installed PWA updates on next open

### GitHub Pages setup (one-time)

1. Create account at https://github.com
2. New repository → name: `harmonic-atlas` → Public
3. Upload all files from this folder (drag & drop in the browser UI)
4. Settings → Pages → Source: main branch → Save
5. Your URL: `https://YOUR_USERNAME.github.io/harmonic-atlas`
6. Open on Android Chrome → ⋮ menu → **"Add to Home screen"**

---

## File structure notes

The entire app lives in **`index.html`** — all CSS, JS, and HTML in one file.
This is intentional: easier to share, back up, and send to Claude for edits.

`manifest.json` and `sw.js` are small and rarely need changing.
The icons can be replaced if you want a different look.
