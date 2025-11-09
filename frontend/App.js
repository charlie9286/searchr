import { registerRootComponent } from 'expo';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';

import SplashScreen from './src/screens/SplashScreen';
import SearchScreen from './src/screens/SearchScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import ModeSelectScreen from './src/screens/ModeSelectScreen';
import MultiplayerQuickMatchScreen from './src/screens/MultiplayerQuickMatchScreen';
import MatchResultScreen from './src/screens/MatchResultScreen';
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
  const [matchResult, setMatchResult] = useState(null);

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
    setMatchResult(null);
  };

  const cancelPendingMatch = useCallback(async () => {
    if (!supabase) return;
    if (!pendingMatch || pendingMatch.status !== 'waiting') return;
    if (!playerProfile?.playerId) return;

    try {
      await fetch(API_ENDPOINTS.MULTIPLAYER_CANCEL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: playerProfile.playerId,
          matchId: pendingMatch.matchId,
        }),
      });
    } catch (err) {
      console.warn('Failed to cancel pending match:', err?.message);
    }
  }, [pendingMatch, playerProfile?.playerId]);

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
    setMatchResult(null);

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

      if (data.status === 'active' && Array.isArray(data.grid) && data.grid.length > 0) {
        pendingPuzzleRef.current = {
          grid: data.grid,
          words: data.words,
          placements: data.placements,
          topic: data.topic,
        };
      } else {
        pendingPuzzleRef.current = null;
      }

      if (data.topic) {
        setSearchTopic(data.topic);
      }

      if (data.status === 'active') {
        setPuzzleData(pendingPuzzleRef.current);
        setCurrentScreen('wordsearch');
        setIsQuickMatchSearching(false);
      } else {
        setQuickMatchStatus('Waiting for opponent to join…');
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
          setPendingMatch(prev => (prev ? { ...prev, status: 'active', topic: payload.new.topic || prev.topic } : prev));
          const puzzle = pendingPuzzleRef.current || {
            grid: payload.new.grid,
            words: payload.new.words,
            placements: payload.new.placements,
            topic: payload.new.topic,
          };
          pendingPuzzleRef.current = puzzle;
          setPuzzleData(prev => prev || puzzle);
          if (puzzle.topic) {
            setSearchTopic(puzzle.topic);
          }
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

        if (payload) {
          let outcome = payload.outcome || 'draw';
          if (outcome === 'win') outcome = 'lose';
          else if (outcome === 'lose') outcome = 'win';

          const summary = {
            outcome,
            playerWins: payload.opponentWins ?? 0,
            opponentWins: payload.playerWins ?? 0,
            topic: payload.topic || pendingPuzzleRef.current?.topic || searchTopic,
          };

          setMatchResult(summary);
          setCurrentScreen('multiplayer-result');
          cleanupMatchChannel();
        }
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
  }, [gameMode, pendingMatch?.matchId, playerProfile?.playerId, searchTopic]);

  useEffect(() => {
    if (gameMode !== 'multiplayer') return undefined;
    if (!pendingMatch || pendingMatch.status !== 'waiting') return undefined;

    let cancelled = false;
    let timer = null;

    const pollStatus = async () => {
      try {
        const url = `${API_ENDPOINTS.MULTIPLAYER_STATUS}?matchId=${pendingMatch.matchId}`;
        const response = await fetch(url);
        const data = await response.json().catch(() => ({}));

        if (!cancelled && response.ok && data.status === 'active') {
          pendingPuzzleRef.current = {
            grid: data.grid,
            words: data.words,
            placements: data.placements,
            topic: data.topic,
          };

          setPendingMatch(prev => (prev ? { ...prev, status: 'active', topic: data.topic || prev.topic } : prev));

          if (pendingPuzzleRef.current) {
            setSearchTopic(pendingPuzzleRef.current.topic || searchTopic);
            setQuickMatchStatus('Opponent connected! Starting…');
            setPuzzleData(pendingPuzzleRef.current);
            setCurrentScreen('wordsearch');
            setIsQuickMatchSearching(false);
          }
          return;
        }
      } catch (err) {
        console.warn('Match status poll failed:', err?.message);
      }

      if (!cancelled) {
        timer = setTimeout(pollStatus, 2000);
      }
    };

    timer = setTimeout(pollStatus, 1500);

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [gameMode, pendingMatch, searchTopic]);

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

  const broadcastMatchComplete = (summary = {}) => {
    if (!matchChannelRef.current) return;

    matchChannelRef.current
      .send({
        type: 'broadcast',
        event: 'game_over',
        payload: {
          playerId: playerProfile?.playerId,
          outcome: summary.outcome,
          playerWins: summary.playerWins,
          opponentWins: summary.opponentWins,
          topic: summary.topic || pendingPuzzleRef.current?.topic || searchTopic,
        },
      })
      .catch(err => console.warn('Failed to send game_over event:', err?.message));

    setPendingMatch(prev => (prev ? { ...prev, status: 'finished' } : prev));
  };

  const handleMatchResult = (result) => {
    if (!result) return;

    const topic = result.topic || pendingPuzzleRef.current?.topic || searchTopic;
    setMatchResult({
      outcome: result.outcome,
      playerWins: result.playerWins ?? 0,
      opponentWins: result.opponentWins ?? 0,
      topic,
    });

    setIsQuickMatchSearching(false);
    setQuickMatchStatus('Match finished.');
    setPendingMatch(prev => (prev ? { ...prev, status: 'finished' } : prev));
    cleanupMatchChannel();
    setCurrentScreen('multiplayer-result');
  };

  const handleCancelLoading = async () => {
    setLoading(false);
    setCurrentScreen('search');
    setError(null);
    await cancelPendingMatch();
    resetMultiplayerState();
  };

  const handleBackToSearch = async () => {
    if (gameMode === 'multiplayer') {
      setCurrentScreen('multiplayer');
    } else {
      setCurrentScreen('search');
    }
    await cancelPendingMatch();
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

  const handleModeSelect = async (mode) => {
    await cancelPendingMatch();
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

  const handleChangeMode = async () => {
    await cancelPendingMatch();
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

  const handleNewTopic = async () => {
    setSearchTopic('');
    setPuzzleData(null);
    setError(null);
    await cancelPendingMatch();
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

      {currentScreen === 'multiplayer-result' && matchResult && (
        <MatchResultScreen
          outcome={matchResult.outcome}
          playerScore={matchResult.playerWins}
          opponentScore={matchResult.opponentWins}
          topic={matchResult.topic}
          onPlayAgain={() => {
            resetMultiplayerState();
            setCurrentScreen('multiplayer');
          }}
          onExit={() => {
            resetMultiplayerState();
            setCurrentScreen('modeselect');
          }}
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
          onShowResult={gameMode === 'multiplayer' ? handleMatchResult : undefined}
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
