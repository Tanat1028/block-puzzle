'use strict';

// ===== Настройки =====
const SIZE = 8;                       // поле 8x8
const COLORS = ['#e8483f', '#f39a2b', '#f5c936', '#5ac451', '#3fc3e8', '#3f6ee8', '#9a55e0'];
const STORAGE_KEY = 'blockpuzzle-save-v1';
const BEST_KEY = 'blockpuzzle-best';
const SETTINGS_KEY = 'blockpuzzle-settings';

// Фигуры: список клеток [строка, столбец]. Второе число — вес (как часто выпадает).
const SHAPES = [
  [[[0, 0]], 2],                                                    // точка
  [[[0, 0], [0, 1]], 3],                                            // 2 в ряд
  [[[0, 0], [1, 0]], 3],
  [[[0, 0], [0, 1], [0, 2]], 4],                                    // 3 в ряд
  [[[0, 0], [1, 0], [2, 0]], 4],
  [[[0, 0], [0, 1], [0, 2], [0, 3]], 3],                            // 4 в ряд
  [[[0, 0], [1, 0], [2, 0], [3, 0]], 3],
  [[[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], 2],                    // 5 в ряд
  [[[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], 2],
  [[[0, 0], [0, 1], [1, 0], [1, 1]], 5],                            // квадрат 2x2
  [[[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]], 2],            // 2x3
  [[[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]], 2],            // 3x2
  [[[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], 1], // 3x3
  [[[0, 0], [1, 0], [1, 1]], 2],                                    // маленький уголок (4 поворота)
  [[[0, 1], [1, 0], [1, 1]], 2],
  [[[0, 0], [0, 1], [1, 0]], 2],
  [[[0, 0], [0, 1], [1, 1]], 2],
  [[[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], 1],                    // большой уголок (4 поворота)
  [[[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]], 1],
  [[[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]], 1],
  [[[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], 1],
  [[[0, 0], [1, 0], [2, 0], [2, 1]], 2],                            // L (8 вариантов)
  [[[0, 1], [1, 1], [2, 1], [2, 0]], 2],
  [[[0, 0], [0, 1], [1, 1], [2, 1]], 2],
  [[[0, 0], [0, 1], [1, 0], [2, 0]], 2],
  [[[0, 0], [0, 1], [0, 2], [1, 0]], 2],
  [[[0, 0], [0, 1], [0, 2], [1, 2]], 2],
  [[[0, 0], [1, 0], [1, 1], [1, 2]], 2],
  [[[0, 2], [1, 0], [1, 1], [1, 2]], 2],
  [[[0, 0], [0, 1], [0, 2], [1, 1]], 2],                            // T (4 поворота)
  [[[0, 1], [1, 0], [1, 1], [1, 2]], 2],
  [[[0, 0], [1, 0], [1, 1], [2, 0]], 2],
  [[[0, 1], [1, 0], [1, 1], [2, 1]], 2],
  [[[0, 0], [0, 1], [1, 1], [1, 2]], 2],                            // S / Z
  [[[0, 1], [0, 2], [1, 0], [1, 1]], 2],
  [[[0, 0], [1, 0], [1, 1], [2, 1]], 2],
  [[[0, 1], [1, 0], [1, 1], [2, 0]], 2],
  [[[0, 0], [1, 1]], 1],                                            // диагонали
  [[[0, 1], [1, 0]], 1],
  [[[0, 0], [1, 1], [2, 2]], 1],
  [[[0, 2], [1, 1], [2, 0]], 1],
];
const TOTAL_WEIGHT = SHAPES.reduce((s, [, w]) => s + w, 0);

// ===== Состояние игры =====
let board;        // board[r][c] = цвет или null
let tray;         // 3 фигуры или null (уже поставлена)
let score, combo, movesSinceClear;
let best = Number(localStorage.getItem(BEST_KEY) || 0);
let gameOver = false;
let settings = { sound: true, vibro: true };
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) {}

// Анимации
let effects = [];     // исчезающие клетки
let texts = [];       // всплывающие надписи
let traySpawnTime = 0;

// Перетаскивание
let drag = null;      // { idx, x, y, lift, pointerId }

// ===== Canvas и размеры =====
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let L = {};           // рассчитанная раскладка

function layout() {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const boardSize = Math.min(w - 24, h * 0.62, 520);
  const cell = boardSize / SIZE;
  const boardX = (w - boardSize) / 2;
  const boardY = 4;
  const trayTop = boardY + boardSize + 20;
  const trayH = Math.max(h - trayTop - 8, cell * 2.6);
  const slotW = boardSize / 3;
  L = { w, h, cell, boardSize, boardX, boardY, trayTop, trayH, slotW, trayCell: cell * 0.55 };
}

// ===== Фигуры =====
function randomShape() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const [cells, w] of SHAPES) {
    r -= w;
    if (r <= 0) return cells;
  }
  return SHAPES[0][0];
}

function makePiece(cells) {
  const rows = Math.max(...cells.map(p => p[0])) + 1;
  const cols = Math.max(...cells.map(p => p[1])) + 1;
  return { cells, rows, cols, color: COLORS[Math.floor(Math.random() * COLORS.length)] };
}

function canPlace(piece, row, col, b = board) {
  for (const [r, c] of piece.cells) {
    const rr = row + r, cc = col + c;
    if (rr < 0 || cc < 0 || rr >= SIZE || cc >= SIZE || b[rr][cc]) return false;
  }
  return true;
}

function fitsAnywhere(piece, b = board) {
  for (let r = 0; r <= SIZE - piece.rows; r++)
    for (let c = 0; c <= SIZE - piece.cols; c++)
      if (canPlace(piece, r, c, b)) return true;
  return false;
}

// Новый набор из трёх фигур. Стараемся, чтобы каждая фигура влезала на поле,
// но если за 30 попыток не вышло — выдаём как есть (так игра может закончиться).
function newTray() {
  let set;
  for (let attempt = 0; attempt < 30; attempt++) {
    set = [makePiece(randomShape()), makePiece(randomShape()), makePiece(randomShape())];
    if (set.every(p => fitsAnywhere(p))) break;
  }
  tray = set;
  traySpawnTime = performance.now();
}

// Какие строки/столбцы заполнятся, если поставить фигуру сюда
function linesAfter(piece, row, col) {
  const filled = (r, c) => board[r][c] || piece.cells.some(([pr, pc]) => pr + row === r && pc + col === c);
  const rows = [], cols = [];
  for (let r = 0; r < SIZE; r++) {
    let full = true;
    for (let c = 0; c < SIZE; c++) if (!filled(r, c)) { full = false; break; }
    if (full) rows.push(r);
  }
  for (let c = 0; c < SIZE; c++) {
    let full = true;
    for (let r = 0; r < SIZE; r++) if (!filled(r, c)) { full = false; break; }
    if (full) cols.push(c);
  }
  return { rows, cols };
}

// ===== Ходы =====
function placePiece(idx, row, col) {
  const piece = tray[idx];
  const { rows, cols } = linesAfter(piece, row, col);

  for (const [r, c] of piece.cells) board[row + r][col + c] = piece.color;
  tray[idx] = null;

  let gained = piece.cells.length;           // 1 очко за каждую клетку
  const lines = rows.length + cols.length;

  if (lines > 0) {
    combo++;
    movesSinceClear = 0;

    const now = performance.now();
    const cleared = new Set();
    for (const r of rows) for (let c = 0; c < SIZE; c++) cleared.add(r * SIZE + c);
    for (const c of cols) for (let r = 0; r < SIZE; r++) cleared.add(r * SIZE + c);
    for (const k of cleared) {
      const r = Math.floor(k / SIZE), c = k % SIZE;
      effects.push({ r, c, color: board[r][c], t0: now + Math.random() * 60 });
      board[r][c] = null;
    }

    // Очки за линии: 10 * линии^2, умножается на комбо
    const lineScore = 10 * lines * lines * combo;
    gained += lineScore;

    const cx = L.boardX + (col + piece.cols / 2) * L.cell;
    const cy = L.boardY + (row + piece.rows / 2) * L.cell;
    const msgs = ['', 'Хорошо!', 'Отлично!', 'Супер!', 'Потрясающе!', 'Невероятно!'];
    texts.push({ text: '+' + lineScore, x: cx, y: cy, t0: now, size: 30 });
    if (combo > 1) texts.push({ text: 'Комбо ×' + combo, x: L.w / 2, y: L.boardY + L.boardSize * 0.35, t0: now, size: 34, color: '#ffd84a' });
    if (lines >= 2) texts.push({ text: msgs[Math.min(lines, msgs.length - 1)], x: L.w / 2, y: L.boardY + L.boardSize * 0.5, t0: now + 80, size: 40, color: '#7ef08a' });

    if (board.every(row => row.every(v => !v))) {
      gained += 300;
      texts.push({ text: 'Поле очищено! +300', x: L.w / 2, y: L.boardY + L.boardSize * 0.65, t0: now + 150, size: 30, color: '#6fd7ff' });
    }
    sound(lines > 1 ? 'big' : 'clear');
    vibrate(lines > 1 ? [20, 40, 30] : 25);
  } else {
    movesSinceClear++;
    if (movesSinceClear >= 3) combo = 0;   // серия прерывается после 3 ходов без очистки
    sound('place');
    vibrate(10);
  }

  addScore(gained);
  if (tray.every(p => !p)) newTray();
  save();
  checkGameOver();
}

function addScore(n) {
  score += n;
  scoreEl.textContent = score;
  scoreEl.classList.remove('bump');
  void scoreEl.offsetWidth;
  scoreEl.classList.add('bump');
  setTimeout(() => scoreEl.classList.remove('bump'), 150);
  if (score > startBest) newBestThisGame = true;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
    localStorage.setItem(BEST_KEY, best);
  }
}

function checkGameOver() {
  const left = tray.filter(p => p);
  if (left.length && !left.some(p => fitsAnywhere(p))) {
    gameOver = true;
    localStorage.removeItem(STORAGE_KEY);
    setTimeout(() => {
      sound('over');
      document.getElementById('ovScore').textContent = score;
      document.getElementById('ovBest').textContent = best;
      document.getElementById('ovNewBest').classList.toggle('hidden', !newBestThisGame);
      overlay.classList.remove('hidden');
    }, 700);
  }
}

let newBestThisGame = false;
let startBest = best;

function newGame() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  score = 0; combo = 0; movesSinceClear = 0;
  gameOver = false;
  effects = []; texts = [];
  startBest = best;
  newBestThisGame = false;
  newTray();
  scoreEl.textContent = 0;
  overlay.classList.add('hidden');
  save();
}

