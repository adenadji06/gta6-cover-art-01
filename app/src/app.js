// Vice Nights — GTA 6-style cover art maker.
// All art is drawn by hand on canvas: a Vice City sunset sky, palm and
// skyline silhouettes, slanted multi-photo panels and bold poster lettering.
// Nothing is uploaded: photos are read on the user's machine and drawn
// locally. No Rockstar logo, artwork or font is used anywhere.
const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');

const SAMPLE_URLS = ['samples/boulevard.jpg', 'samples/pier.jpg', 'samples/portrait.jpg'];

// Sunset / neon colour grades. Each grade tints the sky, the sun and the
// photo panels, and sets the canvas filter applied to photos.
const GRADES = {
  sunset: {
    skyTop: '#2b0a4d', skyMid: '#c62b7e', skyLow: '#ff7a3d', sunA: '#ffe259', sunB: '#ff5e62',
    tint: '#ff5e8a', filter: 'saturate(1.35) contrast(1.08)', titleA: '#ffffff', titleB: '#ffd166',
  },
  neon: {
    skyTop: '#05001a', skyMid: '#5b0a8a', skyLow: '#ff2e88', sunA: '#21e6e0', sunB: '#ff2e88',
    tint: '#7b2fff', filter: 'saturate(1.6) contrast(1.12) hue-rotate(-12deg)', titleA: '#eafffb', titleB: '#21e6e0',
  },
  dusk: {
    skyTop: '#12082b', skyMid: '#7a2a6d', skyLow: '#ff9a5c', sunA: '#ffb02e', sunB: '#e63e62',
    tint: '#b06ab3', filter: 'saturate(1.15) contrast(1.05)', titleA: '#fff6e8', titleB: '#ffb02e',
  },
  noir: {
    skyTop: '#000000', skyMid: '#2a2a33', skyLow: '#8a8a99', sunA: '#e8e8f0', sunB: '#6a6a7a',
    tint: '#9a9ab0', filter: 'saturate(0) contrast(1.18)', titleA: '#ffffff', titleB: '#c9c9d6',
  },
};

const LAYOUTS = { hero: 1, triple: 3, duo: 3, quad: 4 };

const state = {
  layout: 'triple',
  grade: 'sunset',
  title: 'VICE NIGHTS',
  tagline: 'SUNSET · PALMS · NEON',
  footer: 'A POSTER MADE WITH VICE NIGHTS',
  photos: [], // { img, name }
  panels: [], // { photo, zoom, ox, oy } — one per layout slot
  selected: 0,
  exportSize: '1080x1350',
};

function defaultPanel(photo) {
  return { photo, zoom: 1, ox: 0, oy: 0 };
}

function ensurePanels() {
  const n = LAYOUTS[state.layout];
  while (state.panels.length < n) state.panels.push(defaultPanel(state.panels.length));
  state.panels.length = n;
  if (state.selected >= n) state.selected = 0;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('cannot load ' + url));
    img.src = url;
  });
}

async function loadSamples() {
  for (let i = 0; i < SAMPLE_URLS.length; i++) {
    try {
      const img = await loadImage(SAMPLE_URLS[i]);
      state.photos.push({ img, name: 'Sample ' + (i + 1) });
    } catch (err) { /* a missing sample just leaves the slot empty */ }
  }
  state.panels.forEach((p, i) => {
    if (p.photo >= state.photos.length) p.photo = -1;
    // A panel with no photo yet reuses the samples in turn, so every
    // layout (even four panels from three samples) is always full.
    if (p.photo < 0 && state.photos.length > 0) p.photo = i % state.photos.length;
  });
  refreshPhotoUI();
  render();
  setStatus('Samples loaded — pick a layout, crop a panel, then export your PNG.');
  window.__viceReady = true;
  document.title = 'READY — Vice Nights';
}

function addPhotoFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    loadImage(reader.result).then((img) => {
      state.photos.push({ img, name: file.name });
      refreshPhotoUI();
      render();
    });
  };
  reader.readAsDataURL(file);
}

