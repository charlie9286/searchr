import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Share,
} from 'react-native';
import CrosswordGrid from '../components/CrosswordGrid';
import CluePanel from '../components/CluePanel';

export default function CrosswordScreen({
  crossword,
  topic,
  onBack,
  onShuffle,
  onNewTopic,
}) {
  const [selectedWord, setSelectedWord] = useState(null);
  const [selectedDirection, setSelectedDirection] = useState('across');
  const [filledCells, setFilledCells] = useState({});

  const handleCellPress = (row, col) => {
    // Find the word that this cell is part of
    const word = findWordAtPosition(row, col, selectedDirection);
    if (word) {
      setSelectedWord(word);
    }
  };

  const findWordAtPosition = (row, col, direction) => {
    const words = crossword.clues[direction] || [];
    for (const clue of words) {
      const { position } = clue;
      const [startRow, startCol] = position.split(',').map(Number);
      
      if (direction === 'across') {
        if (row === startRow && col >= startCol && col < startCol + clue.answer.length) {
          return clue;
        }
      } else {
        if (col === startCol && row >= startRow && row < startRow + clue.answer.length) {
          return clue;
        }
      }
    }
    return null;
  };

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `Check out this crossword puzzle about "${topic}"!`,
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share crossword');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <View style={styles.topicContainer}>
          <Text style={styles.topicText}>{topic}</Text>
        </View>
        
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.gridContainer}>
          <CrosswordGrid
            grid={crossword.grid}
            clues={crossword.clues}
            onCellPress={handleCellPress}
            selectedWord={selectedWord}
            selectedDirection={selectedDirection}
            filledCells={filledCells}
          />
        </View>

        <View style={styles.directionToggle}>
          <TouchableOpacity
            style={[
              styles.directionButton,
              selectedDirection === 'across' && styles.directionButtonActive,
            ]}
            onPress={() => {
              setSelectedDirection('across');
              setSelectedWord(null);
            }}
          >
            <Text
              style={[
                styles.directionButtonText,
                selectedDirection === 'across' && styles.directionButtonTextActive,
              ]}
            >
              Across
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.directionButton,
              selectedDirection === 'down' && styles.directionButtonActive,
            ]}
            onPress={() => {
              setSelectedDirection('down');
              setSelectedWord(null);
            }}
          >
            <Text
              style={[
                styles.directionButtonText,
                selectedDirection === 'down' && styles.directionButtonTextActive,
              ]}
            >
              Down
            </Text>
          </TouchableOpacity>
        </View>

        <CluePanel
          clues={crossword.clues[selectedDirection] || []}
          selectedWord={selectedWord}
          onCluePress={(clue) => setSelectedWord(clue)}
        />

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={onShuffle}>
            <Text style={styles.actionButtonText}>Shuffle Layout</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={onNewTopic}>
            <Text style={styles.actionButtonText}>New Topic</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#000000',
  },
  topicContainer: {
    flex: 1,
    alignItems: 'center',
  },
  topicText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  shareButton: {
    padding: 8,
  },
  shareButtonText: {
    fontSize: 16,
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  directionToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
  },
  directionButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    marginHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  directionButtonActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  directionButtonText: {
    fontSize: 16,
    color: '#000000',
  },
  directionButtonTextActive: {
    color: '#FFFFFF',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});