// ===== Сохранение (чтобы игра продолжалась после закрытия) =====
function save() {
  if (gameOver) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ board, tray, score, combo, movesSinceClear }));
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!s || !s.board) return false;
    ({ board, tray, score, combo, movesSinceClear } = s);
    scoreEl.textContent = score;
    startBest = best;
    return true;
  } catch (e) { return false; }
}

// ===== Звук и вибрация =====
let audio;
function sound(type) {
  if (!settings.sound) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const notes = { place: [330], clear: [523, 659], big: [523, 659, 784, 1047], over: [392, 330, 262] }[type];
    const step = type === 'over' ? 0.18 : 0.07;
    notes.forEach((f, i) => {
      const t = audio.currentTime + i * step;
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = type === 'place' ? 'triangle' : 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (type === 'place' ? 0.08 : 0.25));
      o.connect(g).connect(audio.destination);
      o.start(t); o.stop(t + 0.3);
    });
  } catch (e) {}
}

function vibrate(p) {
  if (settings.vibro && navigator.vibrate) navigator.vibrate(p);
}

// ===== Рисование =====
function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(v + amt * (amt > 0 ? 255 - v : v))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// Один кубик с объёмом: светлый верх, тёмный низ
function drawBlock(x, y, s, color, alpha = 1) {
  const g = Math.max(1, s * 0.04);
  x += g; y += g; s -= g * 2;
  if (s < 2) return;              // слишком маленький (в начале анимации)
  const r = s * 0.14, b = s * 0.12;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = shade(color, -0.35); rr(x, y, s, s, r); ctx.fill();
  ctx.fillStyle = shade(color, 0.35); rr(x, y, s, s - b, r); ctx.fill();
  ctx.fillStyle = color; rr(x + b * 0.7, y + b * 0.7, s - b * 1.4, s - b * 1.9, r * 0.7); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawBoard() {
  const { boardX: bx, boardY: by, boardSize: bs, cell } = L;
  ctx.fillStyle = '#16224a';
  rr(bx - 6, by - 6, bs + 12, bs + 12, 12); ctx.fill();
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      ctx.fillStyle = '#212f5e';
      rr(bx + c * cell + 1.5, by + r * cell + 1.5, cell - 3, cell - 3, cell * 0.12);
      ctx.fill();
    }

  // Подсветка: куда встанет фигура и какие линии очистятся
  const hint = dragTarget();
  let lineColor = null, lr = [], lc = [];
  if (hint) {
    const p = tray[drag.idx];
    ({ rows: lr, cols: lc } = linesAfter(p, hint.row, hint.col));
    if (lr.length || lc.length) lineColor = p.color;
  }

  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      const v = board[r][c];
      if (!v) continue;
      const inLine = lineColor && (lr.includes(r) || lc.includes(c));
      drawBlock(bx + c * cell, by + r * cell, cell, inLine ? lineColor : v);
    }

  if (hint) {
    const p = tray[drag.idx];
    for (const [r, c] of p.cells) {
      const R = hint.row + r, C = hint.col + c;
      const inLine = lineColor && (lr.includes(R) || lc.includes(C));
      drawBlock(bx + C * cell, by + R * cell, cell, p.color, inLine ? 1 : 0.45);
    }
  }
}