// Deterministic pseudo-random numbers, so the same cover always draws the
// same skyline and stars.
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawSky(c, W, H, g) {
  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, g.skyTop);
  sky.addColorStop(0.45, g.skyMid);
  sky.addColorStop(0.75, g.skyLow);
  sky.addColorStop(1, '#1a051f');
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);
  // Stars in the upper sky.
  const rnd = mulberry32(11);
  c.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 70; i++) {
    const x = rnd() * W, y = rnd() * H * 0.32, r = rnd() * 1.8 + 0.5;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
}

function drawSun(c, W, H, g) {
  const cx = W * 0.5, cy = H * 0.16, r = Math.min(W, H) * 0.13;
  const sun = c.createLinearGradient(0, cy - r, 0, cy + r);
  sun.addColorStop(0, g.sunA);
  sun.addColorStop(1, g.sunB);
  c.fillStyle = sun;
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
  // Retro horizontal slits across the lower half of the sun.
  c.save();
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, g.skyTop); sky.addColorStop(0.45, g.skyMid); sky.addColorStop(0.75, g.skyLow);
  c.fillStyle = sky;
  for (let i = 0; i < 5; i++) {
    const y = cy + r * (0.05 + i * 0.17);
    c.fillRect(cx - r, y, r * 2, r * 0.035 + i * r * 0.012);
  }
  c.restore();
}

function drawSkyline(c, W, H, yBase) {
  const rnd = mulberry32(42);
  c.fillStyle = '#160a2e';
  let x = 0;
  while (x < W) {
    const bw = W * (0.05 + rnd() * 0.09);
    const bh = H * (0.05 + rnd() * 0.12);
    c.fillRect(x, yBase - bh, bw, bh);
    // A rooftop antenna on some towers.
    if (rnd() > 0.6) c.fillRect(x + bw * 0.5 - 1, yBase - bh - H * 0.03, 2, H * 0.03);
    x += bw + W * 0.008;
  }
  // Lit windows: pink and cyan dots.
  c.fillStyle = '#ff5e8a';
  for (let i = 0; i < 26; i++) c.fillRect(rnd() * W, yBase - rnd() * H * 0.12, 3, 4);
  c.fillStyle = '#21e6e0';
  for (let i = 0; i < 18; i++) c.fillRect(rnd() * W, yBase - rnd() * H * 0.12, 3, 4);
}

function drawPalm(c, x, y, s, lean) {
  c.save();
  c.translate(x, y);
  c.rotate(lean);
  c.scale(s, s);
  c.strokeStyle = '#12061f';
  c.lineWidth = 9;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(6, -60, 16, -110);
  c.stroke();
  c.lineWidth = 5;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (0.08 + i * 0.13);
    const tx = 16 + Math.cos(a) * 52;
    const ty = -110 + Math.sin(a) * 34 + i * 4;
    c.beginPath();
    c.moveTo(16, -110);
    c.quadraticCurveTo(16 + Math.cos(a) * 30, -110 + Math.sin(a) * 44, tx, ty);
    c.stroke();
  }
  c.restore();
}

// Panel rectangles for each layout. The panels sit in a content band
// between the sunset sky (top 30%, always visible) and the caption band
// (bottom 22%), with a small margin and gutters, so the sky, sun and
// skyline frame the collage instead of hiding behind it. The triple layout
// uses slanted dividers; the clip polygon for a panel is built in
// drawPanel from its slant value.
function layoutRects(W, H) {
  const x0 = W * 0.04, x1 = W * 0.96;
  const y0 = H * 0.30, y1 = H * 0.78;
  const cw = x1 - x0, ch = y1 - y0, gap = W * 0.015;
  if (state.layout === 'hero') return [{ x: x0, y: y0, w: cw, h: ch, slant: 0 }];
  if (state.layout === 'triple') {
    const w = (cw - 2 * gap) / 3;
    return [0, 1, 2].map((i) => ({ x: x0 + i * (w + gap), y: y0, w, h: ch, slant: w * 0.10 }));
  }
  if (state.layout === 'duo') {
    const lw = cw * 0.60, rw = cw - lw - gap;
    return [
      { x: x0, y: y0, w: lw, h: ch, slant: 0 },
      { x: x0 + lw + gap, y: y0, w: rw, h: (ch - gap) / 2, slant: 0 },
      { x: x0 + lw + gap, y: y0 + (ch + gap) / 2, w: rw, h: (ch - gap) / 2, slant: 0 },
    ];
  }
  const w = (cw - gap) / 2, h = (ch - gap) / 2;
  return [
    { x: x0, y: y0, w, h, slant: 0 },
    { x: x0 + w + gap, y: y0, w, h, slant: 0 },
    { x: x0, y: y0 + h + gap, w, h, slant: 0 },
    { x: x0 + w + gap, y: y0 + h + gap, w, h, slant: 0 },
  ];
}

