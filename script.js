const GRID_SIZE = 20;

const WORDS = [
  {
    display: 'Variedades crioulas',
    normalized: 'VARIEDADESCRIOULAS',
    description: 'Sementes mantidas por famílias agricultoras, adaptadas ao território e passadas entre gerações.'
  },
  {
    display: 'Raças nativas',
    normalized: 'RACASNATIVAS',
    description: 'Animais criados localmente, com boa adaptação ao clima e ao manejo tradicional.'
  },
  {
    display: 'Curraleiro pé-duro',
    normalized: 'CURRALEIROPEDURO',
    description: 'Raça bovina resistente, associada ao sertão e à capacidade de enfrentar solos pedregosos.'
  },
  {
    display: 'Galinha canela preta',
    normalized: 'GALINHACANELAPRETA',
    description: 'Raça de galinha caipira típica do Piauí, valorizada pela rusticidade e adaptação local.'
  },
  {
    display: 'Morada nova',
    normalized: 'MORADANOVA',
    description: 'Raça nativa de ovinos, conhecida pela rusticidade e pela adaptação ao semiárido.'
  },
  {
    display: 'Sementes da paixão',
    normalized: 'SEMENTESDAPAIXAO',
    description: 'Sementes crioulas guardadas e selecionadas por agricultores para preservar a diversidade.'
  },
  {
    display: 'Feijão de corda',
    normalized: 'FEIJAODECORDA',
    description: 'Leguminosa muito presente na alimentação regional e importante na agricultura familiar.'
  },
  {
    display: 'Milho vermelho',
    normalized: 'MILHOVERMELHO',
    description: 'Variedade crioula de milho de coloração avermelhada, ligada à conservação da diversidade genética.'
  }
];

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],            [0, 1],
  [1, -1],  [1, 0],   [1, 1]
];

const board = document.getElementById('gameBoard');
const gameTimerView = document.getElementById('gameTimerView') || document.getElementById('countdown');
const attemptsElement = document.getElementById('attempts');
const foundCountElement = document.getElementById('foundCount');
const wordListElement = document.getElementById('wordList');

const startScreen = document.getElementById('startScreen');
const preGameOverlay = document.getElementById('preGameOverlay');
const preGameNumber = document.getElementById('preGameNumber');
const victoryOverlay = document.getElementById('victoryOverlay');

const finalTime = document.getElementById('finalTime');
const finalAttempts = document.getElementById('finalAttempts');
const rankBadge = document.getElementById('rankBadge');
const rankMessage = document.getElementById('rankMessage');

const startButton = document.getElementById('startButton');
const shareButton = document.getElementById('shareButton');
const restartButton = document.getElementById('restartButton');
const playerNameInput = document.getElementById('playerName');
const musicButton = document.getElementById('musicButton');

const flipSound = document.getElementById('flipSound');
const matchSound = document.getElementById('matchSound');
const wrongSound = document.getElementById('wrongSound');
const victorySound = document.getElementById('victorySound');
const bgMusic = document.getElementById('bgMusic');

const shareCanvas = document.getElementById('shareCanvas');
const shareCtx = shareCanvas.getContext('2d');

let grid = [];
let cellEls = [];
let placements = [];
let foundWords = new Set();
let attempts = 0;
let gameSeconds = 0;
let gameTimer = null;
let preGameTimer = null;
let musicMuted = false;
let isSelecting = false;
let startCell = null;
let currentCells = [];
let currentPointerId = null;
let invalidClearTimer = null;
let gameStarted = false;
let gameLocked = false;

function normalizeText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/gi, '')
    .toUpperCase();
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function formatTime(totalSeconds) {
  const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const secs = String(totalSeconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function playSound(audio) {
  if (!audio) return;
  try {
    audio.currentTime = 0;
    const promise = audio.play();
    if (promise && typeof promise.catch === 'function') {
      promise.catch(() => {});
    }
  } catch (e) {}
}

function reverseString(text) {
  return String(text).split('').reverse().join('');
}

function createEmptyGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(''));
}

function canPlace(word, row, col, dr, dc, gridRef) {
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
    const existing = gridRef[r][c];
    if (existing && existing !== word[i]) return false;
  }
  return true;
}

