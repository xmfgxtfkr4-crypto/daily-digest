// Crossword Puzzle Generator - Enhanced Version

// Clue bank for common words
const CLUE_BANK = {
  // Seasonal
  'SNOW': 'White winter precipitation',
  'COLD': 'Low temperature feeling',
  'FROST': 'Ice crystals on windows',
  'COZY': 'Warm and comfortable',
  'WARM': 'Pleasant temperature',
  'SCARF': 'Winter neck garment',
  'FIRE': 'Keeps you warm in winter',
  'COCOA': 'Hot chocolate drink',
  'BLOOM': 'Flowers do this in spring',
  'RAIN': 'Water from clouds',
  'GREEN': 'Color of spring grass',
  'BIRDS': 'They sing in the morning',
  'FRESH': 'New and clean',
  'SUNNY': 'Bright and cheerful weather',
  'GARDEN': 'Place to grow flowers',
  'TULIP': 'Spring flower from Holland',
  'BEACH': 'Sandy shore by water',
  'SWIM': 'Activity in water',
  'PICNIC': 'Outdoor meal',
  'RELAX': 'Rest and unwind',
  'BREEZE': 'Gentle wind',
  'FUN': 'Enjoyable time',
  'LEAVES': 'They fall in autumn',
  'CRISP': 'Fresh autumn air',
  'APPLE': 'Red fruit, popular in fall',
  'HARVEST': 'Gathering crops',
  'GOLDEN': 'Color of autumn leaves',
  'COOL': 'Pleasantly cold',
  'AUTUMN': 'Fall season',

  // Holidays
  'PARTY': 'Celebration gathering',
  'CHEERS': 'Toast at celebrations',
  'HAPPY': 'Feeling of joy',
  'YEAR': '365 days',
  'LOVE': 'Deep affection',
  'HEART': 'Symbol of love',
  'ROSES': 'Romantic flowers',
  'SWEET': 'Sugar taste',
  'BUNNY': 'Easter animal',
  'EGGS': 'Easter hunt items',
  'SPRING': 'Season after winter',
  'JOY': 'Great happiness',
  'FLAG': 'National symbol',
  'FREE': 'Liberty',
  'PRIDE': 'National feeling',
  'STARS': 'Lights in the night sky',
  'CANDY': 'Sweet treats',
  'TREAT': 'Special reward',
  'PUMPKIN': 'Orange fall vegetable',
  'THANKS': 'Gratitude',
  'FAMILY': 'Loved ones at home',
  'FEAST': 'Large meal',
  'TURKEY': 'Thanksgiving bird',
  'GIFTS': 'Presents',
  'CHEER': 'Holiday happiness',
  'TREE': 'Christmas decoration',
  'MERRY': 'Happy, festive',
  'SANTA': 'Gift giver at Christmas',

  // Positive words
  'SMILE': 'Happy facial expression',
  'HOPE': 'Positive expectation',
  'PEACE': 'Calm and quiet',
  'KIND': 'Caring and gentle',
  'FRIEND': 'Close companion',
  'CARE': 'Look after someone',
  'GOOD': 'Positive quality',

  // Days and months
  'SUNDAY': 'First day of the week',
  'MONDAY': 'Start of work week',
  'TUESDAY': 'Second work day',
  'WEDNESDAY': 'Middle of the week',
  'THURSDAY': 'Fourth work day',
  'FRIDAY': 'Last work day',
  'SATURDAY': 'Weekend day',
  'JANUARY': 'First month',
  'FEBRUARY': 'Shortest month',
  'MARCH': 'Spring begins',
  'APRIL': 'Showers month',
  'MAY': 'Fifth month',
  'JUNE': 'Start of summer',
  'JULY': 'Independence month',
  'AUGUST': 'Late summer month',
  'SEPTEMBER': 'Back to school month',
  'OCTOBER': 'Halloween month',
  'NOVEMBER': 'Thanksgiving month',
  'DECEMBER': 'Holiday month'
};

/**
 * Generate a crossword puzzle from a list of words
 * @param {string[]} words - List of words to place
 * @param {number} gridSize - Size of the grid (default 12 for bigger puzzle)
 * @param {Object} customClues - Optional custom clues from API (overrides defaults)
 * @returns {Object} - Crossword puzzle data
 */
function generateCrossword(words, gridSize = 12, customClues = {}) {
  // Merge custom clues with default clue bank (custom takes priority)
  const clueBank = { ...CLUE_BANK, ...customClues };

  // Filter and sort words by length (longer first for better placement)
  const validWords = words
    .map(w => w.toUpperCase().replace(/[^A-Z]/g, ''))
    .filter(w => w.length >= 3 && w.length <= gridSize)
    .sort((a, b) => b.length - a.length);

  // Initialize empty grid
  const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(''));
  const placedWords = [];

  // Try to place each word - aim for 12-15 words for a good puzzle
  const maxWords = 15;
  for (const word of validWords) {
    if (placedWords.length >= maxWords) break;

    const placement = findPlacement(grid, word, placedWords, gridSize);
    if (placement) {
      placeWord(grid, word, placement);
      placedWords.push({
        word: word,
        row: placement.row,
        col: placement.col,
        direction: placement.direction,
        clue: clueBank[word] || `A word meaning ${word.toLowerCase()}`
      });
    }
  }

  // Number the words
  const numberedWords = numberWords(placedWords);

  return {
    grid: grid,
    words: numberedWords,
    size: gridSize
  };
}

/**
 * Find a valid placement for a word
 */