function drawPanel(c, rect, panel, g, index) {
  const { x, y, w, h, slant } = rect;
  c.save();
  c.beginPath();
  if (slant) {
    c.moveTo(x + slant, y); c.lineTo(x + w, y); c.lineTo(x + w - slant, y + h); c.lineTo(x, y + h);
  } else {
    c.rect(x, y, w, h);
  }
  c.closePath();
  c.clip();
  const photo = state.photos[panel.photo];
  if (photo) {
    const iw = photo.img.naturalWidth, ih = photo.img.naturalHeight;
    const scale = Math.max(w / iw, h / ih) * panel.zoom;
    const dw = iw * scale, dh = ih * scale;
    const dx = x + (w - dw) / 2 + panel.ox * w * 0.22;
    const dy = y + (h - dh) / 2 + panel.oy * h * 0.22;
    c.filter = g.filter;
    c.drawImage(photo.img, dx, dy, dw, dh);
    c.filter = 'none';
  } else {
    // Empty panel: paint the sunset itself, so the cover is never blank.
    c.save();
    c.translate(x, y);
    drawSky(c, w, h, g);
    drawSun(c, w, h, g);
    c.restore();
  }
  // Sunset grade wash + a soft vignette, then the panel frame.
  c.globalCompositeOperation = 'overlay';
  c.globalAlpha = 0.28;
  c.fillStyle = g.tint;
  c.fillRect(x - slant, y, w + slant * 2, h);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  const vg = c.createLinearGradient(0, y, 0, y + h);
  vg.addColorStop(0, 'rgba(10,2,20,0.10)');
  vg.addColorStop(1, 'rgba(10,2,20,0.42)');
  c.fillStyle = vg;
  c.fillRect(x - slant, y, w + slant * 2, h);
  c.restore();
  c.save();
  c.strokeStyle = '#ffffff';
  c.lineWidth = Math.max(3, w * 0.008);
  c.beginPath();
  if (slant) {
    c.moveTo(x + slant, y); c.lineTo(x + w, y); c.lineTo(x + w - slant, y + h); c.lineTo(x, y + h);
  } else {
    c.rect(x, y, w, h);
  }
  c.closePath(); c.stroke();
  c.restore();
  // The dashed selection outline is editor chrome only: never draw it on
  // an exported PNG or in cover-only screenshot mode.
  if (index === state.selected && !hideSelection) {
    c.save();
    c.strokeStyle = '#21e6e0';
    c.lineWidth = 4;
    c.setLineDash([14, 8]);
    c.strokeRect(x + 5, y + 5, w - 10, h - 10);
    c.restore();
  }
}

// The canvas size of the cover currently being drawn, and whether the
// editor's selection outline is hidden (exports and cover screenshots).
let W0 = 1080, H0 = 1350;
let hideSelection = false;

