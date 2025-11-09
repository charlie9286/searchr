import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const outcomeThemes = {
  win: {
    background: { backgroundColor: '#E8F5E9' },
    title: { color: '#1B5E20' },
    score: { color: '#1B5E20' },
    button: { backgroundColor: '#2E7D32' },
    buttonText: { color: '#FFFFFF' },
  },
  lose: {
    background: { backgroundColor: '#FFEBEE' },
    title: { color: '#B71C1C' },
    score: { color: '#B71C1C' },
    button: { backgroundColor: '#C62828' },
    buttonText: { color: '#FFFFFF' },
  },
  draw: {
    background: { backgroundColor: '#ECEFF1' },
    title: { color: '#37474F' },
    score: { color: '#37474F' },
    button: { backgroundColor: '#607D8B' },
    buttonText: { color: '#FFFFFF' },
  },
};

const messages = {
  win: 'You Win!',
  lose: 'You Lose!',
  draw: "It's a Draw!",
};

export default function MatchResultScreen({
  outcome = 'draw',
  playerScore = 0,
  opponentScore = 0,
  topic,
  onPlayAgain,
  onExit,
}) {
  const theme = outcomeThemes[outcome] || outcomeThemes.draw;

  return (
    <View style={[styles.container, theme.background]}>
      <Text style={[styles.title, theme.title]}>{messages[outcome] || messages.draw}</Text>
      {topic ? <Text style={[styles.topic, theme.title]}>Topic: {topic}</Text> : null}
      <Text style={[styles.score, theme.score]}>{playerScore} - {opponentScore}</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.primaryButton, theme.button]}
          onPress={onPlayAgain}
          accessibilityLabel="Play another live match"
        >
          <Text style={[styles.primaryButtonText, theme.buttonText]}>Play Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onExit}
          accessibilityLabel="Return to mode select"
        >
          <Text style={styles.secondaryButtonText}>Back to Menu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  topic: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  score: {
    fontSize: 48,
    fontWeight: '900',
    marginBottom: 32,
  },
  buttonRow: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 8,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textDecorationLine: 'underline',
  },
});