function placeWord(word, gridRef) {
  const attemptsLimit = 2000;
  for (let i = 0; i < attemptsLimit; i++) {
    const [dr, dc] = shuffle([...DIRECTIONS])[0];
    const maxRow = GRID_SIZE - 1;
    const maxCol = GRID_SIZE - 1;

    const startRowMin = dr === 1 ? 0 : 0;
    const startRowMax = dr === 1 ? maxRow - (word.length - 1) : (dr === -1 ? maxRow : maxRow);
    const startColMin = dc === 1 ? 0 : 0;
    const startColMax = dc === 1 ? maxCol - (word.length - 1) : (dc === -1 ? maxCol : maxCol);

    const row = Math.floor(Math.random() * (startRowMax - startRowMin + 1)) + startRowMin;
    const col = Math.floor(Math.random() * (startColMax - startColMin + 1)) + startColMin;

    const endRow = row + dr * (word.length - 1);
    const endCol = col + dc * (word.length - 1);
    if (endRow < 0 || endRow >= GRID_SIZE || endCol < 0 || endCol >= GRID_SIZE) continue;

    if (!canPlace(word, row, col, dr, dc, gridRef)) continue;

    for (let j = 0; j < word.length; j++) {
      const r = row + dr * j;
      const c = col + dc * j;
      gridRef[r][c] = word[j];
    }

    return { word, row, col, dr, dc };
  }

  throw new Error(`Não foi possível posicionar a palavra: ${word}`);
}

function generateBoard() {
  let success = false;
  let safety = 0;

  while (!success && safety < 50) {
    safety++;
    try {
      const gridRef = createEmptyGrid();
      const sortedWords = [...WORDS].sort((a, b) => b.normalized.length - a.normalized.length);
      const newPlacements = [];

      for (const item of sortedWords) {
        const placement = placeWord(item.normalized, gridRef);
        newPlacements.push({ ...placement, display: item.display, normalized: item.normalized });
      }

      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (!gridRef[r][c]) {
            gridRef[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
          }
        }
      }

      grid = gridRef;
      placements = newPlacements;
      success = true;
    } catch (error) {
      success = false;
    }
  }

  if (!success) {
    throw new Error('Não foi possível gerar o caça-palavras.');
  }
}

function buildWordList() {
  if (!wordListElement) return;
  wordListElement.innerHTML = '';
  WORDS.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'word-item';
    div.dataset.word = item.normalized;
    div.innerHTML = `
      <div class="word-title">${index + 1}. ${item.display}</div>
      <div class="word-description">${item.description}</div>
    `;
    wordListElement.appendChild(div);
  });
}

function buildBoard() {
  if (!board) return;
  board.innerHTML = '';
  cellEls = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.textContent = grid[r][c];
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);
      board.appendChild(cell);
      cellEls[r][c] = cell;
    }
  }
}

function resetSelectionPreview() {
  for (const cell of currentCells) {
    if (!cell.classList.contains('found')) {
      cell.classList.remove('preview');
    }
  }
  currentCells = [];
}

function getCell(row, col) {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
  return cellEls[row]?.[col] || null;
}

function getPointerCell(event) {
  const el = document.elementFromPoint(event.clientX, event.clientY);
  if (!el || !board.contains(el)) return null;
  return el.closest('.cell');
}

function getLineCells(start, end) {
  if (!start || !end) return null;

  const r1 = Number(start.dataset.row);
  const c1 = Number(start.dataset.col);
  const r2 = Number(end.dataset.row);
  const c2 = Number(end.dataset.col);

  const drRaw = r2 - r1;
  const dcRaw = c2 - c1;

  if (drRaw === 0 && dcRaw === 0) return [start];
  if (drRaw !== 0 && dcRaw !== 0 && Math.abs(drRaw) !== Math.abs(dcRaw)) return null;

  const stepR = drRaw === 0 ? 0 : drRaw > 0 ? 1 : -1;
  const stepC = dcRaw === 0 ? 0 : dcRaw > 0 ? 1 : -1;
  const steps = Math.max(Math.abs(drRaw), Math.abs(dcRaw));

  const cells = [];
  for (let i = 0; i <= steps; i++) {
    const cell = getCell(r1 + stepR * i, c1 + stepC * i);
    if (!cell) return null;
    cells.push(cell);
  }

  return cells;
}

function setPreviewCells(cells) {
  if (!cells || !cells.length) return;
  resetSelectionPreview();
  currentCells = cells;
  for (const cell of currentCells) {
    if (!cell.classList.contains('found')) {
      cell.classList.add('preview');
    }
  }
}

function clearInvalidState() {
  if (invalidClearTimer) {
    clearTimeout(invalidClearTimer);
    invalidClearTimer = null;
  }
  document.querySelectorAll('.cell.invalid').forEach(cell => cell.classList.remove('invalid'));
}

