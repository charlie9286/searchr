import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { API_ENDPOINTS } from '../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_HORIZONTAL_PADDING = 16;

export default function ZigZag({ onBack }) {
  const [screen, setScreen] = useState('search'); // 'search' or 'game'
  const [topic, setTopic] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [puzzleData, setPuzzleData] = useState(null);
  const [foundWords, setFoundWords] = useState(new Set());
  const [selectedPath, setSelectedPath] = useState([]);
  const [startCell, setStartCell] = useState(null);
  const isDraggingRef = useRef(false);
  const scrollViewRef = useRef(null);

  const handleTextChange = (text) => {
    setTopic(text);
    setIsValid(text.trim().length >= 3);
  };

  const handleGenerate = async () => {
    if (!isValid) {
      Alert.alert('Invalid Topic', 'Please enter at least 3 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_ENDPOINTS.GENERATE_WORDSEARCH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate word search');
      }

      const data = await response.json();
      setPuzzleData(data);
      setFoundWords(new Set());
      setScreen('game');
    } catch (err) {
      console.error('Error generating zigzag puzzle:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (screen === 'search') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.searchContent}>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Zig Zag</Text>
          <Text style={styles.subtitle}>
            Connect adjacent letters to form words
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter a topic (e.g., 'Animals')"
              placeholderTextColor="#999"
              value={topic}
              onChangeText={handleTextChange}
              autoFocus
            />
          </View>

          {error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>
                Couldn't generate that. Try again.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.generateButton,
              (!isValid || loading) && styles.generateButtonDisabled,
            ]}
            onPress={handleGenerate}
            disabled={!isValid || loading}
          >
            <Text style={styles.generateButtonText}>
              {loading ? 'Generating...' : 'Generate Puzzle'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (!puzzleData) {
    return null;
  }

  return (
    <ZigZagGrid
      puzzle={puzzleData}
      topic={topic}
      foundWords={foundWords}
      onWordFound={(word) => {
        setFoundWords((prev) => new Set([...prev, word]));
      }}
      onBack={() => {
        setScreen('search');
        setPuzzleData(null);
        setFoundWords(new Set());
      }}
      scrollViewRef={scrollViewRef}
    />
  );
}

function ZigZagGrid({
  puzzle,
  topic,
  foundWords,
  onWordFound,
  onBack,
  scrollViewRef,
}) {
  const grid = puzzle.grid || [];
  const words = puzzle.words || [];
  const numRows = grid.length;
  const numCols = grid[0]?.length || 0;

  const [selectedPath, setSelectedPath] = useState([]);
  const [startCell, setStartCell] = useState(null);
  const isDraggingRef = useRef(false);

  const notifyWordFound = useCallback(
    (word) => {
      if (typeof onWordFound !== 'function') return;
      requestAnimationFrame(() => {
        onWordFound(word);
      });
    },
    [onWordFound]
  );

  const cellSize = useMemo(() => {
    const availableWidth = SCREEN_WIDTH - GRID_HORIZONTAL_PADDING * 2;
    const calculatedSize = Math.floor(availableWidth / numCols);
    return Math.max(20, Math.min(calculatedSize, 40));
  }, [numCols]);

  const CELL = cellSize;
  const letterFontSize = useMemo(
    () => Math.max(14, Math.min(CELL * 0.6, 26)),
    [CELL]
  );

  const getCellFromCoordinates = (x, y) => {
    const relativeY = y - 8;
    const relativeX = x - GRID_HORIZONTAL_PADDING;
    if (relativeY < 0 || relativeX < 0) return null;
    const row = Math.floor(relativeY / CELL);
    const col = Math.floor(relativeX / CELL);
    if (row >= 0 && row < numRows && col >= 0 && col < numCols) {
      return { row, col };
    }
    return null;
  };

  // Check if two cells are adjacent (including diagonals)
  const areAdjacent = (cell1, cell2) => {
    if (!cell1 || !cell2) return false;
    const rowDiff = Math.abs(cell1.row - cell2.row);
    const colDiff = Math.abs(cell1.col - cell2.col);
    return rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
  };

  const handleTouchStart = useCallback(
    (evt) => {
      isDraggingRef.current = true;
      if (scrollViewRef?.current) {
        scrollViewRef.current.setNativeProps({ scrollEnabled: false });
      }
      const touch = evt.nativeEvent.touches?.[0];
      if (!touch) return;
      const x = touch.locationX ?? touch.pageX;
      const y = touch.locationY ?? touch.pageY;
      const cell = getCellFromCoordinates(x, y);
      if (cell) {
        setStartCell(cell);
        setSelectedPath([cell]);
      }
    },
    [scrollViewRef]
  );

  const handleTouchMove = useCallback(
    (evt) => {
      if (!isDraggingRef.current || !startCell) return;

      const touch = evt.nativeEvent.touches?.[0];
      if (!touch) return;
      const cell = getCellFromCoordinates(
        touch.locationX || touch.pageX,
        touch.locationY || touch.pageY
      );

      if (!cell) return;

      // For zigzag, we allow any adjacent cell to be added to the path
      // Check if cell is adjacent to the last cell in the current path
      setSelectedPath((prevPath) => {
        if (prevPath.length === 0) {
          return [cell];
        }

        const lastCell = prevPath[prevPath.length - 1];
        
        // Check if this cell is already in the path (prevent immediate backtracking)
        const alreadyInPath = prevPath.some(
          (p) => p.row === cell.row && p.col === cell.col
        );
        
        if (alreadyInPath) {
          // Allow backtracking one step (remove last cell if it's the previous one)
          if (
            prevPath.length > 1 &&
            prevPath[prevPath.length - 2].row === cell.row &&
            prevPath[prevPath.length - 2].col === cell.col
          ) {
            return prevPath.slice(0, -1);
          }
          return prevPath; // Don't add if already in path
        }

        // Only add if adjacent to the last cell
        if (areAdjacent(lastCell, cell)) {
          return [...prevPath, cell];
        }

        return prevPath;
      });
    },
    [startCell]
  );

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
    if (scrollViewRef?.current) {
      scrollViewRef.current.setNativeProps({ scrollEnabled: true });
    }

    setSelectedPath((currentPath) => {
      if (currentPath.length >= 3) {
        checkZigZagWord(currentPath);
      }
      setTimeout(() => {
        setSelectedPath([]);
        setStartCell(null);
      }, 300);
      return currentPath;
    });
  }, [scrollViewRef]);

  const handleTouchCancel = useCallback(() => {
    isDraggingRef.current = false;
    if (scrollViewRef?.current) {
      scrollViewRef.current.setNativeProps({ scrollEnabled: true });
    }
    setSelectedPath([]);
    setStartCell(null);
  }, [scrollViewRef]);

  // Check if the selected path forms a valid word (zigzag)
  const checkZigZagWord = (path) => {
    if (path.length < 3) return;

    // Build the word from the path
    const word = path
      .map(({ row, col }) => {
        if (row >= 0 && row < numRows && col >= 0 && col < numCols) {
          const rowStr = grid[row];
          if (rowStr && col < rowStr.length) {
            return rowStr[col];
          }
        }
        return '';
      })
      .join('')
      .toUpperCase();

    if (!word || word.length < 3) return;

    // Check if word matches any word in the word list (forward or reverse)
    const wordForward = word;
    const wordReverse = word.split('').reverse().join('');

    for (const targetWord of words) {
      const targetUpper = targetWord.toUpperCase();
      if (
        (wordForward === targetUpper || wordReverse === targetUpper) &&
        !foundWords.has(targetWord)
      ) {
        notifyWordFound(targetWord);
        return;
      }
    }
  };

  const isCellHighlighted = (row, col) => {
    // Check if this cell is part of any found word
    // Since we don't have placements for zigzag, we'll highlight based on found words
    // For now, we'll just highlight selected cells and found words will be shown in the word list
    return false; // Could be enhanced to show found word paths
  };

  const isCellSelected = (row, col) => {
    return selectedPath.some((cell) => cell.row === row && cell.col === col);
  };

  const allWordsFound = words.every((word) => foundWords.has(word));

  return (
    <View style={styles.gameContainer}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.gameTitle}>Zig Zag</Text>
          <Text style={styles.topicText}>Topic: {topic}</Text>
        </View>

        <View
          style={styles.gridContainer}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          collapsable={false}
        >
          {Array.from({ length: numRows }).map((_, r) => (
            <View key={`r-${r}`} style={styles.row}>
              {Array.from({ length: numCols }).map((__, c) => {
                const ch = grid[r]?.[c] || '';
                const highlighted = isCellHighlighted(r, c);
                const selected = isCellSelected(r, c);

                return (
                  <View
                    key={`c-${r}-${c}`}
                    style={[
                      styles.cell,
                      { width: CELL, height: CELL },
                      highlighted && styles.cellHighlighted,
                      selected && styles.cellSelected,
                    ]}
                    pointerEvents="none"
                  >
                    <Text
                      style={[
                        styles.letter,
                        { fontSize: letterFontSize },
                        highlighted && styles.letterHighlighted,
                        selected && styles.letterSelected,
                      ]}
                    >
                      {ch}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.wordListContainer}>
          <Text style={styles.wordListTitle}>Words to Find:</Text>
          <View style={styles.wordList}>
            {words.map((word, idx) => {
              const found = foundWords.has(word);
              return (
                <Text
                  key={idx}
                  style={[styles.wordItem, found && styles.wordItemFound]}
                >
                  {word}
                </Text>
              );
            })}
          </View>
        </View>

        {allWordsFound && (
          <View style={styles.completionCard}>
            <Text style={styles.completionMessage}>
              🎉 All words found!
            </Text>
            <TouchableOpacity
              style={styles.playAgainButton}
              onPress={() => {
                onBack();
              }}
            >
              <Text style={styles.playAgainButtonText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    padding: 8,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 16,
    color: '#000000',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    height: 56,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  generateButton: {
    height: 56,
    backgroundColor: '#E91E63',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  generateButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 16,
    textAlign: 'center',
  },
  gameContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    alignItems: 'center',
  },
  gameTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  topicText: {
    fontSize: 16,
    color: '#666666',
  },
  gridContainer: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
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
  cellHighlighted: {
    backgroundColor: '#E3F2FD',
    borderColor: '#90CAF9',
  },
  cellSelected: {
    backgroundColor: '#FFF9C4',
    borderColor: '#FFC107',
  },
  letter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  letterHighlighted: {
    color: '#0D47A1',
  },
  letterSelected: {
    color: '#F57C00',
  },
  wordListContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  wordListTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
  },
  wordList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  wordItem: {
    fontSize: 16,
    color: '#666666',
    textDecorationLine: 'line-through',
    textDecorationColor: '#999999',
  },
  wordItemFound: {
    color: '#4CAF50',
    fontWeight: '600',
    textDecorationLine: 'none',
  },
  completionCard: {
    marginHorizontal: 24,
    marginTop: 32,
    padding: 24,
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    alignItems: 'center',
  },
  completionMessage: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 16,
    textAlign: 'center',
  },
  playAgainButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  playAgainButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

