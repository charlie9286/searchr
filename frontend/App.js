import { registerRootComponent } from 'expo';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';

import SplashScreen from './src/screens/SplashScreen';
import SearchScreen from './src/screens/SearchScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import ModeSelectScreen from './src/screens/ModeSelectScreen';
import MultiplayerQuickMatchScreen from './src/screens/MultiplayerQuickMatchScreen';
import WordSearchScreen from './src/screens/WordSearchScreen';
import { API_ENDPOINTS } from './src/config';
import { supabase } from './src/lib/supabase';
import { authenticateGameCenter } from './src/services/gameCenter';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('splash');
  const [searchTopic, setSearchTopic] = useState('');
  const [puzzleData, setPuzzleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gameMode, setGameMode] = useState('classic');
  const [canModeSelectGoBack, setCanModeSelectGoBack] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Creating your word search…');
  const [playerProfile, setPlayerProfile] = useState(null);
  const [pendingMatch, setPendingMatch] = useState(null);
  const [opponentFoundWords, setOpponentFoundWords] = useState(() => new Set());
  const [isQuickMatchSearching, setIsQuickMatchSearching] = useState(false);
  const [quickMatchStatus, setQuickMatchStatus] = useState('Tap Find Opponent to start.');

  const matchChannelRef = useRef(null);
  const pendingPuzzleRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    authenticateGameCenter()
      .then(profile => {
        if (isMounted) {
          setPlayerProfile(profile);
        }
      })
      .catch(err => {
        console.warn('Game Center auth error:', err?.message);
        if (isMounted) {
          setPlayerProfile({ playerId: `guest-${Date.now()}`, displayName: 'Guest', isGuest: true });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const cleanupMatchChannel = () => {
    if (matchChannelRef.current) {
      matchChannelRef.current.unsubscribe();
      matchChannelRef.current = null;
    }
  };

  const resetMultiplayerState = () => {
    cleanupMatchChannel();
    setPendingMatch(null);
    setOpponentFoundWords(() => new Set());
    pendingPuzzleRef.current = null;
    setLoadingMessage('Creating your word search…');
    setIsQuickMatchSearching(false);
    setQuickMatchStatus('Tap Find Opponent to start.');
  };

  const handleSplashComplete = () => {
    setCanModeSelectGoBack(false);
    setCurrentScreen('modeselect');
  };

  const handleSearch = async (topic) => {
    if (gameMode === 'multiplayer') {
      console.warn('handleSearch called in multiplayer mode; ignoring.');
      return;
    }
    setSearchTopic(topic);

    setLoading(true);
    setError(null);
    setLoadingMessage('Creating your word search…');
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

  const handleQuickMatch = async () => {
    if (!supabase) {
      const message = 'Multiplayer is not configured. Please set Supabase environment variables.';
      setError(message);
      setQuickMatchStatus(message);
      setIsQuickMatchSearching(false);
      setCurrentScreen('multiplayer');
      return;
    }

    setQuickMatchStatus('Finding an opponent…');
    let activeProfile = playerProfile;
    if (!activeProfile?.playerId) {
      try {
        activeProfile = await authenticateGameCenter();
        setPlayerProfile(activeProfile);
      } catch (authErr) {
        console.warn('Game Center re-auth failed:', authErr?.message);
        activeProfile = { playerId: `guest-${Date.now()}`, displayName: 'Guest', isGuest: true };
        setPlayerProfile(activeProfile);
      }
    }

    setOpponentFoundWords(() => new Set());
    setError(null);
    setIsQuickMatchSearching(true);
    setQuickMatchStatus('Finding an opponent…');

    try {
      const response = await fetch(API_ENDPOINTS.MULTIPLAYER_QUICKMATCH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: activeProfile.playerId,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to find a match');
      }

      setPendingMatch({
        matchId: data.matchId,
        topic: data.topic,
        status: data.status,
        joinedAs: data.joinedAs,
      });

      pendingPuzzleRef.current = {
        grid: data.grid,
        words: data.words,
        placements: data.placements,
        topic: data.topic,
      };

      if (data.topic) {
        setSearchTopic(data.topic);
      }

      if (data.status === 'active') {
        setPuzzleData(pendingPuzzleRef.current);
        setCurrentScreen('wordsearch');
        setIsQuickMatchSearching(false);
      } else {
        setQuickMatchStatus(`Topic: ${data.topic}. Waiting for opponent to join…`);
        setIsQuickMatchSearching(true);
      }
    } catch (err) {
      console.error('Matchmaking error:', err);
      const message = err.message || 'Matchmaking failed';
      setError(message);
      setQuickMatchStatus(message);
      cleanupMatchChannel();
      setPendingMatch(null);
      setOpponentFoundWords(() => new Set());
      pendingPuzzleRef.current = null;
      setCurrentScreen('multiplayer');
      setIsQuickMatchSearching(false);
    }
  };

  useEffect(() => {
    if (gameMode !== 'multiplayer') {
      cleanupMatchChannel();
      return undefined;
    }

    if (!supabase || !pendingMatch?.matchId) {
      return undefined;
    }

    const channel = supabase.channel(`match:${pendingMatch.matchId}`, {
      config: {
        broadcast: {
          ack: true,
        },
      },
    });

    channel
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${pendingMatch.matchId}`,
      }, (payload) => {
        const newStatus = payload?.new?.status;
        if (!newStatus) return;

        if (newStatus === 'active') {
          setPendingMatch(prev => (prev ? { ...prev, status: 'active' } : prev));
          const puzzle = pendingPuzzleRef.current || {
            grid: payload.new.grid,
            words: payload.new.words,
            placements: payload.new.placements,
            topic: payload.new.topic,
          };
          setPuzzleData(prev => prev || puzzle);
          setQuickMatchStatus('Opponent connected! Starting…');
          setCurrentScreen('wordsearch');
          setIsQuickMatchSearching(false);
        } else if (newStatus === 'finished') {
          setPendingMatch(prev => (prev ? { ...prev, status: 'finished' } : prev));
          setIsQuickMatchSearching(false);
          setQuickMatchStatus('Match finished.');
        }
      })
      .on('broadcast', { event: 'word_found' }, ({ payload }) => {
        if (!payload?.word) return;
        if (payload.playerId && payload.playerId === playerProfile?.playerId) return;
        setOpponentFoundWords(prev => {
          const next = new Set(prev);
          next.add(payload.word);
          return next;
        });
      })
      .on('broadcast', { event: 'game_over' }, ({ payload }) => {
        if (payload?.playerId && payload.playerId === playerProfile?.playerId) return;
        setPendingMatch(prev => (prev ? { ...prev, status: 'finished' } : prev));
        setIsQuickMatchSearching(false);
        setQuickMatchStatus('Opponent finished the puzzle.');
      });

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn('Supabase channel error for match', pendingMatch.matchId);
      }
    });

    matchChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
      if (matchChannelRef.current === channel) {
        matchChannelRef.current = null;
      }
    };
  }, [gameMode, pendingMatch?.matchId, playerProfile?.playerId]);

  const broadcastWordFound = (word) => {
    if (!matchChannelRef.current || !word) return;
    matchChannelRef.current
      .send({
        type: 'broadcast',
        event: 'word_found',
        payload: {
          word,
          playerId: playerProfile?.playerId,
        },
      })
      .catch(err => console.warn('Failed to send word_found event:', err?.message));
  };

  const broadcastMatchComplete = () => {
    if (!matchChannelRef.current) return;
    matchChannelRef.current
      .send({
        type: 'broadcast',
        event: 'game_over',
        payload: {
          playerId: playerProfile?.playerId,
        },
      })
      .catch(err => console.warn('Failed to send game_over event:', err?.message));

    setPendingMatch(prev => (prev ? { ...prev, status: 'finished' } : prev));
  };

  const handleCancelLoading = () => {
    setLoading(false);
    setCurrentScreen('search');
    setError(null);
    resetMultiplayerState();
  };

  const handleBackToSearch = () => {
    if (gameMode === 'multiplayer') {
      setCurrentScreen('multiplayer');
    } else {
      setCurrentScreen('search');
    }
    setPuzzleData(null);
    setError(null);
    resetMultiplayerState();
  };

  const handleShuffle = async () => {
    if (!searchTopic) return;
    
    setLoading(true);
    setError(null);
    setLoadingMessage('Creating your word search…');
    setCurrentScreen('loading');

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
      setCurrentScreen('search');
    } finally {
      setLoading(false);
    }
  };

  const handleModeSelect = (mode) => {
    setGameMode(mode);
    setPuzzleData(null);
    setSearchTopic('');
    setError(null);
    setLoading(false);
    setCanModeSelectGoBack(false);
    if (mode === 'multiplayer') {
      resetMultiplayerState();
      setCurrentScreen('multiplayer');
    } else {
      resetMultiplayerState();
      setCurrentScreen('search');
    }
  };

  const handleChangeMode = () => {
    setSearchTopic('');
    setPuzzleData(null);
    setError(null);
    setCanModeSelectGoBack(true);
    setCurrentScreen('modeselect');
    resetMultiplayerState();
  };

  const handleModeSelectBack = () => {
    setCanModeSelectGoBack(false);
    setCurrentScreen('search');
  };

  const handleNewTopic = () => {
    setSearchTopic('');
    setPuzzleData(null);
    setError(null);
    if (gameMode === 'multiplayer') {
      setCurrentScreen('multiplayer');
    } else {
      setCurrentScreen('search');
    }
    resetMultiplayerState();
  };

  return (
    <SafeAreaView style={styles.container}>
      {currentScreen === 'splash' && (
        <SplashScreen onComplete={handleSplashComplete} />
      )}
      
      {currentScreen === 'search' && (
        <SearchScreen
          mode={gameMode}
          onSubmit={handleSearch}
          error={error}
          onChangeMode={handleChangeMode}
        />
      )}
      
      {currentScreen === 'loading' && (
        <LoadingScreen onCancel={handleCancelLoading} message={loadingMessage} />
      )}
      
      {currentScreen === 'modeselect' && (
        <ModeSelectScreen
          onClassic={() => handleModeSelect('classic')}
          onPractice={() => handleModeSelect('practice')}
          onMultiplayer={() => handleModeSelect('multiplayer')}
          onBack={canModeSelectGoBack ? handleModeSelectBack : undefined}
        />
      )}

      {currentScreen === 'multiplayer' && (
        <MultiplayerQuickMatchScreen
          playerName={playerProfile?.displayName || 'Guest'}
          onFindOpponent={handleQuickMatch}
          onCancel={handleChangeMode}
          isSearching={isQuickMatchSearching}
          statusText={quickMatchStatus}
        />
      )}
 
      {currentScreen === 'wordsearch' && puzzleData && (
        <WordSearchScreen
          puzzle={puzzleData}
          topic={searchTopic}
          mode={gameMode}
          onBack={handleBackToSearch}
          onNewTopic={handleNewTopic}
          onBroadcastWord={gameMode === 'multiplayer' ? broadcastWordFound : undefined}
          opponentFoundWords={gameMode === 'multiplayer' ? Array.from(opponentFoundWords) : []}
          onMatchComplete={gameMode === 'multiplayer' ? broadcastMatchComplete : undefined}
          playerLabel={playerProfile?.displayName || 'You'}
          opponentLabel="Opponent"
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
