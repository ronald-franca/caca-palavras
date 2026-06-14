const board = document.getElementById('gameBoard');
const gameTimerView = document.getElementById('gameTimerView');
const attemptsElement = document.getElementById('attempts');
const wordsListDisplay = document.getElementById('wordsListDisplay');

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
const playerNameInput = document.getElementById('playerName');
const musicButton = document.getElementById('musicButton');

const flipSound = document.getElementById('flipSound'); 
const matchSound = document.getElementById('matchSound');
const wrongSound = document.getElementById('wrongSound');
const victorySound = document.getElementById('victorySound');
const bgMusic = document.getElementById('bgMusic');

const shareCanvas = document.getElementById('shareCanvas');
const shareCtx = shareCanvas.getContext('2d');

// Definição das palavras corrigidas e prontas para validação livre
const wordData = [
  { word: "CANELAPRETA", displayName: "Canela Preta (Galinha Caipira do PI)" },
  { word: "CURRALEIROPEDURO", displayName: "Curraleiro Pé Duro" },
  { word: "FEIJAOFAVA", displayName: "Feijão Fava" },
  { word: "MORADANOVA", displayName: "Morada Nova" },
  { word: "MILHO", displayName: "Milho" },
  { word: "SEMENTESDAPAIXAO", displayName: "Sementes da Paixão" },
  { word: "RACASCRIOULAS", displayName: "Raças Crioulas" },
  { word: "VARIEDADESCRIOULAS", displayName: "Variedades Crioulas" }
];

const BOARD_SIZE = 15;
let grid = [];
let foundWords = [];

let isSelecting = false;
let selectedCells = [];

let gameTimer = null;
let gameSeconds = 0;
let musicMuted = false;

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
    if (promise !== undefined) {
      promise.catch(() => {});
    }
  } catch (e) {}
}

function initGrid() {
  grid = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(''));
}

function placeWords() {
  wordData.forEach(item => {
    let placed = false;
    let attempts = 0;
    
    while (!placed && attempts < 300) {
      const isVertical = Math.random() < 0.5;
      const row = Math.floor(Math.random() * BOARD_SIZE);
      const col = Math.floor(Math.random() * BOARD_SIZE);
      
      if (canPlaceWord(item.word, row, col, isVertical)) {
        placeWord(item.word, row, col, isVertical);
        placed = true;
      }
      attempts++;
    }
  });
}

function canPlaceWord(word, row, col, isVertical) {
  if (isVertical) {
    if (row + word.length > BOARD_SIZE) return false;
    for (let i = 0; i < word.length; i++) {
      if (grid[row + i][col] !== '' && grid[row + i][col] !== word[i]) {
        return false;
      }
    }
  } else {
    if (col + word.length > BOARD_SIZE) return false;
    for (let i = 0; i < word.length; i++) {
      if (grid[row][col + i] !== '' && grid[row][col + i] !== word[i]) {
        return false;
      }
    }
  }
  return true;
}

function placeWord(word, row, col, isVertical) {
  for (let i = 0; i < word.length; i++) {
    if (isVertical) {
      grid[row + i][col] = word[i];
    } else {
      grid[row][col + i] = word[i];
    }
  }
}

function fillEmptySpaces() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
      }
    }
  }
}

function createBoard() {
  board.innerHTML = '';
  initGrid();
  placeWords();
  fillEmptySpaces();

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cellElement = document.createElement('div');
      cellElement.classList.add('cell');
      cellElement.textContent = grid[r][c];
      cellElement.dataset.row = r;
      cellElement.dataset.col = c;

      cellElement.addEventListener('pointerdown', startSelection);
      cellElement.addEventListener('pointerenter', extendSelection);
      
      board.appendChild(cellElement);
    }
  }
  
  renderWordsList();
}

function renderWordsList() {
  wordsListDisplay.innerHTML = '';
  wordData.forEach(item => {
    const isFound = foundWords.includes(item.word);
    const span = document.createElement('span');
    span.classList.add('word-item-tag');
    if (isFound) span.classList.add('found-tag');
    span.textContent = item.displayName;
    wordsListDisplay.appendChild(span);
  });
  attemptsElement.textContent = `${foundWords.length} / ${wordData.length}`;
}

function startSelection(e) {
  isSelecting = true;
  selectedCells = [];
  playSound(flipSound);
  clearSelections();
  selectCell(e.currentTarget);
}

function extendSelection(e) {
  if (!isSelecting) return;
  selectCell(e.currentTarget);
}

function selectCell(cell) {
  if (!selectedCells.includes(cell)) {
    cell.classList.add('selected');
    selectedCells.push(cell);
  }
}

function clearSelections() {
  document.querySelectorAll('.cell:not(.found)').forEach(cell => {
    cell.classList.remove('selected');
  });
}

