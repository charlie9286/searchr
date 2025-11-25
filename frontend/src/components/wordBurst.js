import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  ScrollView,
  PanResponder,
} from 'react-native';
import wordlistData from '../data/wordlist.json';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_HORIZONTAL_PADDING = 16;
const GRID_SIZE = 8; // 8x8 grid
const GAME_DURATION = 60; // 1 minute in seconds

// Load wordlist from pre-processed JSON file
const ENGLISH_WORDS = new Set(wordlistData);
console.log('WordBurst: Loaded', ENGLISH_WORDS.size, 'words');
console.log('Sample words:', Array.from(ENGLISH_WORDS).slice(0, 10));

// Generate random letter (weighted towards vowels)
const getRandomLetter = () => {
  const vowels = 'AEIOU';
  const consonants = 'BCDFGHJKLMNPQRSTVWXYZ';
  // 40% chance vowel, 60% chance consonant
  if (Math.random() < 0.4) {
    return vowels[Math.floor(Math.random() * vowels.length)];
  }
  return consonants[Math.floor(Math.random() * consonants.length)];
};

// Generate initial grid
const generateGrid = () => {
  const grid = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      row.push(getRandomLetter());
    }
    grid.push(row);
  }
  return grid;
};

export default function WordBurst({ onBack }) {
  const [grid, setGrid] = useState(() => {
    try {
      return generateGrid();
    } catch (error) {
      console.error('Error generating grid:', error);
      // Return a simple fallback grid
      return Array(GRID_SIZE).fill(null).map(() => 
        Array(GRID_SIZE).fill('A')
      );
    }
  });
  const [selectedCell, setSelectedCell] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameOver, setGameOver] = useState(false);
  const [foundWords, setFoundWords] = useState(new Set());
  const [lastFoundWord, setLastFoundWord] = useState(null);
  const isDraggingRef = useRef(false);
  const startCellRef = useRef(null);
  const isCheckingWordsRef = useRef(false);

  const cellSize = useMemo(() => {
    const availableWidth = SCREEN_WIDTH - GRID_HORIZONTAL_PADDING * 2;
    return Math.floor(availableWidth / GRID_SIZE);
  }, []);

  const CELL = cellSize;
  const letterFontSize = Math.max(14, Math.min(CELL * 0.6, 26));

  // Timer
  useEffect(() => {
    if (gameOver || timeLeft <= 0) {
      setGameOver(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameOver, timeLeft]);

  // Check if a word exists in the grid (horizontal, vertical, diagonal)
  const findWordInGrid = useCallback((word, gridToCheck) => {
    const wordUpper = word.toUpperCase();
    const directions = [
      { dr: 0, dc: 1 }, // horizontal
      { dr: 1, dc: 0 }, // vertical
      { dr: 1, dc: 1 }, // diagonal down-right
      { dr: 1, dc: -1 }, // diagonal down-left
    ];

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        for (const { dr, dc } of directions) {
          let match = true;
          const path = [];

          for (let i = 0; i < wordUpper.length; i++) {
            const nr = r + dr * i;
            const nc = c + dc * i;

            if (
              nr < 0 ||
              nr >= GRID_SIZE ||
              nc < 0 ||
              nc >= GRID_SIZE ||
              gridToCheck[nr][nc] !== wordUpper[i]
            ) {
              match = false;
              break;
            }
            path.push({ row: nr, col: nc });
          }

          if (match) {
            return path;
          }

          // Check reverse direction
          match = true;
          const reversePath = [];
          for (let i = 0; i < wordUpper.length; i++) {
            const nr = r - dr * i;
            const nc = c - dc * i;

            if (
              nr < 0 ||
              nr >= GRID_SIZE ||
              nc < 0 ||
              nc >= GRID_SIZE ||
              gridToCheck[nr][nc] !== wordUpper[i]
            ) {
              match = false;
              break;
            }
            reversePath.push({ row: nr, col: nc });
          }

          if (match) {
            return reversePath;
          }
        }
      }
    }
    return null;
  }, []);

  // Get cell from coordinates (relative to grid container)
  const getCellFromTouch = useCallback(
    (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const relativeX = locationX - GRID_HORIZONTAL_PADDING;
      const relativeY = locationY - 8;
      if (relativeX < 0 || relativeY < 0) return null;
      const col = Math.floor(relativeX / CELL);
      const row = Math.floor(relativeY / CELL);
      if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        return { row, col };
      }
      return null;
    },
    [CELL]
  );

  // Check if two cells are adjacent (up, down, left, right only - no diagonal)
  const areAdjacent = useCallback((cell1, cell2) => {
    if (!cell1 || !cell2) return false;
    
    const rowDiff = Math.abs(cell1.row - cell2.row);
    const colDiff = Math.abs(cell1.col - cell2.col);
    
    // Adjacent if: same row and columns differ by 1, OR same column and rows differ by 1
    // No diagonal swaps allowed
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }, []);

  // Perform swap between two cells (only if adjacent)
  const performSwap = useCallback(
    (cell1, cell2) => {
      if (!cell1 || !cell2) {
        console.log('[WordBurst] Swap cancelled: missing cells');
        return;
      }
      
      if (cell1.row === cell2.row && cell1.col === cell2.col) {
        console.log('[WordBurst] Swap cancelled: same cell');
        return;
      }

      // Check if cells are adjacent (up, down, left, right only)
      if (!areAdjacent(cell1, cell2)) {
        console.log('[WordBurst] Swap cancelled: cells not adjacent', {
          cell1: { row: cell1.row, col: cell1.col },
          cell2: { row: cell2.row, col: cell2.col },
          rowDiff: Math.abs(cell1.row - cell2.row),
          colDiff: Math.abs(cell1.col - cell2.col)
        });
        setSelectedCell(null);
        startCellRef.current = null;
        return;
      }

      console.log('[WordBurst] Swapping adjacent cells:', {
        cell1: { row: cell1.row, col: cell1.col },
        cell2: { row: cell2.row, col: cell2.col }
      });

      setGrid((prevGrid) => {
        const newGrid = prevGrid.map((r) => [...r]);
        const temp = newGrid[cell1.row][cell1.col];
        newGrid[cell1.row][cell1.col] = newGrid[cell2.row][cell2.col];
        newGrid[cell2.row][cell2.col] = temp;

        // Check for words after swap (with the new grid)
        setTimeout(() => {
          checkForWords(newGrid);
        }, 150);

        return newGrid;
      });
      
      setSelectedCell(null);
      startCellRef.current = null;
    },
    [checkForWords, areAdjacent]
  );

  const SWIPE_THRESHOLD = CELL * 0.3;

  // PanResponder for swipe gestures
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (evt, gestureState) => {
          if (gameOver) return false;
          const cell = getCellFromTouch(evt);
          if (cell) {
            startCellRef.current = cell;
            setSelectedCell(cell);
            isDraggingRef.current = true;
            return true;
          }
          return false;
        },
        onMoveShouldSetPanResponder: () => isDraggingRef.current,
        onPanResponderMove: (evt, gestureState) => {
          if (!isDraggingRef.current || !startCellRef.current) return;
          const cell = getCellFromTouch(evt);
          if (cell) {
            setSelectedCell(cell);
          }
        },
        onPanResponderRelease: (evt, gestureState) => {
          isDraggingRef.current = false;
          const startCell = startCellRef.current;
          if (!startCell) {
            setSelectedCell(null);
            return;
          }

          const { dx, dy } = gestureState;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          if (absDx < SWIPE_THRESHOLD && absDy < SWIPE_THRESHOLD) {
            setSelectedCell(null);
            startCellRef.current = null;
            return;
          }

          let targetCell = { ...startCell };
          if (absDx > absDy) {
            targetCell.col = startCell.col + (dx > 0 ? 1 : -1);
          } else {
            targetCell.row = startCell.row + (dy > 0 ? 1 : -1);
          }

          if (
            targetCell.row >= 0 &&
            targetCell.row < GRID_SIZE &&
            targetCell.col >= 0 &&
            targetCell.col < GRID_SIZE
          ) {
            performSwap(startCell, targetCell);
          } else {
            setSelectedCell(null);
            startCellRef.current = null;
          }
        },
        onPanResponderTerminate: () => {
          isDraggingRef.current = false;
          setSelectedCell(null);
          startCellRef.current = null;
        },
        onPanResponderTerminationRequest: () => false, // Don't allow termination
      }),
    [gameOver, getCellFromTouch, performSwap, CELL]
  );

  // Check for valid words in the grid
  const checkForWords = useCallback(
    (gridToCheck) => {
      // Prevent concurrent word checks
      if (isCheckingWordsRef.current) return;
      isCheckingWordsRef.current = true;
      
      const currentGrid = gridToCheck || grid;
      console.log('[WordBurst] Checking for words in grid...');
      
      // First, extract all possible word sequences from the grid
      const foundWordPaths = [];
      let checkedCount = 0;
      let foundCount = 0;
      
      // Check each word in the dictionary - ONLY words in ENGLISH_WORDS
      // Minimum word length is 4 letters
      for (const word of ENGLISH_WORDS) {
        // Skip if already found or too short (must be 4+ letters)
        if (foundWords.has(word) || word.length < 4) continue;
        
        checkedCount++;
        
        // Strict validation: word MUST be in dictionary
        if (!ENGLISH_WORDS.has(word)) {
          console.warn('[WordBurst] Word not in dictionary:', word);
          continue;
        }
        
        // Word is already uppercase from the wordlist
        const path = findWordInGrid(word, currentGrid);
        if (path && path.length === word.length && path.length >= 4) {
          // Final verification: word exists in our dictionary
          if (ENGLISH_WORDS.has(word)) {
            foundWordPaths.push({ word, path });
            foundCount++;
            console.log('[WordBurst] Found word in grid:', word, 'Path:', path);
          } else {
            console.warn('[WordBurst] Word found in grid but NOT in dictionary:', word);
          }
        }
      }
      
      console.log(`[WordBurst] Checked ${checkedCount} words, found ${foundCount} matches`);
      
      // Only process if we found at least one valid word
      if (foundWordPaths.length > 0) {
        // Process the first found word
        const { word, path } = foundWordPaths[0];
        console.log('[WordBurst] Processing word:', word);
        console.log('[WordBurst] Word length:', word.length);
        console.log('[WordBurst] Word in ENGLISH_WORDS?', ENGLISH_WORDS.has(word));
        console.log('[WordBurst] Word already found?', foundWords.has(word));
        
        // Final validation - word MUST be in dictionary and 4+ letters
        if (!ENGLISH_WORDS.has(word) || word.length < 4) {
          console.error('[WordBurst] ❌ REJECTED - Invalid word:', word, {
            inDictionary: ENGLISH_WORDS.has(word),
            length: word.length,
            minLength: 4
          });
          isCheckingWordsRef.current = false;
          return;
        }
        
        // Verify the word is exactly as it appears in the dictionary (uppercase)
        const normalizedWord = word.toUpperCase().trim();
        console.log('[WordBurst] Normalized word:', normalizedWord);
        console.log('[WordBurst] Normalized word in ENGLISH_WORDS?', ENGLISH_WORDS.has(normalizedWord));
        
        if (!ENGLISH_WORDS.has(normalizedWord)) {
          console.error('[WordBurst] ❌ REJECTED - Word normalization failed:', word, '->', normalizedWord);
          isCheckingWordsRef.current = false;
          return;
        }
        
        // Word found and validated!
        console.log('[WordBurst] ✅ ACCEPTED - Valid word:', normalizedWord);
        const wordScore = normalizedWord.length * normalizedWord.length; // Longer words = exponentially higher score
        setScore((prev) => prev + wordScore);
        setFoundWords((prev) => new Set([...prev, normalizedWord]));
        
        // Step 1: Highlight the word (use normalized word)
        setLastFoundWord({ word: normalizedWord, path });

        // Step 2: After highlight, make it blank, then drop letters
        setTimeout(() => {
          // Make word cells blank
          setGrid((prevGrid) => {
            const newGrid = prevGrid.map((row) => [...row]);
            for (const { row: r, col: c } of path) {
              newGrid[r][c] = null;
            }
            return newGrid;
          });
          
          // Step 3: Drop letters down after blank animation
          setTimeout(() => {
            burstWord(path);
            isCheckingWordsRef.current = false;
          }, 200);
        }, 500); // Show highlight for 500ms
      } else {
        console.log('[WordBurst] No valid words found in grid');
        isCheckingWordsRef.current = false;
      }
    },
    [grid, foundWords, findWordInGrid]
  );

  // Burst word and drop letters
  const burstWord = useCallback(
    (path) => {
      // Use the current grid state
      setGrid((prevGrid) => {
        // Create a deep copy of the current grid
        const newGrid = prevGrid.map((row) => [...row]);
        
        // Get all columns that need letters to drop
        const columns = new Set(path.map((p) => p.col));
        
        // For each column, drop letters down vertically
        for (const col of columns) {
          // Get all affected rows in this column (from the word path)
          const affectedRows = path
            .filter((p) => p.col === col)
            .map((p) => p.row)
            .sort((a, b) => a - b); // Sort top to bottom

          // Drop letters down in this column
          // Start from bottom and work up
          for (let r = GRID_SIZE - 1; r >= 0; r--) {
            if (newGrid[r][col] === null) {
              // Find next letter above this position
              let foundAbove = false;
              for (let above = r - 1; above >= 0; above--) {
                if (newGrid[above][col] !== null) {
                  // Move letter down
                  newGrid[r][col] = newGrid[above][col];
                  newGrid[above][col] = null;
                  foundAbove = true;
                  break;
                }
              }
              // If no letter above, generate new one at the top
              if (!foundAbove) {
                newGrid[r][col] = getRandomLetter();
              }
            }
          }
        }

        // Check for more words after letters drop (with delay to ensure grid is updated)
        setTimeout(() => {
          isCheckingWordsRef.current = false; // Reset flag before checking
          checkForWords(newGrid);
        }, 300);

        return newGrid;
      });
      
      // Clear the bursting indicator after animation completes
      setTimeout(() => {
        setLastFoundWord(null);
      }, 100);
    },
    [checkForWords]
  );


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.scoreText}>Score: {score}</Text>
          <Text style={styles.timerText}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </Text>
        </View>
      </View>

      <Text style={styles.instructionText}>
        Swipe to swap letters and form words (4+ letters)
      </Text>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={false}
      >
        <View
          style={styles.gridContainer}
          {...panResponder.panHandlers}
          collapsable={false}
        >
          {grid.map((row, r) => (
            <View key={`row-${r}`} style={styles.row}>
              {row.map((letter, c) => {
                const isSelected =
                  selectedCell?.row === r && selectedCell?.col === c;
                const isBursting =
                  lastFoundWord?.path.some(
                    (p) => p.row === r && p.col === c
                  ) || false;
                const isEmpty = letter === null;

                return (
                  <View
                    key={`cell-${r}-${c}`}
                    style={[
                      styles.cell,
                      { width: CELL, height: CELL },
                      isSelected && styles.cellSelected,
                      isBursting && styles.cellBursting,
                      isEmpty && styles.cellEmpty,
                    ]}
                    pointerEvents="none"
                  >
                    {!isEmpty && (
                      <Text
                        style={[
                          styles.letter,
                          { fontSize: letterFontSize },
                          isSelected && styles.letterSelected,
                        ]}
                      >
                        {letter}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {gameOver && (
        <View style={styles.gameOverOverlay}>
          <Text style={styles.gameOverText}>Time's Up!</Text>
          <Text style={styles.finalScoreText}>Final Score: {score}</Text>
          <Text style={styles.wordsFoundText}>
            Words Found: {foundWords.size}
          </Text>
          <TouchableOpacity
            style={styles.playAgainButton}
            onPress={() => {
              setGrid(generateGrid());
              setScore(0);
              setTimeLeft(GAME_DURATION);
              setGameOver(false);
              setFoundWords(new Set());
              setSelectedCell(null);
              setLastFoundWord(null);
            }}
          >
            <Text style={styles.playAgainButtonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#000000',
  },
  headerInfo: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E91E63',
  },
  instructionText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
    paddingBottom: 32,
  },
  gridContainer: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  cellSelected: {
    backgroundColor: '#FFF9C4',
    borderColor: '#FFC107',
    borderWidth: 2,
  },
  cellBursting: {
    backgroundColor: '#4CAF50',
    borderColor: '#2E7D32',
    borderWidth: 2,
  },
  cellEmpty: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  letter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  letterSelected: {
    color: '#F57C00',
  },
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  finalScoreText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  wordsFoundText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 32,
  },
  playAgainButton: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  playAgainButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

