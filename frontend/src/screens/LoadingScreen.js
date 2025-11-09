import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

export default function LoadingScreen({ onCancel, message = 'Creating your word search…' }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>{message}</Text>
        
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          accessibilityLabel="Cancel and return to search"
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
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
  content: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#000000',
    marginTop: 24,
    marginBottom: 32,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 16,
  },
});

