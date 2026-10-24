const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const targetEl = document.getElementById('target');
const livesEl = document.getElementById('lives');
const objectiveEl = document.getElementById('objective');
const statusTextEl = document.getElementById('statusText');
const progressBar = document.getElementById('progressBar');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

const COLS = 8;
const ROWS = 12;
const CELL_SIZE = 32;
const EMPTY = '#0c1d2a';
const GRID = '#183244';
const COLORS = ['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0', '#9b5de5', '#f15bb5', '#72efdd'];

const SHAPES = [
  { matrix: [[1, 1]] },
  { matrix: [[1, 1, 1]] },
  { matrix: [[1, 1], [1, 1]] },
  { matrix: [[1, 0, 0], [1, 1, 1]] },
  { matrix: [[1, 1, 1], [0, 1, 0]] },
  { matrix: [[1, 1, 0], [0, 1, 1]] },
  { matrix: [[0, 1, 1], [1, 1, 0]] },
  { matrix: [[1]] }
];

let board = [];
let activePiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lives = 3;
let targetScore = 80;
let progress = 0;
let challengeGoal = 3;
let gameRunning = false;
let dropDelay = 700;
let lastFrame = 0;
let animationFrameId = null;
let statusText = 'Hazır';

function makeBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function randomPiece() {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  return {
    matrix: cloneMatrix(shape.matrix),
    color: COLORS[Math.floor(Math.random() * COLORS.length)]
  };
}

function setStatus(message) {
  statusText = message;
  statusTextEl.textContent = message;
}

function updateHud() {
  scoreEl.textContent = String(score);
  levelEl.textContent = String(level);
  targetEl.textContent = String(targetScore);
  livesEl.textContent = String(lives);
  objectiveEl.textContent = `${challengeGoal} satır tamamla`;
  progressBar.style.width = `${Math.min((progress / challengeGoal) * 100, 100)}%`;
  statusTextEl.textContent = statusText;
}

function resetGame() {
  board = makeBoard();
  score = 0;
  level = 1;
  lives = 3;
  targetScore = 80;
  progress = 0;
  challengeGoal = 3;
  dropDelay = 700;
  nextPiece = randomPiece();
  statusText = 'Yeni oyun başlatıldı';
  spawnPiece();
  updateHud();
  draw();
}

function startGame() {
  if (gameRunning) return;
  gameRunning = true;
  setStatus('Oyun başladı');
  updateHud();
  animationFrameId = requestAnimationFrame(gameLoop);
}

function endGame() {
  gameRunning = false;
  setStatus('Oyun bitti - Yeniden başla');
  updateHud();
  cancelAnimationFrame(animationFrameId);
}

function canPlace(matrix, x, y) {
  for (let row = 0; row < matrix.length; row += 1) {
    for (let col = 0; col < matrix[row].length; col += 1) {
      if (!matrix[row][col]) continue;

      const bx = x + col;
      const by = y + row;

      if (bx < 0 || bx >= COLS || by >= ROWS) return false;
      if (by >= 0 && board[by][bx]) return false;
    }
  }
  return true;
}

function spawnPiece() {
  const piece = nextPiece || randomPiece();
  const matrix = cloneMatrix(piece.matrix);

  activePiece = {
    matrix,
    color: piece.color,
    x: Math.floor(COLS / 2) - Math.ceil(matrix[0].length / 2),
    y: -1
  };

  nextPiece = randomPiece();
  drawNextPiece();

  if (!canPlace(activePiece.matrix, activePiece.x, activePiece.y)) {
    lives -= 1;
    setStatus(`Yer kalmadı! Kalan can: ${lives}`);
    if (lives <= 0) {
      endGame();
      return;
    }
    clearTopArea();
    spawnPiece();
  }
}

function clearTopArea() {
  for (let y = 0; y < 2; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      board[y][x] = null;
    }
  }
}

function mergePiece() {
  for (let row = 0; row < activePiece.matrix.length; row += 1) {
    for (let col = 0; col < activePiece.matrix[row].length; col += 1) {
      if (!activePiece.matrix[row][col]) continue;
      const x = activePiece.x + col;
      const y = activePiece.y + row;
      if (y >= 0) board[y][x] = activePiece.color;
    }
  }
}

function clearLines() {
  let cleared = 0;

  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (board[row].every(Boolean)) {
      board.splice(row, 1);
      board.unshift(Array(COLS).fill(null));
      cleared += 1;
      row += 1;
    }
  }

  if (cleared > 0) {
    score += cleared * 20;
    progress += cleared;
    setStatus(`${cleared} satır temizlendi`);

    if (progress >= challengeGoal) {
      level += 1;
      progress = 0;
      challengeGoal += 1 + Math.floor(level / 2);
      score += 50;
      dropDelay = Math.max(180, dropDelay - 35);
      setStatus(`Seviye ${level}! Zorluk arttı`);
    }

    if (score >= targetScore) {
      targetScore += 80 + level * 20;
      setStatus('Hedef aşıldı');
    }
  }
}

function lockPiece() {
  mergePiece();
  clearLines();
  spawnPiece();
  updateHud();
}

