import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import WordSearchGrid from '../components/WordSearchGrid';
import ShuffleGrid from '../components/shuffle';
import WordList from '../components/WordList';

const PRACTICE_TIME_LIMIT = 120; // 2 minutes in seconds

export default function WordSearchScreen({
  puzzle,
  topic,
  onBack,
  onNewTopic,
  mode = 'classic',
  onBroadcastWord,
  opponentFoundWords = [],
  onMatchComplete,
  onShowResult,
  playerLabel = 'You',
  opponentLabel = 'Opponent',
}) {
  const [foundWords, setFoundWords] = useState(new Set());
  const [timeElapsed, setTimeElapsed] = useState(mode === 'practice' ? 0 : null);
  const [matchOutcome, setMatchOutcome] = useState(null); // 'win' | 'lose' | 'draw'
  const scrollViewRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const hasBroadcastGameOverRef = useRef(false);
  const previousOpponentWordsRef = useRef(new Set());
  const WIN_THRESHOLD = 5; // First to 5 words wins

  // Reset found words when puzzle changes
  useEffect(() => {
    setFoundWords(new Set());
    if (mode === 'practice') {
      setTimeElapsed(0);
    }
    setMatchOutcome(null);
    hasBroadcastGameOverRef.current = false;
    previousOpponentWordsRef.current = new Set();
  }, [topic, puzzle, mode]);

  const opponentSet = useMemo(() => {
    if (opponentFoundWords instanceof Set) return opponentFoundWords;
    if (Array.isArray(opponentFoundWords)) return new Set(opponentFoundWords);
    return new Set();
  }, [opponentFoundWords]);

  const totalWords = puzzle.words?.length || 0;

  // Stopwatch logic for practice mode
  useEffect(() => {
    if (mode !== 'practice') {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };
    }

    const allFound = puzzle.words?.every(w => foundWords.has(w));
    if (allFound) {
      // Stop timer when all words are found
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    if (timerIntervalRef.current) {
      return; // Timer already running
    }

    // Start stopwatch
    timerIntervalRef.current = setInterval(() => {
      setTimeElapsed(prev => (prev !== null ? prev + 1 : 0));
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [mode, foundWords, puzzle.words]);

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

      if (mode === 'multiplayer' && typeof onBroadcastWord === 'function') {
        onBroadcastWord(word);
      }

      return next;
    });
  };

  useEffect(() => {
    if (mode !== 'multiplayer') {
      previousOpponentWordsRef.current = new Set(opponentSet);
      return;
    }

    // Track opponent words for match completion logic
    previousOpponentWordsRef.current = new Set(opponentSet);
  }, [opponentSet, mode]);

  const allFound = puzzle.words?.every(w => foundWords.has(w));
  const foundCount = foundWords.size;
  const progressText = `${foundCount}/${totalWords}`;

  // Track word counts for multiplayer
  const playerWordCount = useMemo(() => foundWords.size, [foundWords]);
  const opponentWordCount = useMemo(() => opponentSet.size, [opponentSet]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (mode !== 'multiplayer') return;
    if (matchOutcome) return; // Already determined

    // Check if either player reached 5 words first
    const playerReached5 = playerWordCount >= WIN_THRESHOLD;
    const opponentReached5 = opponentWordCount >= WIN_THRESHOLD;

    // Check if all words are found
    const uniqueWords = new Set([
      ...Array.from(foundWords || []),
      ...Array.from(opponentSet || []),
    ]).size;
    const allWordsCompleted = uniqueWords >= totalWords && totalWords > 0;

    let outcome = null;

    // First to 5 wins
    if (playerReached5 && !opponentReached5) {
      outcome = 'win';
    } else if (opponentReached5 && !playerReached5) {
      outcome = 'lose';
    } 
    // If both reach 5 at the same time, or all words found before 5, compare totals
    else if (allWordsCompleted || (playerReached5 && opponentReached5)) {
      if (playerWordCount > opponentWordCount) {
        outcome = 'win';
      } else if (opponentWordCount > playerWordCount) {
        outcome = 'lose';
      } else {
        outcome = 'draw';
      }
    }

    if (outcome) {
      setMatchOutcome(outcome);
    }
  }, [mode, foundWords, opponentSet, totalWords, matchOutcome, playerWordCount, opponentWordCount]);

  useEffect(() => {
    if (mode !== 'multiplayer' || !matchOutcome) {
      return;
    }

    if (typeof onMatchComplete === 'function' && !hasBroadcastGameOverRef.current) {
      hasBroadcastGameOverRef.current = true;
      onMatchComplete({
        outcome: matchOutcome,
        playerWins: playerWordCount,
        opponentWins: opponentWordCount,
        topic,
      });
    }

    if (typeof onShowResult === 'function') {
      onShowResult({
        outcome: matchOutcome,
        playerWins: playerWordCount,
        opponentWins: opponentWordCount,
        topic,
      });
    }
  }, [matchOutcome, mode, onMatchComplete, onShowResult, playerWordCount, opponentWordCount, topic]);

  const renderScoreDots = (count, isPlayer) => {
    const dots = [];
    for (let i = 0; i < WIN_THRESHOLD; i++) {
      const isFilled = i < count;
      dots.push(
        <View
          key={`${isPlayer ? 'player' : 'opponent'}-dot-${i}`}
          style={[styles.scoreDot, isFilled && styles.scoreDotFilled]}
        />
      );
    }
    return <View style={styles.scoreRow}>{dots}</View>;
  };

  const showCompletionScreen = mode !== 'multiplayer' && allFound;
  const GridComponent = mode === 'shuffle' ? ShuffleGrid : WordSearchGrid;

  const completionTitle = useMemo(() => {
    if (mode === 'practice') {
      return 'Practice Complete!';
    }
    if (mode === 'shuffle') {
      return 'Shuffle Complete!';
    }
    return 'Puzzle Complete!';
  }, [mode]);

  const completionSubtitle = useMemo(() => {
    if (mode === 'practice' && timeElapsed !== null) {
      return `Time: ${formatTime(timeElapsed)}`;
    }
    if (mode === 'shuffle') {
      return 'Letters unscrambled!';
    }
    return 'Great job finding every word.';
  }, [mode, timeElapsed, formatTime]);

  const handlePlayAgain = useCallback(() => {
    if (typeof onNewTopic === 'function') {
      onNewTopic();
    }
  }, [onNewTopic]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}><Text style={styles.headerText}>← Back</Text></TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{topic}</Text>
          <Text style={styles.progress}>{progressText} words found</Text>
          {mode === 'practice' && timeElapsed !== null && (
            <Text style={styles.timer}>
              {formatTime(timeElapsed)}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={onNewTopic} style={styles.headerButton}>
          <Text style={styles.headerText}>{mode === 'multiplayer' ? 'Leave Match' : 'New Topic'}</Text>
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
        <GridComponent 
          grid={puzzle.grid.map(row => row.split ? row.split('') : row)} 
          placements={puzzle.placements} 
          foundWords={foundWords}
          opponentFoundWords={opponentSet}
          onWordFound={handleWordFound}
          scrollViewRef={scrollViewRef}
        />
        <WordList words={puzzle.words} foundWords={foundWords} opponentFoundWords={opponentSet} />
      </ScrollView>

      {showCompletionScreen && (
        <View style={styles.completionCard}>
          <Text style={styles.completionTitle}>{completionTitle}</Text>
          <Text style={styles.completionSubtitle}>{completionSubtitle}</Text>
          <TouchableOpacity style={styles.playAgainButton} onPress={handlePlayAgain}>
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'multiplayer' && (
        <View style={styles.scoreboard}>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>{playerLabel}</Text>
            <Text style={styles.scoreCount}>{playerWordCount}</Text>
            {renderScoreDots(playerWordCount, true)}
          </View>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>{opponentLabel}</Text>
            <Text style={styles.scoreCount}>{opponentWordCount}</Text>
            {renderScoreDots(opponentWordCount, false)}
          </View>
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
  banner: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    alignItems: 'center',
  },
  bannerText: {
    color: '#1B5E20',
    fontWeight: '700',
  },
  bannerTimeText: {
    color: '#1B5E20',
    fontSize: 14,
    marginTop: 4,
    opacity: 0.8,
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
  timer: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976D2',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  scoreboard: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginRight: 16,
    flex: 1,
  },
  scoreCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginRight: 16,
    minWidth: 30,
    textAlign: 'right',
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scoreDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    backgroundColor: '#F5F5F5',
  },
  scoreDotFilled: {
    backgroundColor: '#2E7D32',
    borderColor: '#1B5E20',
  },
});