function drawCaption(c, W, H, g) {
  const bandY = H * 0.78;
  const band = c.createLinearGradient(0, bandY, 0, H);
  band.addColorStop(0, 'rgba(12,3,26,0)');
  band.addColorStop(0.25, 'rgba(12,3,26,0.88)');
  band.addColorStop(1, '#0c031a');
  c.fillStyle = band;
  c.fillRect(0, bandY, W, H - bandY);
  // Neon rule above the title.
  const rule = c.createLinearGradient(0, 0, W, 0);
  rule.addColorStop(0, '#ff2e88'); rule.addColorStop(0.5, '#ffb02e'); rule.addColorStop(1, '#21e6e0');
  c.fillStyle = rule;
  c.fillRect(W * 0.06, bandY + H * 0.035, W * 0.88, Math.max(4, H * 0.006));
  // Title: huge, outlined, gradient-filled, letterspaced.
  const size = Math.min(W * 0.115, (H * 0.085));
  c.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  try { c.letterSpacing = `${Math.max(2, W * 0.004)}px`; } catch (err) { /* older Chrome */ }
  const titleGrad = c.createLinearGradient(0, bandY + H * 0.05, 0, bandY + H * 0.16);
  titleGrad.addColorStop(0, g.titleA);
  titleGrad.addColorStop(1, g.titleB);
  const ty = bandY + H * 0.105;
  c.lineJoin = 'round';
  c.strokeStyle = '#12061f';
  c.lineWidth = size * 0.14;
  c.strokeText(state.title, W / 2, ty);
  c.fillStyle = titleGrad;
  c.fillText(state.title, W / 2, ty);
  // Tagline in spaced capitals.
  c.font = `700 ${Math.max(13, W * 0.024)}px Arial, sans-serif`;
  try { c.letterSpacing = `${Math.max(3, W * 0.008)}px`; } catch (err) { /* older Chrome */ }
  c.fillStyle = '#21e6e0';
  c.fillText(state.tagline, W / 2, bandY + H * 0.165);
  c.font = `400 ${Math.max(11, W * 0.016)}px Arial, sans-serif`;
  c.fillStyle = 'rgba(244,238,252,0.75)';
  try { c.letterSpacing = `${Math.max(2, W * 0.005)}px`; } catch (err) { /* older Chrome */ }
  c.fillText(state.footer, W / 2, H - H * 0.022);
  try { c.letterSpacing = '0px'; } catch (err) { /* older Chrome */ }
}

function renderCover(target, W, H) {
  const c = target.getContext('2d');
  if (target.width !== W) target.width = W;
  if (target.height !== H) target.height = H;
  W0 = W; H0 = H;
  const g = GRADES[state.grade];
  ensurePanels();
  drawSky(c, W, H, g);
  drawSun(c, W, H, g);
  // Skyline rises from behind the panels, palms frame them in front.
  drawSkyline(c, W, H, H * 0.305);
  layoutRects(W, H).forEach((rect, i) => drawPanel(c, rect, state.panels[i], g, i));
  drawPalm(c, W * 0.045, H * 0.80, W / 900, -0.12);
  drawPalm(c, W * 0.955, H * 0.80, W / 1050, 0.14);
  drawCaption(c, W, H, g);
}

function render() {
  const [w, h] = state.exportSize.split('x').map(Number);
  renderCover(canvas, w, h);
}

// --------------------------------------------------------------- UI wiring

function refreshPhotoUI() {
  const strip = $('photo-strip');
  strip.innerHTML = '';
  state.photos.forEach((p, i) => {
    const thumb = document.createElement('img');
    thumb.className = 'thumb' + (state.panels.some((q) => q.photo === i) ? ' used' : '');
    thumb.src = p.img.src;
    thumb.alt = p.name;
    thumb.title = p.name + ' — click to use in the selected panel';
    thumb.addEventListener('click', () => {
      state.panels[state.selected].photo = i;
      refreshPhotoUI();
      render();
    });
    strip.appendChild(thumb);
  });
  const sel = $('panel-photo');
  sel.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '-1';
  empty.textContent = '— sunset only —';
  sel.appendChild(empty);
  state.photos.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = p.name;
    sel.appendChild(opt);
  });
  sel.value = String(state.panels[state.selected].photo);
}

function refreshPanelControls() {
  const p = state.panels[state.selected];
  $('panel-photo').value = String(p.photo);
  $('zoom').value = String(Math.round(p.zoom * 100));
  $('zoom-val').textContent = Math.round(p.zoom * 100) + '%';
  $('pan-x').value = String(Math.round(p.ox * 100));
  $('pan-y').value = String(Math.round(p.oy * 100));
}

