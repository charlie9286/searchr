import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_HORIZONTAL_PADDING = 32; // Padding on each side of the grid

// Renders a word search grid. Highlights words in foundWords using placements.
export default function WordSearchGrid({ grid, placements, foundWords, opponentFoundWords, onWordFound, scrollViewRef }) {
  const numRows = grid.length;
  const numCols = grid[0]?.length || 0;
  const [selectedPath, setSelectedPath] = useState([]);
  const [startCell, setStartCell] = useState(null);
  const isDraggingRef = useRef(false);
  const establishedDirectionRef = useRef(null);

  // Calculate cell size based on available screen width
  const cellSize = useMemo(() => {
    const availableWidth = SCREEN_WIDTH - GRID_HORIZONTAL_PADDING;
    const calculatedSize = Math.floor(availableWidth / numCols);
    return Math.max(20, Math.min(calculatedSize, 32)); // Min 20px, Max 32px
  }, [numCols]);

  const CELL = cellSize;

  const getCellFromCoordinates = (x, y) => {
    // Account for container padding (paddingVertical: 8)
    const relativeY = y - 8;
    const row = Math.floor(relativeY / CELL);
    const col = Math.floor(x / CELL);
    
    // Clamp to valid grid bounds
    if (row >= 0 && row < numRows && col >= 0 && col < numCols) {
      return { row, col };
    }
    return null;
  };

  // Build a straight line path between two cells
  const buildPath = (start, end) => {
    const path = [start];
    const dr = end.row - start.row;
    const dc = end.col - start.col;
    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    
    if (steps === 0) return path;
    
    const dirR = dr === 0 ? 0 : dr / Math.abs(dr);
    const dirC = dc === 0 ? 0 : dc / Math.abs(dc);
    
    for (let i = 1; i <= steps; i++) {
      const row = start.row + Math.round(dirR * i);
      const col = start.col + Math.round(dirC * i);
      path.push({ row, col });
    }
    
    return path;
  };

  // Touch handlers using direct event handlers
  const handleTouchStart = useCallback((evt) => {
    isDraggingRef.current = true;
    establishedDirectionRef.current = null;
    // Disable scrolling while dragging
    if (scrollViewRef?.current) {
      scrollViewRef.current.setNativeProps({ scrollEnabled: false });
    }
    const touch = evt.nativeEvent.touches?.[0];
    if (!touch) return;
    // Use locationX/locationY which are relative to the view
    const x = touch.locationX ?? touch.pageX;
    const y = touch.locationY ?? touch.pageY;
    const cell = getCellFromCoordinates(x, y);
    if (cell) {
      setStartCell(cell);
      setSelectedPath([cell]);
    }
  }, []);

  const handleTouchMove = useCallback((evt) => {
    if (!isDraggingRef.current) return;
    
    if (!startCell) {
      // If no start cell yet, try to get one from current position
      const touch = evt.nativeEvent.touches?.[0];
      if (!touch) return;
      const cell = getCellFromCoordinates(touch.locationX || touch.pageX, touch.locationY || touch.pageY);
      if (cell) {
        setStartCell(cell);
        setSelectedPath([cell]);
      }
      return;
    }
    
    const touch = evt.nativeEvent.touches?.[0];
    if (!touch) return;
    const cell = getCellFromCoordinates(touch.locationX || touch.pageX, touch.locationY || touch.pageY);
    
    if (cell && startCell) {
      // Build a straight line path from start to current cell
      const path = buildPath(startCell, cell);
      
      // Establish direction on first non-start cell
      if (path.length > 1 && !establishedDirectionRef.current) {
        const dr = path[1].row - path[0].row;
        const dc = path[1].col - path[0].col;
        establishedDirectionRef.current = {
          dr: dr === 0 ? 0 : dr / Math.abs(dr),
          dc: dc === 0 ? 0 : dc / Math.abs(dc),
        };
      }
      
      setSelectedPath(path);
    }
  }, [startCell]);

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
    establishedDirectionRef.current = null;
    // Re-enable scrolling
    if (scrollViewRef?.current) {
      scrollViewRef.current.setNativeProps({ scrollEnabled: true });
    }
    setSelectedPath(currentPath => {
      if (currentPath.length > 0) {
        checkWordPath(currentPath);
      }
      setTimeout(() => {
        setSelectedPath([]);
        setStartCell(null);
      }, 300);
      return currentPath;
    });
  }, []);
  
  const handleTouchCancel = useCallback(() => {
    isDraggingRef.current = false;
    establishedDirectionRef.current = null;
    // Re-enable scrolling if cancelled
    if (scrollViewRef?.current) {
      scrollViewRef.current.setNativeProps({ scrollEnabled: true });
    }
    setSelectedPath([]);
    setStartCell(null);
  }, []);

  const checkWordPath = (path) => {
    if (path.length < 3) return;

    const start = path[0];
    const end = path[path.length - 1];
    const dx = end.col - start.col;
    const dy = end.row - start.row;
    const len = path.length;
    const dirX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
    const dirY = dy === 0 ? 0 : dy > 0 ? 1 : -1;

    for (const placement of placements || []) {
      const { word, row: pRow, col: pCol, dr, dc } = placement;
      
      if (foundWords?.has(word)) {
        continue;
      }
      
      // Check if path matches this placement (either forward or backward)
      // Try forward direction first
      if (start.row === pRow && start.col === pCol && dirX === dc && dirY === dr && len === word.length) {
        let match = true;
        for (let i = 0; i < len; i++) {
          const expectedRow = pRow + dr * i;
          const expectedCol = pCol + dc * i;
          const cell = path[i];
          if (!cell || cell.row !== expectedRow || cell.col !== expectedCol) {
            match = false;
            break;
          }
        }
        if (match) {
          if (onWordFound) {
            onWordFound(word);
          }
          return;
        }
      }
      
      // Try reverse direction (end is start, reversed direction, reversed path)
      const reversedDirX = -dirX;
      const reversedDirY = -dirY;
      if (end.row === pRow && end.col === pCol && reversedDirX === dc && reversedDirY === dr && len === word.length) {
        let match = true;
        const reversedPath = [...path].reverse();
        for (let i = 0; i < len; i++) {
          const expectedRow = pRow + dr * i;
          const expectedCol = pCol + dc * i;
          const cell = reversedPath[i];
          if (!cell || cell.row !== expectedRow || cell.col !== expectedCol) {
            match = false;
            break;
          }
        }
        if (match) {
          if (onWordFound) {
            onWordFound(word);
          }
          return;
        }
      }
    }
  };

  const opponentWordsSet = useMemo(() => {
    if (!opponentFoundWords) return new Set();
    if (opponentFoundWords instanceof Set) return opponentFoundWords;
    if (Array.isArray(opponentFoundWords)) return new Set(opponentFoundWords);
    return new Set();
  }, [opponentFoundWords]);

  const isCellHighlightedForWords = (wordSet, row, col) => {
    if (!placements || placements.length === 0 || !wordSet || wordSet.size === 0) return false;
    for (const p of placements) {
      if (!wordSet.has(p.word)) continue;
      const len = p.word.length;
      for (let i = 0; i < len; i++) {
        const r = p.row + p.dr * i;
        const c = p.col + p.dc * i;
        if (r === row && c === col) return true;
      }
    }
    return false;
  };

  const isCellHighlighted = (row, col) => isCellHighlightedForWords(foundWords, row, col);
  const isCellHighlightedByOpponent = (row, col) => isCellHighlightedForWords(opponentWordsSet, row, col);

  const isCellSelected = (row, col) => {
    return selectedPath.some(cell => cell.row === row && cell.col === col);
  };

  return (
    <View 
      style={styles.container} 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      accessibilityRole="image" 
      accessibilityLabel="Word search grid"
      collapsable={false}
    >
      {Array.from({ length: numRows }).map((_, r) => (
        <View key={`r-${r}`} style={styles.row}>
          {Array.from({ length: numCols }).map((__, c) => {
            const ch = grid[r][c];
            const highlighted = isCellHighlighted(r, c);
            const opponentHighlighted = isCellHighlightedByOpponent(r, c) && !highlighted;
            const selected = isCellSelected(r, c);
            return (
              <View 
                key={`c-${r}-${c}`} 
                style={[
                  styles.cell,
                  { width: CELL, height: CELL }, 
                  highlighted && styles.cellHighlighted,
                  opponentHighlighted && styles.cellOpponent,
                  selected && styles.cellSelected
                ]}
                pointerEvents="none"
              >
                <Text style={[
                  styles.letter, 
                  highlighted && styles.letterHighlighted,
                  opponentHighlighted && styles.letterOpponent,
                  selected && styles.letterSelected
                ]}>{ch}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  cellHighlighted: {
    backgroundColor: '#E3F2FD',
    borderColor: '#90CAF9',
  },
  cellOpponent: {
    backgroundColor: '#FCE4EC',
    borderColor: '#F48FB1',
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
  letterOpponent: {
    color: '#AD1457',
  },
  letterSelected: {
    color: '#F57C00',
  },
});
