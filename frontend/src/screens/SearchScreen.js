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

export default function SearchScreen({ onSubmit, error }) {
  const [topic, setTopic] = useState('');
  const [isValid, setIsValid] = useState(false);

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
          style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!isValid}
          accessibilityLabel="Generate word search"
          accessibilityState={{ disabled: !isValid }}
        >
          <Text style={styles.submitButtonText}>Generate Word Search</Text>
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 48,
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
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
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