function setStatus(text) {
  $('status').textContent = text;
}

function exportPng() {
  const [w, h] = state.exportSize.split('x').map(Number);
  const off = document.createElement('canvas');
  hideSelection = true;
  renderCover(off, w, h);
  hideSelection = false;
  off.toBlob((blob) => {
    if (!blob) { setStatus('Export failed — please try again.'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vice-nights-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setStatus(`Exported vice-nights-${w}x${h}.png — share it anywhere.`);
  }, 'image/png');
}

function pickPanelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const x = ((clientX - r.left) / r.width) * canvas.width;
  const y = ((clientY - r.top) / r.height) * canvas.height;
  const rects = layoutRects(canvas.width, canvas.height);
  for (let i = 0; i < rects.length; i++) {
    const q = rects[i];
    if (x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h) {
      state.selected = i;
      refreshPanelControls();
      render();
      setStatus(`Panel ${i + 1} selected — crop it with the sliders.`);
      return;
    }
  }
}

function bindUI() {
  $('file-input').addEventListener('change', (e) => {
    [...e.target.files].forEach(addPhotoFile);
    e.target.value = '';
  });
  $('samples-btn').addEventListener('click', () => {
    if (state.photos.length === 0) loadSamples();
    else setStatus('Samples are already loaded — add your own photos above.');
  });
  $('clear-btn').addEventListener('click', () => {
    state.photos = [];
    state.panels.forEach((p) => { p.photo = -1; });
    refreshPhotoUI();
    render();
    setStatus('Cleared. Add a photo or load the samples.');
  });
  $('panel-photo').addEventListener('change', (e) => {
    state.panels[state.selected].photo = Number(e.target.value);
    refreshPhotoUI();
    render();
  });
  $('zoom').addEventListener('input', (e) => {
    state.panels[state.selected].zoom = Number(e.target.value) / 100;
    $('zoom-val').textContent = e.target.value + '%';
    render();
  });
  $('pan-x').addEventListener('input', (e) => {
    state.panels[state.selected].ox = Number(e.target.value) / 100;
    render();
  });
  $('pan-y').addEventListener('input', (e) => {
    state.panels[state.selected].oy = Number(e.target.value) / 100;
    render();
  });
  document.querySelectorAll('#layout-btns button').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#layout-btns button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      state.layout = b.dataset.layout;
      ensurePanels();
      refreshPhotoUI();
      refreshPanelControls();
      render();
    });
  });
  document.querySelectorAll('#grade-btns button').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#grade-btns button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      state.grade = b.dataset.grade;
      render();
    });
  });
  $('title').addEventListener('input', (e) => { state.title = e.target.value.toUpperCase() || 'VICE NIGHTS'; render(); });
  $('tagline').addEventListener('input', (e) => { state.tagline = e.target.value.toUpperCase(); render(); });
  $('footer').addEventListener('input', (e) => { state.footer = e.target.value.toUpperCase(); render(); });
  $('export-size').addEventListener('change', (e) => { state.exportSize = e.target.value; render(); });
  $('export-btn').addEventListener('click', exportPng);
  canvas.addEventListener('click', (e) => pickPanelAt(e.clientX, e.clientY));
}

// Screenshot mode (?shot=cover) hides the editor and shows only the cover,
// so a headless browser can capture exactly what the app exports.
function applyShotMode() {
  const q = new URLSearchParams(location.search);
  if (q.get('layout')) state.layout = q.get('layout');
  if (q.get('grade')) state.grade = q.get('grade');
  if (q.get('title')) state.title = q.get('title').toUpperCase();
  if (q.get('size')) state.exportSize = q.get('size');
  document.querySelectorAll('#layout-btns button').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('#grade-btns button').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  if (q.get('shot') === 'cover') {
    hideSelection = true;
    document.body.classList.add('cover-only');
  }
}

ensurePanels();
bindUI();
applyShotMode();
refreshPhotoUI();
refreshPanelControls();
render();
setStatus('Loading sample photos…');
loadSamples();
