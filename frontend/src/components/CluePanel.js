import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function CluePanel({ clues, selectedWord, onCluePress }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Clues</Text>
      <ScrollView style={styles.scrollView}>
        {clues.map((clue) => (
          <TouchableOpacity
            key={clue.number}
            style={[
              styles.clueItem,
              selectedWord?.number === clue.number && styles.clueItemSelected,
            ]}
            onPress={() => onCluePress(clue)}
            accessibilityLabel={`Clue ${clue.number}: ${clue.clue}`}
            accessibilityHint="Double tap to select this word"
          >
            <Text style={styles.clueNumber}>{clue.number}</Text>
            <Text style={styles.clueText}>{clue.clue}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    maxHeight: 300,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  scrollView: {
    flex: 1,
  },
  clueItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  clueItemSelected: {
    backgroundColor: '#FFF9C4',
    borderColor: '#000000',
  },
  clueNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginRight: 12,
    minWidth: 30,
  },
  clueText: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
});