function flashInvalid(cells) {
  clearInvalidState();
  for (const cell of cells) {
    if (!cell.classList.contains('found')) {
      cell.classList.remove('preview');
      cell.classList.add('invalid');
    }
  }
  invalidClearTimer = setTimeout(() => {
    for (const cell of cells) {
      cell.classList.remove('invalid');
    }
    invalidClearTimer = null;
  }, 1700);
}

function markWordFound(wordNormalized, cells) {
  foundWords.add(wordNormalized);

  for (const cell of cells) {
    cell.classList.remove('preview', 'invalid');
    cell.classList.add('found');
  }

  const wordItem = document.querySelector(`.word-item[data-word="${wordNormalized}"]`);
  if (wordItem) wordItem.classList.add('found');

  if (foundCountElement) {
    foundCountElement.textContent = `${foundWords.size}/8`;
  }
}

function getWordMatch(selection) {
  const normalized = normalizeText(selection);
  return WORDS.find(item => {
    if (foundWords.has(item.normalized)) return false;
    return normalized === item.normalized || normalized === reverseString(item.normalized);
  }) || null;
}

function endSelection(commit = true) {
  if (!isSelecting) return;

  const selectedCells = currentCells.slice();
  isSelecting = false;
  startCell = null;
  currentPointerId = null;

  if (!commit) {
    resetSelectionPreview();
    return;
  }

  if (!selectedCells.length || selectedCells.length < 2) {
    resetSelectionPreview();
    return;
  }

  attempts++;
  if (attemptsElement) attemptsElement.textContent = String(attempts);

  const selectedText = selectedCells.map(cell => cell.textContent).join('');
  const match = getWordMatch(selectedText);

  if (match) {
    playSound(matchSound);
    markWordFound(match.normalized, selectedCells);
    resetSelectionPreview();
    checkVictory();
  } else {
    playSound(wrongSound);
    flashInvalid(selectedCells);
    resetSelectionPreview();
  }
}

function handlePointerDown(event) {
  if (gameLocked || !gameStarted) return;
  const cell = event.target.closest('.cell');
  if (!cell || cell.classList.contains('found')) return;

  if (invalidClearTimer) {
    clearInvalidState();
  }

  playSound(flipSound);
  isSelecting = true;
  startCell = cell;
  currentPointerId = event.pointerId || null;

  const cells = getLineCells(startCell, cell);
  if (cells) {
    setPreviewCells(cells);
  } else {
    setPreviewCells([startCell]);
  }

  if (board && typeof board.setPointerCapture === 'function' && currentPointerId !== null) {
    try {
      board.setPointerCapture(currentPointerId);
    } catch (e) {}
  }

  event.preventDefault();
}

function handlePointerMove(event) {
  if (!isSelecting || !startCell) return;
  const cell = getPointerCell(event);
  if (!cell || cell.classList.contains('found')) return;

  const cells = getLineCells(startCell, cell);
  if (cells && cells.length >= 2) {
    setPreviewCells(cells);
  } else {
    setPreviewCells([startCell]);
  }
}

function handlePointerUp() {
  if (!isSelecting) return;
  endSelection(true);
}

function handlePointerCancel() {
  if (!isSelecting) return;
  isSelecting = false;
  startCell = null;
  currentPointerId = null;
  resetSelectionPreview();
}

function startGameTimer() {
  if (gameTimer) clearInterval(gameTimer);
  gameSeconds = 0;
  if (gameTimerView) gameTimerView.textContent = '00:00';

  gameTimer = setInterval(() => {
    gameSeconds++;
    if (gameTimerView) gameTimerView.textContent = formatTime(gameSeconds);
  }, 1000);
}

function getRank(attemptsValue, timeValue) {
  if (timeValue <= 120 && attemptsValue <= 16) {
    return {
      label: 'OURO',
      className: 'gold',
      message: 'Excelente desempenho! Você encontrou as palavras com muita agilidade e atenção.'
    };
  }

  if (timeValue <= 240 && attemptsValue <= 28) {
    return {
      label: 'PRATA',
      className: 'silver',
      message: 'Muito bem! Sua leitura do tabuleiro e sua estratégia foram fortes.'
    };
  }

  return {
    label: 'BRONZE',
    className: 'bronze',
    message: 'Você conseguiu! Com mais treino, seu resultado pode ficar ainda melhor.'
  };
}

