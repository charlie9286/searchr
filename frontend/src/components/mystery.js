import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import WordSearchGrid from './WordSearchGrid';

export default function Mystery({
  puzzle,
  topic,
  onBack,
  onNewTopic,
}) {
  const [foundWords, setFoundWords] = useState(new Set());
  const scrollViewRef = useRef(null);

  // Reset found words when puzzle changes
  useEffect(() => {
    setFoundWords(new Set());
  }, [topic, puzzle]);

  const totalWords = puzzle.words?.length || 0;
  const foundCount = foundWords.size;
  const wordsLeft = totalWords - foundCount;
  const progressText = wordsLeft > 0 ? `${wordsLeft} word${wordsLeft === 1 ? '' : 's'} left` : 'All words found!';

  const handleWordFound = (word) => {
    setFoundWords(prev => {
      // Don't trigger haptics if word was already found
      if (prev.has(word)) {
        return prev;
      }
      
      // Trigger haptic feedback for word found
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      const next = new Set(prev);
      next.add(word);
      return next;
    });
  };

  const allFound = puzzle.words?.every(w => foundWords.has(w));

  const handlePlayAgain = useCallback(() => {
    if (typeof onNewTopic === 'function') {
      onNewTopic();
    }
  }, [onNewTopic]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Text style={styles.headerText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{topic}</Text>
          <Text style={styles.progress}>{progressText}</Text>
        </View>
        <TouchableOpacity onPress={onNewTopic} style={styles.headerButton}>
          <Text style={styles.headerText}>New Topic</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollViewRef} 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        scrollEnabled={true}
      >
        <WordSearchGrid 
          grid={puzzle.grid.map(row => row.split ? row.split('') : row)} 
          placements={puzzle.placements} 
          foundWords={foundWords}
          opponentFoundWords={new Set()}
          onWordFound={handleWordFound}
          scrollViewRef={scrollViewRef}
        />
      </ScrollView>

      {allFound && (
        <View style={styles.completionCard}>
          <Text style={styles.completionTitle}>Mystery Solved!</Text>
          <Text style={styles.completionSubtitle}>Great job finding every word.</Text>
          <TouchableOpacity style={styles.playAgainButton} onPress={handlePlayAgain}>
            <Text style={styles.playAgainText}>Play Again</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerButton: {
    padding: 8,
    minWidth: 80,
  },
  headerText: {
    fontSize: 16,
    color: '#000000',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  progress: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  completionCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#F1F8E9',
    borderWidth: 1,
    borderColor: '#C5E1A5',
    alignItems: 'center',
  },
  completionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B5E20',
    marginBottom: 8,
  },
  completionSubtitle: {
    fontSize: 16,
    color: '#33691E',
    marginBottom: 20,
  },
  playAgainButton: {
    width: '90%',
    backgroundColor: '#1B5E20',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  playAgainText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

