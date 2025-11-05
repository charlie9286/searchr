import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import WordSearchGrid from '../components/WordSearchGrid';
import WordList from '../components/WordList';

export default function WordSearchScreen({ puzzle, topic, onBack, onNewTopic }) {
  const [foundWords, setFoundWords] = useState(new Set());
  const scrollViewRef = useRef(null);

  // Reset found words when puzzle changes
  useEffect(() => {
    setFoundWords(new Set());
  }, [topic, puzzle]);


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
  const foundCount = foundWords.size;
  const totalWords = puzzle.words?.length || 0;
  const progressText = `${foundCount}/${totalWords}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}><Text style={styles.headerText}>← Back</Text></TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{topic}</Text>
          <Text style={styles.progress}>{progressText} words found</Text>
        </View>
        <TouchableOpacity onPress={onNewTopic} style={styles.headerButton}><Text style={styles.headerText}>New Topic</Text></TouchableOpacity>
      </View>

      {allFound && (
        <View style={styles.banner}><Text style={styles.bannerText}>All words found! 🎉</Text></View>
      )}

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
          onWordFound={handleWordFound}
          scrollViewRef={scrollViewRef}
        />
        <WordList words={puzzle.words} foundWords={foundWords} />
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
  banner: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    alignItems: 'center',
  },
  bannerText: {
    color: '#1B5E20',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