function movePiece(dx, dy) {
  if (!activePiece || !gameRunning) return false;

  const nextX = activePiece.x + dx;
  const nextY = activePiece.y + dy;

  if (canPlace(activePiece.matrix, nextX, nextY)) {
    activePiece.x = nextX;
    activePiece.y = nextY;
    return true;
  }

  if (dy > 0) {
    lockPiece();
    return false;
  }

  return false;
}

function rotateMatrix(matrix) {
  const rowCount = matrix.length;
  const colCount = matrix[0].length;
  const rotated = Array.from({ length: colCount }, () => Array(rowCount).fill(0));

  for (let y = 0; y < rowCount; y += 1) {
    for (let x = 0; x < colCount; x += 1) {
      rotated[x][rowCount - 1 - y] = matrix[y][x];
    }
  }

  return rotated;
}

function rotatePiece() {
  if (!activePiece || !gameRunning) return;
  const rotated = rotateMatrix(activePiece.matrix);
  const kicks = [0, 1, -1, 2, -2, 3, -3];

  for (const kick of kicks) {
    if (canPlace(rotated, activePiece.x + kick, activePiece.y)) {
      activePiece.matrix = rotated;
      activePiece.x += kick;
      return;
    }
  }
}

function drawGrid() {
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      ctx.fillStyle = EMPTY;
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = GRID;
      ctx.strokeRect(x * CELL_SIZE + 0.5, y * CELL_SIZE + 0.5, CELL_SIZE, CELL_SIZE);
    }
  }
}

function drawBoard() {
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const color = board[y][x];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.strokeRect(x * CELL_SIZE + 2.5, y * CELL_SIZE + 2.5, CELL_SIZE - 5, CELL_SIZE - 5);
    }
  }
}

function drawActivePiece() {
  if (!activePiece) return;

  for (let row = 0; row < activePiece.matrix.length; row += 1) {
    for (let col = 0; col < activePiece.matrix[row].length; col += 1) {
      if (!activePiece.matrix[row][col]) continue;
      const x = (activePiece.x + col) * CELL_SIZE;
      const y = (activePiece.y + row) * CELL_SIZE;
      if (y < 0) continue;
      ctx.fillStyle = activePiece.color;
      ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.strokeRect(x + 2.5, y + 2.5, CELL_SIZE - 5, CELL_SIZE - 5);
    }
  }
}

function drawNextPiece() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextCtx.fillStyle = '#081b26';
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  if (!nextPiece) return;

  const matrix = nextPiece.matrix;
  const size = 22;
  const offsetX = (nextCanvas.width - matrix[0].length * size) / 2;
  const offsetY = (nextCanvas.height - matrix.length * size) / 2;

  for (let row = 0; row < matrix.length; row += 1) {
    for (let col = 0; col < matrix[row].length; col += 1) {
      if (!matrix[row][col]) continue;
      nextCtx.fillStyle = nextPiece.color;
      nextCtx.fillRect(offsetX + col * size, offsetY + row * size, size - 4, size - 4);
      nextCtx.strokeStyle = 'rgba(255,255,255,0.18)';
      nextCtx.strokeRect(offsetX + col * size + 1, offsetY + row * size + 1, size - 6, size - 6);
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawBoard();
  drawActivePiece();
}

function gameLoop(timestamp) {
  if (!gameRunning) return;

  if (!lastFrame) lastFrame = timestamp;
  const delta = timestamp - lastFrame;
  lastFrame = timestamp;

  if (delta >= dropDelay) {
    movePiece(0, 1);
  }

  draw();
  animationFrameId = requestAnimationFrame(gameLoop);
}

function handlePointer(event) {
  if (!gameRunning || !activePiece) return;

  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);

  const boardX = Math.floor(x / CELL_SIZE);
  const boardY = Math.floor(y / CELL_SIZE);

  if (boardX < 0 || boardY < 0 || boardX >= COLS || boardY >= ROWS) return;

  const targetX = boardX - Math.floor(activePiece.matrix[0].length / 2);
  const targetY = boardY - Math.floor(activePiece.matrix.length / 2);

  if (canPlace(activePiece.matrix, targetX, targetY)) {
    activePiece.x = targetX;
    activePiece.y = targetY;
    lockPiece();
  } else {
    setStatus('Bu alana yerleşemez');
    updateHud();
  }
}

window.addEventListener('keydown', (event) => {
  if (!gameRunning) return;

  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    movePiece(-1, 0);
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    movePiece(1, 0);
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    movePiece(0, 1);
  }

  if (event.key === ' ' || event.key === 'ArrowUp') {
    event.preventDefault();
    rotatePiece();
  }

  draw();
});

canvas.addEventListener('pointerdown', handlePointer);

startBtn.addEventListener('click', () => {
  if (!gameRunning) {
    resetGame();
    startGame();
  }
});

restartBtn.addEventListener('click', () => {
  cancelAnimationFrame(animationFrameId);
  resetGame();
  startGame();
});

resetGame();
updateHud();
drawNextPiece();
draw();
