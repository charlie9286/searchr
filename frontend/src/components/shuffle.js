import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_HORIZONTAL_PADDING = 8; // Halved for more space

const normalizeGrid = (gridData = []) =>
  gridData.map((row) => {
    if (Array.isArray(row)) return [...row];
    if (typeof row === 'string') return row.split('');
    return Array.from(String(row ?? ''));
  });

const getGridSignature = (gridData = []) =>
  JSON.stringify(normalizeGrid(gridData));

const getPlacementsSignature = (placements = []) =>
  JSON.stringify(placements ?? []);

export default function ShuffleGrid({
  grid,
  placements,
  foundWords,
  opponentFoundWords,
  onWordFound,
  scrollViewRef,
}) {
  const baseGridRef = useRef(normalizeGrid(grid));
  const basePlacementsRef = useRef(placements || []);
  const gridSignatureRef = useRef(getGridSignature(grid));
  const placementsSignatureRef = useRef(getPlacementsSignature(placements));

  const [renderGrid, setRenderGrid] = useState(baseGridRef.current);
  const [renderPlacements, setRenderPlacements] = useState(
    basePlacementsRef.current
  );
  const numRows = renderGrid.length;
  const numCols = renderGrid[0]?.length || 0;

  const [selectedPath, setSelectedPath] = useState([]);
  const [startCell, setStartCell] = useState(null);
  const isDraggingRef = useRef(false);
  const establishedDirectionRef = useRef(null);

  const [isReshuffling, setIsReshuffling] = useState(false);

  const shuffleTimerRef = useRef(null);

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
    const relativeY = y - 4; // Halved vertical padding
    const relativeX = x - GRID_HORIZONTAL_PADDING;
    if (relativeY < 0 || relativeX < 0) return null;
    const row = Math.floor(relativeY / CELL);
    const col = Math.floor(relativeX / CELL);
    if (row >= 0 && row < numRows && col >= 0 && col < numCols) {
      return { row, col };
    }
    return null;
  };

  const buildPath = (start, end) => {
    const path = [start];
    const dr = end.row - start.row;
    const dc = end.col - start.col;
    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    if (steps === 0) return path;
    const dirR = dr === 0 ? 0 : dr / Math.abs(dr);
    const dirC = dc === 0 ? 0 : dc / Math.abs(dc);

    for (let i = 1; i <= steps; i += 1) {
      const row = start.row + Math.round(dirR * i);
      const col = start.col + Math.round(dirC * i);
      path.push({ row, col });
    }
    return path;
  };

  const handleTouchStart = useCallback(
    (evt) => {
      if (isReshuffling) return;
      isDraggingRef.current = true;
      establishedDirectionRef.current = null;
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
    [isReshuffling, scrollViewRef]
  );

  const handleTouchMove = useCallback(
    (evt) => {
      if (isReshuffling) return;
      if (!isDraggingRef.current) return;

      if (!startCell) {
        const touch = evt.nativeEvent.touches?.[0];
        if (!touch) return;
        const cell = getCellFromCoordinates(
          touch.locationX || touch.pageX,
          touch.locationY || touch.pageY
        );
        if (cell) {
          setStartCell(cell);
          setSelectedPath([cell]);
        }
        return;
      }

      const touch = evt.nativeEvent.touches?.[0];
      if (!touch) return;
      const cell = getCellFromCoordinates(
        touch.locationX || touch.pageX,
        touch.locationY || touch.pageY
      );

      if (cell && startCell) {
        const path = buildPath(startCell, cell);

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
    },
    [startCell, isReshuffling]
  );

  const checkWordPath = useCallback(
    (path) => {
      if (path.length < 3) return;
      const start = path[0];
      const end = path[path.length - 1];
      const dx = end.col - start.col;
      const dy = end.row - start.row;
      const len = path.length;
      const dirX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
      const dirY = dy === 0 ? 0 : dy > 0 ? 1 : -1;

      // Use renderPlacements from state via a ref to ensure we have the latest
      const currentPlacements = renderPlacements || [];
      const currentFoundWords = foundWords;

      for (const placement of currentPlacements) {
        const { word, row: pRow, col: pCol, dr, dc } = placement;
        if (currentFoundWords?.has(word)) continue;

        if (
          start.row === pRow &&
          start.col === pCol &&
          dirX === dc &&
          dirY === dr &&
          len === word.length
        ) {
          let match = true;
          for (let i = 0; i < len; i += 1) {
            const expectedRow = pRow + dr * i;
            const expectedCol = pCol + dc * i;
            const cell = path[i];
            if (!cell || cell.row !== expectedRow || cell.col !== expectedCol) {
              match = false;
              break;
            }
          }
          if (match) {
            notifyWordFound(word);
            return;
          }
        }

        const reversedDirX = -dirX;
        const reversedDirY = -dirY;
        if (
          end.row === pRow &&
          end.col === pCol &&
          reversedDirX === dc &&
          reversedDirY === dr &&
          len === word.length
        ) {
          let match = true;
          const reversedPath = [...path].reverse();
          for (let i = 0; i < len; i += 1) {
            const expectedRow = pRow + dr * i;
            const expectedCol = pCol + dc * i;
            const cell = reversedPath[i];
            if (!cell || cell.row !== expectedRow || cell.col !== expectedCol) {
              match = false;
              break;
            }
          }
          if (match) {
            notifyWordFound(word);
            return;
          }
        }
      }
    },
    [renderPlacements, foundWords, notifyWordFound]
  );

  const handleTouchEnd = useCallback(() => {
    if (isReshuffling) return;
    isDraggingRef.current = false;
    establishedDirectionRef.current = null;
    if (scrollViewRef?.current) {
      scrollViewRef.current.setNativeProps({ scrollEnabled: true });
    }
    setSelectedPath((currentPath) => {
      if (currentPath.length > 0) {
        checkWordPath(currentPath);
      }
      setTimeout(() => {
        setSelectedPath([]);
        setStartCell(null);
      }, 300);
      return currentPath;
    });
  }, [isReshuffling, scrollViewRef, checkWordPath]);

  const handleTouchCancel = useCallback(() => {
    isDraggingRef.current = false;
    establishedDirectionRef.current = null;
    if (scrollViewRef?.current) {
      scrollViewRef.current.setNativeProps({ scrollEnabled: true });
    }
    setSelectedPath([]);
    setStartCell(null);
  }, [scrollViewRef]);

  const opponentWordsSet = useMemo(() => {
    if (!opponentFoundWords) return new Set();
    if (opponentFoundWords instanceof Set) return opponentFoundWords;
    if (Array.isArray(opponentFoundWords)) return new Set(opponentFoundWords);
    return new Set();
  }, [opponentFoundWords]);

  const isCellHighlightedForWords = (wordSet, row, col) => {
    if (
      !renderPlacements ||
      renderPlacements.length === 0 ||
      !wordSet ||
      wordSet.size === 0
    ) {
      return false;
    }
    for (const p of renderPlacements) {
      if (!wordSet.has(p.word)) continue;
      const len = p.word.length;
      for (let i = 0; i < len; i += 1) {
        const r = p.row + p.dr * i;
        const c = p.col + p.dc * i;
        if (r === row && c === col) return true;
      }
    }
    return false;
  };

  const isCellHighlighted = (row, col) =>
    isCellHighlightedForWords(foundWords, row, col);
  const isCellHighlightedByOpponent = (row, col) =>
    isCellHighlightedForWords(opponentWordsSet, row, col);

  const isCellSelected = (row, col) =>
    selectedPath.some((cell) => cell.row === row && cell.col === col);

  // Define applyTransformation BEFORE any useEffect that uses it
  const applyTransformation = useCallback(() => {
    if (shuffleTimerRef.current) {
      clearInterval(shuffleTimerRef.current);
    }
    const sourceGrid = baseGridRef.current;
    const sourcePlacements = basePlacementsRef.current;
    if (!sourceGrid?.length || !sourceGrid[0]?.length) return;
    const numR = sourceGrid.length;
    const numC = sourceGrid[0].length;

    setIsReshuffling(true);

    const flipH = Math.random() < 0.5;
    const flipV = Math.random() < 0.5;

    const mapCoord = (row, col) => {
      let newRow = row;
      let newCol = col;
      if (flipV) newRow = numR - 1 - newRow;
      if (flipH) newCol = numC - 1 - newCol;
      return { row: newRow, col: newCol };
    };

    const newGrid = Array.from({ length: numR }, () =>
      Array(numC).fill('')
    );
    for (let r = 0; r < numR; r += 1) {
      for (let c = 0; c < numC; c += 1) {
        const { row: nr, col: nc } = mapCoord(r, c);
        newGrid[nr][nc] = sourceGrid[r][c];
      }
    }

    const newPlacements = (sourcePlacements || []).map((placement) => {
      const { row: nr, col: nc } = mapCoord(placement.row, placement.col);
      let dr = placement.dr;
      let dc = placement.dc;
      if (flipV) dr = -dr;
      if (flipH) dc = -dc;
      return { ...placement, row: nr, col: nc, dr, dc };
    });

    setRenderGrid(newGrid);
    setRenderPlacements(newPlacements);
    baseGridRef.current = newGrid;
    basePlacementsRef.current = newPlacements;

    setIsReshuffling(false);
    shuffleTimerRef.current = setInterval(() => {
      applyTransformation();
    }, 30000);
  }, []);

  useEffect(() => {
    const normalizedGrid = normalizeGrid(grid);
    const normalizedPlacements = placements || [];
    const gridSignature = getGridSignature(grid);
    const placementsSignature = getPlacementsSignature(placements);

    const hasGridChanged = gridSignatureRef.current !== gridSignature;
    const havePlacementsChanged =
      placementsSignatureRef.current !== placementsSignature;

    if (!hasGridChanged && !havePlacementsChanged) {
      return;
    }

    gridSignatureRef.current = gridSignature;
    placementsSignatureRef.current = placementsSignature;

    baseGridRef.current = normalizedGrid;
    basePlacementsRef.current = normalizedPlacements;
    setRenderGrid(baseGridRef.current);
    setRenderPlacements(basePlacementsRef.current);
    if (shuffleTimerRef.current) {
      clearInterval(shuffleTimerRef.current);
    }
    shuffleTimerRef.current = setInterval(() => {
      applyTransformation();
    }, 30000);
  }, [grid, placements, applyTransformation]);

  useEffect(() => {
    if (!renderGrid?.length) return;
    shuffleTimerRef.current = setInterval(() => {
      applyTransformation();
    }, 30000);
    return () => {
      if (shuffleTimerRef.current) clearInterval(shuffleTimerRef.current);
    };
  }, [applyTransformation, renderGrid?.length]);

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
            const ch = renderGrid[r][c];
            const highlighted = isCellHighlighted(r, c);
            const opponentHighlighted =
              isCellHighlightedByOpponent(r, c) && !highlighted;
            const selected = isCellSelected(r, c);
            return (
              <View
                key={`c-${r}-${c}`}
                style={[
                  styles.cell,
                  { width: CELL, height: CELL },
                  highlighted && styles.cellHighlighted,
                  opponentHighlighted && styles.cellOpponent,
                  selected && styles.cellSelected,
                ]}
                pointerEvents="none"
              >
                <Text
                  style={[
                    [styles.letter, { fontSize: letterFontSize }],
                    highlighted && styles.letterHighlighted,
                    opponentHighlighted && styles.letterOpponent,
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
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    paddingVertical: 4, // Halved vertical padding
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

