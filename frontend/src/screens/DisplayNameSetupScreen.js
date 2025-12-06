import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { validateUsername, sanitizeUsername } from '../utils/usernameValidator';
import { supabase } from '../lib/supabase';

export default function DisplayNameSetupScreen({ userId, onComplete }) {
  const [displayName, setDisplayName] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState(null);

  const handleTextChange = async (text) => {
    const sanitized = sanitizeUsername(text);
    setDisplayName(sanitized);
    setError(null);

    // Basic validation
    const validation = validateUsername(sanitized);
    setIsValid(validation.valid);

    if (!validation.valid && sanitized.length > 0) {
      setError(validation.reason);
    } else if (sanitized.length > 0) {
      // Check if name is already taken
      setIsChecking(true);
      try {
        const { data, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('display_name', sanitized)
          .limit(1);

        if (checkError) {
          console.error('Error checking display name:', checkError);
          setError('Unable to verify name availability');
          setIsValid(false);
        } else if (data && data.length > 0) {
          setError('This name is already taken');
          setIsValid(false);
        } else {
          setError(null);
          setIsValid(true);
        }
      } catch (err) {
        console.error('Error checking display name:', err);
        setError('Unable to verify name availability');
        setIsValid(false);
      } finally {
        setIsChecking(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!isValid || !displayName.trim()) {
      Alert.alert('Invalid Name', 'Please enter a valid display name');
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'User ID is required');
      return;
    }

    try {
      // Update user with display name
      const { data, error: updateError } = await supabase
        .from('users')
        .update({
          display_name: displayName.trim(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating display name:', updateError);
        Alert.alert('Error', 'Failed to save display name. Please try again.');
        return;
      }

      // Success - call onComplete with updated user data
      if (typeof onComplete === 'function') {
        onComplete(data);
      }
    } catch (err) {
      console.error('Error saving display name:', err);
      Alert.alert('Error', 'Failed to save display name. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Choose Your Display Name</Text>
        <Text style={styles.subtitle}>
          Pick a name that represents you. This will be visible to other players.
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              error && !isValid && styles.inputError,
              isValid && styles.inputValid,
            ]}
            placeholder="Enter your display name"
            placeholderTextColor="#999"
            value={displayName}
            onChangeText={handleTextChange}
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={20}
            editable={!isChecking}
          />
          {isChecking && (
            <View style={styles.checkingIndicator}>
              <ActivityIndicator size="small" color="#1976D2" />
            </View>
          )}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {isValid && !error && displayName.length > 0 && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>✓ This name is available!</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, (!isValid || isChecking) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || isChecking}
        >
          <Text style={styles.submitButtonText}>Continue</Text>
        </TouchableOpacity>

        <Text style={styles.rulesText}>
          Rules: 3-20 characters, letters, numbers, spaces, hyphens, and underscores only. Must be appropriate and unique.
        </Text>
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
    paddingHorizontal: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 16,
    position: 'relative',
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
  inputError: {
    borderColor: '#D32F2F',
  },
  inputValid: {
    borderColor: '#4CAF50',
  },
  checkingIndicator: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
  },
  successContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#2E7D32',
    fontSize: 14,
  },
  submitButton: {
    height: 56,
    backgroundColor: '#1976D2',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  rulesText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 16,
  },
});

