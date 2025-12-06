import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import LevelProgress from '../components/LevelProgress';

export default function ModeSelectScreen({ onClassic, onMiniGames, onMultiplayer, onBack, userXP = 0 }) {
  return (
    <View style={styles.container}>
      {onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      )}
      
      {/* Level Progress centered at top */}
      <View style={styles.levelContainer}>
        <LevelProgress xp={userXP} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Choose Your Mode</Text>
        <Text style={styles.subtitle}>Pick how you'd like to play</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={onClassic}
            accessibilityLabel="Play classic mode"
          >
            <Text style={styles.buttonText}>Classic</Text>
            <Text style={styles.buttonDescription}>
              Take your time and find all words
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.practiceButton]}
            onPress={onMiniGames}
            accessibilityLabel="Open mini games menu"
          >
            <Text style={styles.buttonText}>Mini Games</Text>
            <Text style={styles.buttonDescription}>
              Practice mode + Shuffle challenge
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.multiplayerButton]}
            onPress={onMultiplayer}
            accessibilityLabel="Play live multiplayer"
          >
            <Text style={styles.buttonText}>Multiplayer</Text>
            <Text style={styles.buttonDescription}>
              Challenge a live opponent (Game Center)
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
  levelContainer: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    zIndex: 1,
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
    height: 80,
    backgroundColor: '#000000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  practiceButton: {
    backgroundColor: '#1976D2',
  },
  multiplayerButton: {
    backgroundColor: '#1B5E20',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  buttonDescription: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
    textAlign: 'center',
  },
});

