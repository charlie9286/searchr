import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function WordList({ words, foundWords, opponentFoundWords }) {
  const opponentSet = React.useMemo(() => {
    if (!opponentFoundWords) return new Set();
    if (opponentFoundWords instanceof Set) return opponentFoundWords;
    if (Array.isArray(opponentFoundWords)) return new Set(opponentFoundWords);
    return new Set();
  }, [opponentFoundWords]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find these words</Text>
      <View style={styles.grid}>
        {words.map((w) => {
          const found = foundWords?.has(w);
          const opponentFound = opponentSet.has(w) && !found;
          return (
            <View
              key={w}
              style={[
                styles.wordPill,
                found && styles.wordPillFound,
                opponentFound && styles.wordPillOpponent,
              ]}
              accessibilityState={{ selected: found }}
            >
              <Text
                style={[
                  styles.wordText,
                  found && styles.wordTextFound,
                  opponentFound && styles.wordTextOpponent,
                ]}
              >
                {w}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    maxWidth: '100%',
  },
  wordPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  wordPillFound: {
    backgroundColor: '#E8F5E9',
    borderColor: '#A5D6A7',
  },
  wordPillOpponent: {
    backgroundColor: '#FCE4EC',
    borderColor: '#F48FB1',
  },
  wordText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },
  wordTextFound: {
    color: '#1B5E20',
    textDecorationLine: 'line-through',
  },
  wordTextOpponent: {
    color: '#AD1457',
  },
});
