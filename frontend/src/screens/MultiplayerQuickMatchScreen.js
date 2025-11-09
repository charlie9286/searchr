import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

export default function MultiplayerQuickMatchScreen({
  playerName = 'Player',
  onFindOpponent,
  onCancel,
  isSearching = false,
  statusText = 'Tap Find Opponent to start.',
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Multiplayer</Text>
      <Text style={styles.subtitle}>
        Race another player to clear the same AI-generated word search.
      </Text>

      <View style={styles.card}>
        <Text style={styles.playerLabel}>Signed in as</Text>
        <Text style={styles.playerName}>{playerName}</Text>
      </View>

      <View style={styles.statusContainer}>
        {isSearching && <ActivityIndicator size="small" color="#000000" />}
        <Text style={styles.statusText}>{statusText}</Text>
        {isSearching && (
          <Text style={styles.helperText}>Generating a fresh AI topic and puzzle.</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isSearching && styles.primaryButtonDisabled]}
        onPress={onFindOpponent}
        disabled={isSearching}
        accessibilityLabel="Find a live opponent"
        accessibilityState={{ disabled: isSearching }}
      >
        <Text style={styles.primaryButtonText}>Find Opponent</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={onCancel}
        accessibilityLabel="Back to menu"
      >
        <Text style={styles.secondaryButtonText}>{isSearching ? 'Cancel Search' : 'Back'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 64,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
    lineHeight: 22,
  },
  card: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    backgroundColor: '#FAFAFA',
  },
  playerLabel: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 4,
  },
  playerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
  },
  helperText: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
  },
  primaryButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: '#C62828',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  primaryButtonDisabled: {
    backgroundColor: '#EF9A9A',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
