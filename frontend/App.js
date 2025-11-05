import { registerRootComponent } from 'expo';
import React, { useState } from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';

import SplashScreen from './src/screens/SplashScreen';
import SearchScreen from './src/screens/SearchScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import WordSearchScreen from './src/screens/WordSearchScreen';
import { API_ENDPOINTS } from './src/config';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('splash');
  const [searchTopic, setSearchTopic] = useState('');
  const [puzzleData, setPuzzleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSplashComplete = () => {
    setCurrentScreen('search');
  };

  const handleSearch = async (topic) => {
    setSearchTopic(topic);
    setLoading(true);
    setError(null);
    setCurrentScreen('loading');

    try {
      const response = await fetch(API_ENDPOINTS.GENERATE_WORDSEARCH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate word search');
      }

      const data = await response.json();
      setPuzzleData(data);
      setCurrentScreen('wordsearch');
    } catch (err) {
      console.error('Error fetching word search:', err);
      setError(err.message);
      setCurrentScreen('search');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLoading = () => {
    setLoading(false);
    setCurrentScreen('search');
    setError(null);
  };

  const handleBackToSearch = () => {
    setCurrentScreen('search');
    setPuzzleData(null);
    setError(null);
  };

  const handleShuffle = async () => {
    if (!searchTopic) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_ENDPOINTS.GENERATE_WORDSEARCH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: searchTopic }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate word search');
      }

      const data = await response.json();
      setPuzzleData(data);
      setCurrentScreen('wordsearch');
    } catch (err) {
      console.error('Error shuffling word search:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNewTopic = () => {
    setSearchTopic('');
    setPuzzleData(null);
    setError(null);
    setCurrentScreen('search');
  };

  return (
    <SafeAreaView style={styles.container}>
      {currentScreen === 'splash' && (
        <SplashScreen onComplete={handleSplashComplete} />
      )}
      
      {currentScreen === 'search' && (
        <SearchScreen onSubmit={handleSearch} error={error} />
      )}
      
      {currentScreen === 'loading' && (
        <LoadingScreen onCancel={handleCancelLoading} />
      )}
      
      {currentScreen === 'wordsearch' && puzzleData && (
        <WordSearchScreen
          puzzle={puzzleData}
          topic={searchTopic}
          onBack={handleBackToSearch}
          onNewTopic={handleNewTopic}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

registerRootComponent(App);
