import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';

const CELL_SIZE = 35;
const { width } = Dimensions.get('window');
const GRID_PADDING = 16;

export default function CrosswordGrid({
  grid,
  clues,
  onCellPress,
  selectedWord,
  selectedDirection,
  filledCells,
}) {
  const maxCols = Math.max(...grid.map(row => row.length));
  const gridWidth = Math.min(maxCols * CELL_SIZE, width - GRID_PADDING * 2);

  const getCellClueNumber = (row, col) => {
    for (const direction of ['across', 'down']) {
      const words = clues[direction] || [];
      for (const clue of words) {
        const [startRow, startCol] = clue.position.split(',').map(Number);
        if (startRow === row && startCol === col) {
          return clue.number;
        }
      }
    }
    return null;
  };

  const isCellInSelectedWord = (row, col) => {
    if (!selectedWord) return false;
    
    const [startRow, startCol] = selectedWord.position.split(',').map(Number);
    
    if (selectedDirection === 'across') {
      return row === startRow && col >= startCol && col < startCol + selectedWord.answer.length;
    } else {
      return col === startCol && row >= startRow && row < startRow + selectedWord.answer.length;
    }
  };

  const renderCell = (cell, row, col) => {
    const clueNumber = getCellClueNumber(row, col);
    const isSelected = isCellInSelectedWord(row, col);
    const isFilled = filledCells[`${row},${col}`];

    if (cell === '#') {
      return (
        <View
          key={`${row}-${col}`}
          style={[styles.cell, styles.blackCell]}
        />
      );
    }

    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={[styles.cell, styles.whiteCell, isSelected && styles.selectedCell]}
        onPress={() => onCellPress(row, col)}
        accessibilityLabel={`Cell ${row + 1}, ${col + 1}${clueNumber ? `, clue ${clueNumber}` : ''}${isFilled ? `, filled with ${isFilled}` : ', empty'}`}
      >
        {clueNumber && (
          <Text style={styles.clueNumber}>{clueNumber}</Text>
        )}
        <Text style={styles.cellLetter}>{isFilled || ''}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.grid, { width: gridWidth }]}>
      {grid.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blackCell: {
    backgroundColor: '#000000',
  },
  whiteCell: {
    backgroundColor: '#FFFFFF',
  },
  selectedCell: {
    backgroundColor: '#FFF9C4',
  },
  clueNumber: {
    position: 'absolute',
    top: 2,
    left: 3,
    fontSize: 10,
    fontWeight: '600',
    color: '#000000',
  },
  cellLetter: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});