function checkVictory() {
  if (foundWords.size !== WORDS.length) return;

  gameLocked = true;
  if (gameTimer) clearInterval(gameTimer);
  playSound(victorySound);

  const rank = getRank(attempts, gameSeconds);

  if (finalTime) finalTime.textContent = formatTime(gameSeconds);
  if (finalAttempts) finalAttempts.textContent = String(attempts);
  if (rankBadge) {
    rankBadge.textContent = rank.label;
    rankBadge.className = `rank-badge ${rank.className}`;
  }
  if (rankMessage) rankMessage.textContent = rank.message;

  setTimeout(() => {
    if (victoryOverlay) victoryOverlay.classList.remove('hidden');
  }, 420);
}

function startPreGameCountdown() {
  if (startScreen) startScreen.classList.add('hidden');
  if (preGameOverlay) preGameOverlay.classList.remove('hidden');

  let count = 3;
  if (preGameNumber) preGameNumber.textContent = String(count);

  const interval = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(interval);
      if (preGameOverlay) preGameOverlay.classList.add('hidden');
      initGameplay();
      return;
    }

    if (preGameNumber) preGameNumber.textContent = String(count);
  }, 1000);
}

function initGameplay() {
  attempts = 0;
  gameSeconds = 0;
  foundWords = new Set();
  gameLocked = false;
  gameStarted = true;
  isSelecting = false;
  startCell = null;
  currentCells = [];

  if (attemptsElement) attemptsElement.textContent = '0';
  if (foundCountElement) foundCountElement.textContent = `0/${WORDS.length}`;
  if (victoryOverlay) victoryOverlay.classList.add('hidden');

  document.querySelectorAll('.word-item').forEach(item => item.classList.remove('found'));

  buildWordList();
  generateBoard();
  buildBoard();

  clearInvalidState();
  resetSelectionPreview();

  if (preGameTimer) clearInterval(preGameTimer);
  if (gameTimer) clearInterval(gameTimer);

  startGameTimer();
}

function restartGame() {
  location.reload();
}