function endSelection() {
  if (!isSelecting) return;
  isSelecting = false;

  const selectedWord = selectedCells.map(cell => cell.textContent).join('');
  const reversedWord = selectedWord.split('').reverse().join('');

  const matchedItem = wordData.find(item => item.word === selectedWord || item.word === reversedWord);

  if (matchedItem && !foundWords.includes(matchedItem.word)) {
    playSound(matchSound);
    selectedCells.forEach(cell => {
      cell.classList.remove('selected');
      cell.classList.add('found');
    });

    foundWords.push(matchedItem.word);
    renderWordsList();
    checkVictory();
  } else {
    playSound(wrongSound);
    clearSelections();
  }
  selectedCells = [];
}

function checkVictory() {
  if (foundWords.length === wordData.length) {
    if (gameTimer) clearInterval(gameTimer);
    playSound(victorySound);

    const rank = getRank(gameSeconds);

    finalTime.textContent = formatTime(gameSeconds);
    finalAttempts.textContent = `${wordData.length} / ${wordData.length}`;
    rankBadge.textContent = rank.label;
    rankBadge.className = `rank-badge ${rank.className}`;
    rankMessage.textContent = rank.message;

    setTimeout(() => {
      victoryOverlay.classList.remove('hidden');
    }, 500);
  }
}

function startGameTimer() {
  if (gameTimer) clearInterval(gameTimer);

  gameSeconds = 0;
  gameTimerView.textContent = '00:00';

  gameTimer = setInterval(() => {
    gameSeconds++;
    gameTimerView.textContent = formatTime(gameSeconds);
  }, 1000);
}

function getRank(timeValue) {
  if (timeValue <= 90) {
    return {
      label: 'OURO',
      className: 'gold',
      message: 'Percepção incrível! Você mapeou a agrobiodiversidade rapidamente.'
    };
  }
  if (timeValue <= 180) {
    return {
      label: 'PRATA',
      className: 'silver',
      message: 'Ótimo trabalho! Demonstrou excelente foco estratégico.'
    };
  }
  return {
    label: 'BRONZE',
    className: 'bronze',
    message: 'Muito bem! Você salvou e identificou todas as variedades tradicionais.'
  };
}

function startPreGameCountdown() {
  startScreen.classList.add('hidden');
  preGameOverlay.classList.remove('hidden');

  let count = 3;
  preGameNumber.textContent = count;

  const interval = setInterval(() => {
    count--;

    if (count <= 0) {
      clearInterval(interval);
      preGameOverlay.classList.add('hidden');
      initGameplay();
      return;
    }

    preGameNumber.textContent = count;
  }, 1000);
}

function initGameplay() {
  foundWords = [];
  createBoard();
  startGameTimer();
  victoryOverlay.classList.add('hidden');
}

function restartGame() {
  location.reload();
}

async function createShareImage() {
  const rank = getRank(gameSeconds);

  const templateMap = {
    gold: 'assets/3.png',
    silver: 'assets/4.png',
    bronze: 'assets/5.png'
  };

  const templateSrc = templateMap[rank.className] || templateMap.gold;
  const canvas = shareCanvas;
  const ctx = shareCtx;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const template = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = templateSrc;
  });
  
  ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

  const playerName = (playerNameInput?.value || '').trim() || 'Jogador';

  ctx.fillStyle = '#be7612'; 
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 50px Arial';
  ctx.fillText(playerName, 540, 645);

  ctx.font = 'bold 54px Arial';
  ctx.fillText(formatTime(gameSeconds), 310, 856);
  ctx.fillText("08/08", 770, 856);

  ctx.font = 'bold 44px Arial';
  ctx.fillText(rank.label, 540, 1100);

  ctx.font = '32px Arial';
  ctx.fillStyle = '#555555';
  
  const message = rank.message;
  if (message.length > 40) {
    const meio = message.lastIndexOf(' ', 40);
    const linha1 = message.substring(0, meio);
    const linha2 = message.substring(meio + 1);
    ctx.fillText(linha1, 540, 1180);
    ctx.fillText(linha2, 540, 1230);
  } else {
    ctx.fillText(message, 540, 1200);
  }
}

async function shareToStories() {
  try {
    await createShareImage();
    shareCanvas.toBlob(async (blob) => {
      const file = new File([blob], 'conquista-caca-palavras.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Caça-Palavras',
          text: 'Olha o meu resultado no Caça-Palavras das Raízes da Biodiversidade Crioula!'
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'conquista-caca-palavras.png';
        a.click();
      }
    }, 'image/png');
  } catch (error) {
    alert('Erro ao gerar imagem de compartilhamento.');
  }
}

// Vinculação final dos eventos globais de clique/toque
window.addEventListener('pointerup', endSelection);

startButton.addEventListener('click', () => {
  bgMusic.volume = 0.25;
  bgMusic.play().catch(() => {});
  startPreGameCountdown();
});

musicButton.addEventListener('click', () => {
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

shareButton.addEventListener('click', shareToStories);
