import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';

export default function SearchScreen({ onSubmit, error, mode = 'classic', onChangeMode }) {
  const [topic, setTopic] = useState('');
  const [isValid, setIsValid] = useState(false);
  const modeLabel = mode === 'practice'
    ? 'Practice'
    : mode === 'shuffle'
      ? 'Shuffle'
      : mode === 'mystery'
        ? 'Mystery'
        : mode === 'multiplayer'
          ? 'Multiplayer'
          : 'Classic';
  const modeDescription = (() => {
    if (mode === 'practice') {
      return 'Stopwatch tracks how long you take to solve.';
    }
    if (mode === 'shuffle') {
      return 'Letters scramble with each new puzzle.';
    }
    if (mode === 'mystery') {
      return 'Find words without seeing the word list.';
    }
    if (mode === 'multiplayer') {
      return 'Compete live with an opponent via Game Center.';
    }
    return 'No timer - take your time and enjoy the puzzle.';
  })();
  const canChangeMode = typeof onChangeMode === 'function';

  const buttonLabel =
    mode === 'multiplayer'
      ? 'Find Match (VS)'
      : mode === 'shuffle'
        ? 'Generate Shuffle Puzzle'
        : mode === 'mystery'
          ? 'Generate Mystery Puzzle'
          : 'Generate Word Search';

  const handleTextChange = (text) => {
    setTopic(text);
    setIsValid(text.trim().length >= 3);
  };

  const handleSubmit = () => {
    if (!isValid) {
      Alert.alert('Invalid Topic', 'Please enter at least 3 characters');
      return;
    }
    onSubmit(topic.trim());
  };

  const handleRetry = () => {
    setTopic('');
    setIsValid(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.modeContainer}>
          <View style={styles.modeInfo}>
            <Text style={styles.modeLabel}>Mode: {modeLabel}</Text>
            <Text style={styles.modeDescription}>{modeDescription}</Text>
          </View>
          {canChangeMode && (
            <TouchableOpacity
              style={styles.modeButton}
              onPress={onChangeMode}
              accessibilityLabel="Change game mode"
            >
              <Text style={styles.modeButtonText}>Change Mode</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.title}>Create Your Word Search</Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter a topic (e.g., 'Coral Reefs')"
            placeholderTextColor="#999"
            value={topic}
            onChangeText={handleTextChange}
            autoFocus
            accessibilityLabel="Enter word search topic"
            accessibilityHint="Type at least 3 characters to enable the generate button"
          />
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              Couldn't generate that. Try again.
            </Text>
            <View style={styles.errorActions}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetry}
              >
                <Text style={styles.retryButtonText}>Edit Topic</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.submitButton,
            mode === 'multiplayer' && styles.submitButtonMultiplayer,
            !isValid && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isValid}
          accessibilityLabel={mode === 'multiplayer' ? 'Find live opponent' : 'Generate word search'}
          accessibilityState={{ disabled: !isValid }}
        >
          <Text style={[styles.submitButtonText, mode === 'multiplayer' && styles.submitButtonTextMultiplayer]}>
            {buttonLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    gap: 12,
  },
  modeInfo: {
    flex: 1,
  },
  modeLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  modeDescription: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#000000',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    height: 56,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  submitButton: {
    height: 56,
    backgroundColor: '#000000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonMultiplayer: {
    backgroundColor: '#C62828',
    marginTop: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  submitButtonTextMultiplayer: {
    fontSize: 20,
    letterSpacing: 1,
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: '#D32F2F',
    fontSize: 16,
    fontWeight: '600',
  },
});