function drawPiece(p, cx, cy, s, alpha = 1) {
  const x0 = cx - (p.cols * s) / 2, y0 = cy - (p.rows * s) / 2;
  for (const [r, c] of p.cells) drawBlock(x0 + c * s, y0 + r * s, s, p.color, alpha);
}

function slotCenter(i) {
  return { x: L.boardX + L.slotW * (i + 0.5), y: L.trayTop + Math.min(L.trayH, L.cell * 3.2) / 2 };
}

function drawTray(now) {
  const k = Math.min(1, (now - traySpawnTime) / 250);
  const ease = 1 - Math.pow(1 - k, 3);
  for (let i = 0; i < 3; i++) {
    const p = tray[i];
    if (!p || (drag && drag.idx === i)) continue;
    const { x, y } = slotCenter(i);
    const fits = gameOver || fitsAnywhere(p);
    drawPiece(p, x, y, L.trayCell * ease, fits ? 1 : 0.35);
  }
}

function drawDrag() {
  if (!drag) return;
  const p = tray[drag.idx];
  const { x, y } = dragPieceCenter();
  drawPiece(p, x, y, L.cell * 0.96);
}

function drawEffects(now) {
  effects = effects.filter(e => now - e.t0 < 400);
  for (const e of effects) {
    const t = Math.max(0, (now - e.t0) / 400);
    const s = L.cell * (1 - t * 0.8);
    const x = L.boardX + e.c * L.cell + (L.cell - s) / 2;
    const y = L.boardY + e.r * L.cell + (L.cell - s) / 2 - t * 10;
    drawBlock(x, y, s, e.color, 1 - t);
  }
  texts = texts.filter(t => now - t.t0 < 1100);
  for (const t of texts) {
    const k = (now - t.t0) / 1100;
    if (k < 0) continue;
    const scale = k < 0.15 ? 0.6 + k / 0.15 * 0.4 : 1;
    ctx.save();
    ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    ctx.font = `800 ${t.size * scale}px -apple-system, Segoe UI, Roboto, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,.35)';
    const y = t.y - k * 40;
    ctx.strokeText(t.text, t.x, y);
    ctx.fillStyle = t.color || '#fff';
    ctx.fillText(t.text, t.x, y);
    ctx.restore();
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  try {
    ctx.clearRect(0, 0, L.w, L.h);
    drawBoard();
    drawEffects(now);
    drawTray(now);
    drawDrag();
  } catch (e) { console.error(e); }
}

// ===== Управление (палец и мышь) =====
function dragPieceCenter() {
  const p = tray[drag.idx];
  return { x: drag.x, y: drag.y - drag.lift - (p.rows * L.cell) / 2 };
}

function dragTarget() {
  if (!drag) return null;
  const p = tray[drag.idx];
  const { x, y } = dragPieceCenter();
  const col = Math.round((x - (p.cols * L.cell) / 2 - L.boardX) / L.cell);
  const row = Math.round((y - (p.rows * L.cell) / 2 - L.boardY) / L.cell);
  return canPlace(p, row, col) ? { row, col } : null;
}

function pos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener('pointerdown', e => {
  if (gameOver || drag) return;
  const { x, y } = pos(e);
  if (y < L.trayTop - 10) return;
  const i = Math.floor((x - L.boardX) / L.slotW);
  if (i < 0 || i > 2 || !tray[i]) return;
  // на телефоне поднимаем фигуру над пальцем, чтобы её было видно
  drag = { idx: i, x, y, lift: e.pointerType === 'mouse' ? 0 : L.cell * 1.3, pointerId: e.pointerId };
  canvas.setPointerCapture(e.pointerId);
  vibrate(5);
});

canvas.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.pointerId) return;
  Object.assign(drag, pos(e));
});

function endDrag(e) {
  if (!drag || e.pointerId !== drag.pointerId) return;
  Object.assign(drag, pos(e));
  const t = dragTarget();
  const idx = drag.idx;
  drag = null;
  if (t) placePiece(idx, t.row, t.col);
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', e => { if (drag && e.pointerId === drag.pointerId) drag = null; });

// ===== Интерфейс =====
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const menu = document.getElementById('menu');

document.getElementById('restartBtn').onclick = newGame;
document.getElementById('menuBtn').onclick = () => menu.classList.remove('hidden');
document.getElementById('resumeBtn').onclick = () => menu.classList.add('hidden');
document.getElementById('newGameBtn').onclick = () => { menu.classList.add('hidden'); newGame(); };

const soundToggle = document.getElementById('soundToggle');
const vibroToggle = document.getElementById('vibroToggle');
soundToggle.checked = settings.sound;
vibroToggle.checked = settings.vibro;
soundToggle.onchange = () => { settings.sound = soundToggle.checked; localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); };
vibroToggle.onchange = () => { settings.vibro = vibroToggle.checked; localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); };

// ===== Старт =====
window.addEventListener('resize', layout);
layout();
bestEl.textContent = best;
if (!load()) newGame();
else checkGameOver();
frame(performance.now());
