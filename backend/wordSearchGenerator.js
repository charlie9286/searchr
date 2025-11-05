// Word Search Generator
// Places words into a grid in 8 directions and fills remaining with random letters

class WordSearchGenerator {
  constructor(gridSize = 15) {
    this.gridSize = gridSize;
    this.grid = Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill(null));
    // 8 directions: N, NE, E, SE, S, SW, W, NW
    this.directions = [
      [-1, 0], // N
      [-1, 1], // NE
      [0, 1],  // E
      [1, 1],  // SE
      [1, 0],  // S
      [1, -1], // SW
      [0, -1], // W
      [-1, -1] // NW
    ];
    this.placements = []; // { word, row, col, dr, dc }
  }

  inBounds(r, c) {
    return r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize;
  }

  canPlace(word, row, col, dr, dc) {
    for (let i = 0; i < word.length; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (!this.inBounds(r, c)) return false;
      const cell = this.grid[r][c];
      if (cell !== null && cell !== word[i]) return false;
    }
    return true;
  }

  place(word, row, col, dr, dc) {
    for (let i = 0; i < word.length; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      this.grid[r][c] = word[i];
    }
    this.placements.push({ word, row, col, dr, dc });
  }

  tryPlaceWord(word, maxAttempts = 500) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const [dr, dc] = this.directions[Math.floor(Math.random() * this.directions.length)];
      const row = Math.floor(Math.random() * this.gridSize);
      const col = Math.floor(Math.random() * this.gridSize);
      if (this.canPlace(word, row, col, dr, dc)) {
        this.place(word, row, col, dr, dc);
        return true;
      }
    }
    return false;
  }

  generate(words) {
    const normalized = Array.from(new Set(words.map(w => w.toUpperCase())));
    // Place longer words first for better fit
    normalized.sort((a, b) => b.length - a.length);

    const placed = [];
    for (const word of normalized) {
      if (this.tryPlaceWord(word)) {
        placed.push(word);
      }
    }

    // Fill remaining cells with random letters
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.grid[r][c] === null) {
          this.grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
        }
      }
    }

    return {
      grid: this.grid.map(row => row.join('')),
      words: placed,
      placements: this.placements,
    };
  }
}

module.exports = WordSearchGenerator;