function fitText(ctx, text, maxWidth, initialFontSize, fontFamily = 'Arial') {
  let size = initialFontSize;
  ctx.font = `bold ${size}px ${fontFamily}`;
  while (ctx.measureText(text).width > maxWidth && size > 14) {
    size -= 1;
    ctx.font = `bold ${size}px ${fontFamily}`;
  }
  return size;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src.startsWith('data:') ? src : `${src}?v=${Date.now()}`;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function canvasToBlob(canvas) {
  return new Promise(resolve => {
    if (canvas.toBlob) {
      canvas.toBlob(blob => resolve(blob), 'image/png');
    } else {
      const dataUrl = canvas.toDataURL('image/png');
      const parts = dataUrl.split(',');
      const binary = atob(parts[1]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      resolve(new Blob([bytes], { type: 'image/png' }));
    }
  });
}

async function createShareImage() {
  const canvas = shareCanvas;
  const ctx = shareCtx;
  const W = canvas.width;
  const H = canvas.height;

  canvas.width = 1080;
  canvas.height = 1920;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#f5f2e8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 60, 70, 960, 1780, 42);
  ctx.fill();

  ctx.fillStyle = '#6a7f1f';
  roundRect(ctx, 60, 70, 960, 180, 42);
  ctx.fill();

  try {
    const logo = await loadImage('assets/logo.png');
    const logoW = 190;
    const logoH = logo.naturalHeight / logo.naturalWidth * logoW;
    ctx.drawImage(logo, 60 + (960 - logoW) / 2, 105, logoW, logoH);
  } catch (e) {}

  const name = (playerNameInput && playerNameInput.value ? playerNameInput.value : '').trim() || 'Jogador';
  const rank = getRank(attempts, gameSeconds);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 54px Arial';
  ctx.fillText('Caça-Palavras', canvas.width / 2, 170);

  ctx.fillStyle = '#3d3427';
  ctx.font = 'bold 42px Arial';
  ctx.fillText(name, canvas.width / 2, 320);

  ctx.fillStyle = '#666';
  ctx.font = '28px Arial';
  ctx.fillText('Variedades crioulas do Piauí', canvas.width / 2, 370);

  const statY = 470;
  const statW = 400;
  const statH = 140;
  const statGap = 40;
  const startX = (canvas.width - (statW * 2 + statGap)) / 2;

  const stats = [
    { label: 'Tempo', value: formatTime(gameSeconds) },
    { label: 'Tentativas', value: String(attempts) }
  ];

  stats.forEach((stat, idx) => {
    const x = startX + idx * (statW + statGap);
    ctx.fillStyle = '#faf7ee';
    roundRect(ctx, x, statY, statW, statH, 28);
    ctx.fill();

    ctx.fillStyle = '#777';
    ctx.font = '22px Arial';
    ctx.fillText(stat.label, x + statW / 2, statY + 42);

    ctx.fillStyle = '#6a7f1f';
    ctx.font = 'bold 40px Arial';
    ctx.fillText(stat.value, x + statW / 2, statY + 94);
  });

  ctx.fillStyle = '#fff9e8';
  roundRect(ctx, 110, 670, 860, 190, 30);
  ctx.fill();

  ctx.fillStyle = '#777';
  ctx.font = '22px Arial';
  ctx.fillText('Resultado da partida', canvas.width / 2, 720);

  ctx.fillStyle = rank.className === 'gold' ? '#d4a017' : rank.className === 'silver' ? '#7c8a99' : '#a66a3f';
  ctx.font = 'bold 44px Arial';
  ctx.fillText(rank.label, canvas.width / 2, 784);

  ctx.fillStyle = '#555';
  ctx.font = '26px Arial';
  ctx.fillText(rank.message, canvas.width / 2, 840);

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e7dfcf';
  ctx.lineWidth = 2;
  roundRect(ctx, 110, 910, 860, 760, 30);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#3d3427';
  ctx.font = 'bold 30px Arial';
  ctx.fillText('Palavras encontradas', canvas.width / 2, 970);

  const foundList = WORDS.map(item => item.display);
  const leftX = 185;
  const rightX = 615;
  let y = 1040;
  const rowStep = 92;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '26px Arial';
  foundList.forEach((word, idx) => {
    const x = idx < 4 ? leftX : rightX;
    const row = idx < 4 ? idx : idx - 4;
    const yy = y + row * rowStep;

    ctx.fillStyle = '#2d9b45';
    ctx.beginPath();
    ctx.arc(x, yy + 14, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3d3427';
    ctx.fillText(word, x + 24, yy);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#666';
  ctx.font = '24px Arial';
  ctx.fillText('Compartilhe nos stories e mostre sua conquista!', canvas.width / 2, 1768);
}

async function shareToStories() {
  try {
    await createShareImage();

    const blob = await canvasToBlob(shareCanvas);
    if (!blob) throw new Error('Falha ao gerar imagem.');

    const file = new File([blob], 'conquista-caca-palavras.png', { type: 'image/png' });

    const canShareFiles =
      typeof navigator.share === 'function' &&
      (
        typeof navigator.canShare !== 'function' ||
        navigator.canShare({ files: [file] })
      );

    if (canShareFiles) {
      try {
        await navigator.share({
          files: [file],
          title: 'Caça-Palavras',
          text: 'Olha a minha conquista no caça-palavras das variedades crioulas do Piauí!'
        });
        return;
      } catch (e) {}
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'conquista-caca-palavras.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    alert('Imagem baixada! Agora você pode postá-la diretamente nos seus Stories.');
  } catch (error) {
    alert('Erro ao gerar imagem de compartilhamento.');
  }
}

function boot() {
  buildWordList();
  generateBoard();
  buildBoard();

  if (board) {
    board.addEventListener('pointerdown', handlePointerDown);
  }

  document.addEventListener('pointermove', handlePointerMove);
  document.addEventListener('pointerup', handlePointerUp);
  document.addEventListener('pointercancel', handlePointerCancel);

  if (startButton) startButton.addEventListener('click', () => {
    bgMusic.volume = 0.25;
    bgMusic.play().catch(() => {});
    startPreGameCountdown();
  });

  if (musicButton) musicButton.addEventListener('click', () => {
    if (!musicMuted) {
      bgMusic.pause();
      musicButton.textContent = '🔇 Música';
      musicMuted = true;
    } else {
      bgMusic.play().catch(() => {});
      musicButton.textContent = '🔊 Música';
      musicMuted = false;
    }
  });

  if (shareButton) shareButton.addEventListener('click', shareToStories);
  if (restartButton) restartButton.addEventListener('click', restartGame);

  if (foundCountElement) foundCountElement.textContent = `0/${WORDS.length}`;
  if (attemptsElement) attemptsElement.textContent = '0';
  if (gameTimerView) gameTimerView.textContent = '00:00';
  if (victoryOverlay) victoryOverlay.classList.add('hidden');
}

boot();