function findPlacement(grid, word, placedWords, gridSize) {
  // First word: place horizontally near center
  if (placedWords.length === 0) {
    const row = Math.floor(gridSize / 2);
    const col = Math.floor((gridSize - word.length) / 2);
    return { row, col, direction: 'across' };
  }

  // Try to intersect with existing words - prioritize intersections
  const intersections = [];
  for (const placed of placedWords) {
    for (let i = 0; i < word.length; i++) {
      for (let j = 0; j < placed.word.length; j++) {
        if (word[i] === placed.word[j]) {
          let newRow, newCol, direction;

          if (placed.direction === 'across') {
            direction = 'down';
            newCol = placed.col + j;
            newRow = placed.row - i;
          } else {
            direction = 'across';
            newRow = placed.row + j;
            newCol = placed.col - i;
          }

          if (canPlace(grid, word, newRow, newCol, direction, gridSize)) {
            // Score this placement - prefer central positions
            const centerDist = Math.abs(newRow - gridSize/2) + Math.abs(newCol - gridSize/2);
            intersections.push({ row: newRow, col: newCol, direction, score: 100 - centerDist });
          }
        }
      }
    }
  }

  // Return best intersection if found
  if (intersections.length > 0) {
    intersections.sort((a, b) => b.score - a.score);
    return intersections[0];
  }

  // Try random placements if no intersection found
  const directions = ['across', 'down'];
  for (let attempts = 0; attempts < 100; attempts++) {
    const direction = directions[Math.floor(Math.random() * 2)];
    const maxRow = direction === 'down' ? gridSize - word.length : gridSize - 1;
    const maxCol = direction === 'across' ? gridSize - word.length : gridSize - 1;

    const row = Math.floor(Math.random() * (maxRow + 1));
    const col = Math.floor(Math.random() * (maxCol + 1));

    if (canPlace(grid, word, row, col, direction, gridSize)) {
      return { row, col, direction };
    }
  }

  return null;
}

/**
 * Check if a word can be placed at a position
 */
function canPlace(grid, word, row, col, direction, gridSize) {
  // Check bounds
  if (row < 0 || col < 0) return false;
  if (direction === 'across' && col + word.length > gridSize) return false;
  if (direction === 'down' && row + word.length > gridSize) return false;

  let hasIntersection = false;

  // Check each cell
  for (let i = 0; i < word.length; i++) {
    const r = direction === 'down' ? row + i : row;
    const c = direction === 'across' ? col + i : col;

    const cell = grid[r][c];
    if (cell !== '' && cell !== word[i]) {
      return false; // Conflict with existing letter
    }

    if (cell === word[i]) {
      hasIntersection = true;
    }

    // Check adjacent cells (don't want words touching side-by-side)
    if (cell === '') {
      if (direction === 'across') {
        if (r > 0 && grid[r - 1][c] !== '' && grid[r - 1][c] !== word[i]) return false;
        if (r < gridSize - 1 && grid[r + 1][c] !== '' && grid[r + 1][c] !== word[i]) return false;
      } else {
        if (c > 0 && grid[r][c - 1] !== '' && grid[r][c - 1] !== word[i]) return false;
        if (c < gridSize - 1 && grid[r][c + 1] !== '' && grid[r][c + 1] !== word[i]) return false;
      }
    }
  }

  // Check cells before and after the word
  if (direction === 'across') {
    if (col > 0 && grid[row][col - 1] !== '') return false;
    if (col + word.length < gridSize && grid[row][col + word.length] !== '') return false;
  } else {
    if (row > 0 && grid[row - 1][col] !== '') return false;
    if (row + word.length < gridSize && grid[row + word.length][col] !== '') return false;
  }

  return true;
}

/**
 * Place a word on the grid
 */
function placeWord(grid, word, placement) {
  for (let i = 0; i < word.length; i++) {
    const r = placement.direction === 'down' ? placement.row + i : placement.row;
    const c = placement.direction === 'across' ? placement.col + i : placement.col;
    grid[r][c] = word[i];
  }
}

/**
 * Number the words based on position
 */
function numberWords(placedWords) {
  const starts = placedWords.map((w, idx) => ({
    ...w,
    originalIdx: idx
  }));

  // Sort by position (top to bottom, left to right)
  starts.sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  // Assign numbers
  let num = 1;
  const positionNumbers = new Map();

  starts.forEach(word => {
    const posKey = `${word.row},${word.col}`;
    if (!positionNumbers.has(posKey)) {
      positionNumbers.set(posKey, num++);
    }
    word.number = positionNumbers.get(posKey);
  });

  // Separate into across and down clues
  const across = starts
    .filter(w => w.direction === 'across')
    .sort((a, b) => a.number - b.number);

  const down = starts
    .filter(w => w.direction === 'down')
    .sort((a, b) => a.number - b.number);

  return { across, down };
}

/**
 * Create a display grid with numbers
 */
function createDisplayGrid(grid, words, size) {
  const numbers = new Map();
  [...words.across, ...words.down].forEach(word => {
    const posKey = `${word.row},${word.col}`;
    if (!numbers.has(posKey)) {
      numbers.set(posKey, word.number);
    }
  });

  const displayGrid = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      const posKey = `${r},${c}`;
      row.push({
        letter: grid[r][c],
        number: numbers.get(posKey) || null,
        isEmpty: grid[r][c] === ''
      });
    }
    displayGrid.push(row);
  }

  return displayGrid;
}

// Export for use in PDF generator
window.CrosswordGenerator = {
  generate: generateCrossword,
  createDisplayGrid: createDisplayGrid
};
