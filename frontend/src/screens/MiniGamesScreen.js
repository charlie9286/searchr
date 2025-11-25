import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function MiniGamesScreen({ onPractice, onShuffle, onWordBurst, onBack }) {
  return (
    <View style={styles.container}>
      {onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      )}
      <View style={styles.content}>
        <Text style={styles.title}>Mini Games</Text>
        <Text style={styles.subtitle}>Pick a quick challenge</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.practiceButton]}
            onPress={onPractice}
            accessibilityLabel="Practice mode"
          >
            <Text style={styles.buttonText}>Practice Mode</Text>
            <Text style={styles.buttonDescription}>
              Stopwatch challenge with your topic
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.shuffleButton]}
            onPress={onShuffle}
            accessibilityLabel="Shuffle mini game"
          >
            <Text style={styles.buttonText}>Shuffle</Text>
            <Text style={styles.buttonDescription}>
              Letters scramble as you find words
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.wordBurstButton]}
            onPress={onWordBurst}
            accessibilityLabel="Word Burst mini game"
          >
            <Text style={styles.buttonText}>Word Burst</Text>
            <Text style={styles.buttonDescription}>
              Swap letters to form words and score points
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    padding: 8,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 16,
    color: '#000000',
  },
  content: {
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 48,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    width: '100%',
    minHeight: 90,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  practiceButton: {
    backgroundColor: '#1976D2',
  },
  shuffleButton: {
    backgroundColor: '#028174',
  },
  wordBurstButton: {
    backgroundColor: '#E91E63',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  buttonDescription: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.95,
    textAlign: 'center',
  },
});

