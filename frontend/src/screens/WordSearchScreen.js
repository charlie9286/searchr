import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import WordSearchGrid from '../components/WordSearchGrid';
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
  const [roundResults, setRoundResults] = useState([]); // 'player' | 'opponent' | 'draw'
  const [matchOutcome, setMatchOutcome] = useState(null); // 'win' | 'lose' | 'draw'
  const scrollViewRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const hasBroadcastGameOverRef = useRef(false);
  const previousOpponentWordsRef = useRef(new Set());

  // Reset found words when puzzle changes
  useEffect(() => {
    setFoundWords(new Set());
    if (mode === 'practice') {
      setTimeElapsed(0);
    }
    setRoundResults([]);
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
  const maxRounds = useMemo(() => Math.min(Math.max(totalWords, 1), 5), [totalWords]);

  const addRoundResult = useCallback((winner) => {
    setRoundResults(prev => {
      if (prev.length >= maxRounds) {
        return prev;
      }
      return [...prev, winner];
    });
  }, [maxRounds]);

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
        addRoundResult('player');
      }

      return next;
    });
  };

  useEffect(() => {
    if (mode !== 'multiplayer') {
      previousOpponentWordsRef.current = new Set(opponentSet);
      return;
    }

    const previous = previousOpponentWordsRef.current;
    const prevSize = previous.size;
    const currentSize = opponentSet.size;
    if (currentSize > prevSize) {
      const additions = Math.min(currentSize - prevSize, maxRounds);
      for (let i = 0; i < additions; i += 1) {
        addRoundResult('opponent');
      }
    }
    previousOpponentWordsRef.current = new Set(opponentSet);
  }, [opponentSet, mode, addRoundResult, maxRounds]);

  const allFound = puzzle.words?.every(w => foundWords.has(w));
  const foundCount = foundWords.size;
  const progressText = `${foundCount}/${totalWords}`;

  const playerWins = useMemo(() => roundResults.filter(result => result === 'player').length, [roundResults]);
  const opponentWins = useMemo(() => roundResults.filter(result => result === 'opponent').length, [roundResults]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (mode !== 'multiplayer') return;

    const uniqueWords = new Set([
      ...Array.from(foundWords || []),
      ...Array.from(opponentSet || []),
    ]).size;

    const roundsFilled = roundResults.length >= maxRounds;
    const allWordsCompleted = uniqueWords >= totalWords && totalWords > 0;

    if ((roundsFilled || allWordsCompleted) && !matchOutcome) {
      let outcome = 'draw';
      if (playerWins > opponentWins) outcome = 'win';
      else if (playerWins < opponentWins) outcome = 'lose';
      setMatchOutcome(outcome);
    }
  }, [mode, roundResults, maxRounds, foundWords, opponentSet, totalWords, matchOutcome, playerWins, opponentWins]);

  useEffect(() => {
    if (mode !== 'multiplayer' || !matchOutcome) {
      return;
    }

    if (typeof onMatchComplete === 'function' && !hasBroadcastGameOverRef.current) {
      hasBroadcastGameOverRef.current = true;
      onMatchComplete({
        outcome: matchOutcome,
        playerWins,
        opponentWins,
        topic,
      });
    }

    if (typeof onShowResult === 'function') {
      onShowResult({
        outcome: matchOutcome,
        playerWins,
        opponentWins,
        topic,
      });
    }
  }, [matchOutcome, mode, onMatchComplete, onShowResult, playerWins, opponentWins, topic]);

  const renderPenaltyRow = (winner) => (
    <View style={styles.penaltyRow}>
      {Array.from({ length: maxRounds }).map((_, index) => {
        const result = roundResults[index];
        const isWinner = result === winner;
        return (
          <View
            key={`${winner}-penalty-${index}`}
            style={[styles.penaltyDot, isWinner && styles.penaltyDotFilled]}
          />
        );
      })}
    </View>
  );

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

      {allFound && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>All words found! 🎉</Text>
          {mode === 'practice' && timeElapsed !== null && (
            <Text style={styles.bannerTimeText}>Time: {formatTime(timeElapsed)}</Text>
          )}
        </View>
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
          opponentFoundWords={opponentSet}
          onWordFound={handleWordFound}
          scrollViewRef={scrollViewRef}
        />
        <WordList words={puzzle.words} foundWords={foundWords} opponentFoundWords={opponentSet} />
      </ScrollView>

      {mode === 'multiplayer' && (
        <View style={styles.scoreboard}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>{playerLabel}</Text>
            {renderPenaltyRow('player')}
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>{opponentLabel}</Text>
            {renderPenaltyRow('opponent')}
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
  scoreRow: {
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
  },
  penaltyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  penaltyDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B71C1C',
    backgroundColor: '#FFCDD2',
  },
  penaltyDotFilled: {
    backgroundColor: '#2E7D32',
    borderColor: '#1B5E20',
  },
});
