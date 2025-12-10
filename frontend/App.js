import { registerRootComponent } from 'expo';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';

import SplashScreen from './src/screens/SplashScreen';
import SearchScreen from './src/screens/SearchScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import ModeSelectScreen from './src/screens/ModeSelectScreen';
import MiniGamesScreen from './src/screens/MiniGamesScreen';
import MultiplayerQuickMatchScreen from './src/screens/MultiplayerQuickMatchScreen';
import MatchResultScreen from './src/screens/MatchResultScreen';
import WordSearchScreen from './src/screens/WordSearchScreen';
import DisplayNameSetupScreen from './src/screens/DisplayNameSetupScreen';
import Mystery from './src/components/mystery';
import { API_ENDPOINTS } from './src/config';
import { supabase } from './src/lib/supabase';
import { authenticateGameCenter } from './src/services/gameCenter';
import { getOrCreateUser, getUser } from './src/services/userService';

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
  const [userXP, setUserXP] = useState(0);
  const [userData, setUserData] = useState(null);
  const [displayNameDone, setDisplayNameDone] = useState(false);

  const matchChannelRef = useRef(null);
  const pendingPuzzleRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    console.log('[App] Starting initial Game Center authentication...');
    authenticateGameCenter()
      .then(async (profile) => {
        console.log('[App] Authentication result:', JSON.stringify(profile, null, 2));
        if (isMounted) {
          setPlayerProfile(profile);
          if (profile.isGuest) {
            console.warn('[App] ⚠️ Player authenticated as Guest - Game Center may not be available');
          } else {
            console.log('[App] ✓ Player authenticated as:', profile.displayName);
          }
          
          // Get or create user in database (for both guest and authenticated users)
          const user = await getOrCreateUser(profile);
          if (user && isMounted) {
            setUserData(user);
            setUserXP(user.xp || 0);
            const needsDisplayName = !user.display_name || user.display_name.trim() === '';
            console.log('[App] ✓ User data loaded:', { 
              xp: user.xp, 
              level: user.level, 
              displayName: user.display_name,
              needsDisplayName 
            });
            
            // If splash is already complete and user needs display name, navigate there
            if (currentScreen !== 'splash' && needsDisplayName) {
              console.log('[App] Navigating to display name setup');
              setCurrentScreen('displayname');
            }
          }
        }
      })
      .catch(err => {
        console.error('[App] Game Center auth error:', err?.message || err);
        if (isMounted) {
          const guestProfile = { playerId: `guest-${Date.now()}`, displayName: null, isGuest: true };
          setPlayerProfile(guestProfile);
          console.warn('[App] ⚠️ Falling back to Guest profile');
          
          // Still create user record for guest users
          getOrCreateUser(guestProfile)
            .then(user => {
              if (user && isMounted) {
                setUserData(user);
                setUserXP(user.xp || 0);
                const needsDisplayName = !user.display_name || user.display_name.trim() === '';
                console.log('[App] ✓ Guest user data loaded:', { 
                  xp: user.xp, 
                  level: user.level, 
                  displayName: user.display_name,
                  needsDisplayName 
                });
              }
            })
            .catch(userErr => {
              console.error('[App] Error creating guest user:', userErr);
            });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Re-authenticate when multiplayer screen is shown if player is still Guest
  useEffect(() => {
    if (currentScreen === 'multiplayer' && playerProfile?.isGuest) {
      console.log('[App] Multiplayer screen shown with Guest profile - attempting re-authentication...');
      let isMounted = true;
      
      // Wait a bit then try to authenticate again
      const timeoutId = setTimeout(() => {
        authenticateGameCenter(3, 2000) // Fewer retries, longer delay
          .then(profile => {
            console.log('[App] Re-authentication result:', JSON.stringify(profile, null, 2));
            if (isMounted && !profile.isGuest) {
              console.log('[App] ✓ Re-authentication successful:', profile.displayName);
              setPlayerProfile(profile);
            } else if (isMounted) {
              console.warn('[App] Re-authentication still returned Guest');
            }
          })
          .catch(err => {
            console.error('[App] Re-authentication error:', err?.message || err);
          });
      }, 1000);

      return () => {
        isMounted = false;
        clearTimeout(timeoutId);
      };
    }
  }, [currentScreen, playerProfile?.isGuest]);

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
    // If userData is not loaded yet, wait for it
    // Otherwise check if display name is needed
    if (userData) {
      if (!userData.display_name || userData.display_name.trim() === '') {
        setCurrentScreen('displayname');
      } else {
        setCurrentScreen('modeselect');
      }
    } else {
      // User data not loaded yet, go to mode select for now
      // Will be redirected if display name is needed when userData loads
      setCurrentScreen('modeselect');
    }
  };

  // Check if user needs display name when userData changes or screen changes
  useEffect(() => {
    if (userData) {
      const needsDisplayName = !userData.display_name || userData.display_name.trim() === '';
      
      if (needsDisplayName) {
        // If we're on modeselect or splash, redirect to display name
        if (!displayNameDone && (currentScreen === 'modeselect' || currentScreen === 'splash')) {
          console.log('[App] User needs display name, redirecting to setup screen', {
            currentScreen,
            display_name: userData.display_name,
            userId: userData.id
          });
          // Small delay to ensure splash has completed
          const timer = setTimeout(() => {
            setCurrentScreen('displayname');
          }, 100);
          return () => clearTimeout(timer);
        }
      } else {
        // User has display name, make sure we're not stuck on displayname screen
        if (currentScreen === 'displayname') {
          console.log('[App] User has display name, redirecting to mode select');
          setCurrentScreen('modeselect');
        }
        setDisplayNameDone(true);
      }
    } else if (playerProfile && !playerProfile.isGuest) {
      // If we have a player profile but no userData yet, try to get/create user
      console.log('[App] Have player profile but no userData, attempting to get/create user');
      getOrCreateUser(playerProfile)
        .then(user => {
          if (user) {
            setUserData(user);
            setUserXP(user.xp || 0);
          }
        })
        .catch(err => {
          console.error('[App] Error getting/creating user:', err);
        });
    }
  }, [userData, currentScreen, playerProfile]);

  const handleDisplayNameComplete = (updatedUser) => {
    // Update user data and navigate to mode select
    setUserData(updatedUser);
    setUserXP(updatedUser.xp || 0);
    setDisplayNameDone(true);
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

    setQuickMatchStatus('Finding player…');
    let activeProfile = playerProfile;
    if (!activeProfile?.playerId) {
      try {
        activeProfile = await authenticateGameCenter();
        setPlayerProfile(activeProfile);
      } catch (authErr) {
        console.warn('Game Center re-auth failed:', authErr?.message);
        activeProfile = { playerId: `guest-${Date.now()}`, displayName: null, isGuest: true };
        setPlayerProfile(activeProfile);
      }
    }

    // Ensure user exists in database before matchmaking
    // Note: userData.id will be a UUID (even for guests), so we need to check differently
    if (!userData) {
      try {
        console.log('[App] Creating/getting user before matchmaking...');
        const user = await getOrCreateUser(activeProfile);
        if (user) {
          setUserData(user);
          setUserXP(user.xp || 0);
        } else {
          setError('Failed to create user account. Please try again.');
          setQuickMatchStatus('Failed to create user account.');
          setIsQuickMatchSearching(false);
          return;
        }
      } catch (userErr) {
        console.error('[App] Error creating/getting user:', userErr);
        setError('Failed to create user account. Please try again.');
        setQuickMatchStatus('Failed to create user account.');
        setIsQuickMatchSearching(false);
        return;
      }
    }

    setOpponentFoundWords(() => new Set());
    setError(null);
    setIsQuickMatchSearching(true);
    setQuickMatchStatus('Finding player…');
    setMatchResult(null);

    try {
      const response = await fetch(API_ENDPOINTS.MULTIPLAYER_QUICKMATCH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: userData?.id || activeProfile.playerId, // Use userData.id (UUID) if available
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
        // Check if puzzle is ready
        if (pendingPuzzleRef.current && Array.isArray(pendingPuzzleRef.current.grid) && pendingPuzzleRef.current.grid.length > 0) {
          setPuzzleData(pendingPuzzleRef.current);
          setCurrentScreen('wordsearch');
          setIsQuickMatchSearching(false);
        } else {
          // Puzzle is being generated
          setQuickMatchStatus('Game loading…');
          setIsQuickMatchSearching(true);
        }
      } else if (data.status === 'generating') {
        setQuickMatchStatus('Game loading…');
        setIsQuickMatchSearching(true);
      } else {
        setQuickMatchStatus('Waiting for player to join…');
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
          
          // Check if puzzle data is ready
          if (puzzle && Array.isArray(puzzle.grid) && puzzle.grid.length > 0) {
            pendingPuzzleRef.current = puzzle;
            setPuzzleData(prev => prev || puzzle);
            if (puzzle.topic) {
              setSearchTopic(puzzle.topic);
            }
            setCurrentScreen('wordsearch');
            setIsQuickMatchSearching(false);
          } else {
            // Puzzle still being generated
            setQuickMatchStatus('Game loading…');
            setIsQuickMatchSearching(true);
          }
        } else if (newStatus === 'generating') {
          setQuickMatchStatus('Game loading…');
          setIsQuickMatchSearching(true);
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

        if (!cancelled && response.ok) {
          if (data.status === 'active') {
            pendingPuzzleRef.current = {
              grid: data.grid,
              words: data.words,
              placements: data.placements,
              topic: data.topic,
            };

            setPendingMatch(prev => (prev ? { ...prev, status: 'active', topic: data.topic || prev.topic } : prev));

            // Check if puzzle data is ready
            if (pendingPuzzleRef.current && Array.isArray(pendingPuzzleRef.current.grid) && pendingPuzzleRef.current.grid.length > 0) {
              setSearchTopic(pendingPuzzleRef.current.topic || searchTopic);
              setPuzzleData(pendingPuzzleRef.current);
              setCurrentScreen('wordsearch');
              setIsQuickMatchSearching(false);
            } else {
              // Puzzle still being generated
              setQuickMatchStatus('Game loading…');
              setIsQuickMatchSearching(true);
            }
            return;
          } else if (data.status === 'generating') {
            setQuickMatchStatus('Game loading…');
            setIsQuickMatchSearching(true);
            return;
          }
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

  const handleMiniGames = async () => {
    await cancelPendingMatch();
    setSearchTopic('');
    setPuzzleData(null);
    setError(null);
    setLoading(false);
    setCurrentScreen('minigames');
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

      {currentScreen === 'displayname' && (userData || playerProfile) && (
        <DisplayNameSetupScreen
          userId={userData?.id || playerProfile?.playerId}
          onComplete={handleDisplayNameComplete}
        />
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
          onMiniGames={handleMiniGames}
          onMultiplayer={() => handleModeSelect('multiplayer')}
          onBack={canModeSelectGoBack ? handleModeSelectBack : undefined}
          userXP={userXP}
        />
      )}

      {currentScreen === 'minigames' && (
        <MiniGamesScreen
          onPractice={() => handleModeSelect('practice')}
          onShuffle={() => handleModeSelect('shuffle')}
          onMystery={() => handleModeSelect('mystery')}
          onBack={() => setCurrentScreen('modeselect')}
        />
      )}

      {currentScreen === 'multiplayer' && (
        <MultiplayerQuickMatchScreen
          playerName={userData?.display_name || playerProfile?.displayName || 'Guest'}
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
      
      {currentScreen === 'wordsearch' && puzzleData && gameMode === 'mystery' && (
        <Mystery
          puzzle={puzzleData}
          topic={searchTopic}
          onBack={handleBackToSearch}
          onNewTopic={handleNewTopic}
        />
      )}

      {currentScreen === 'wordsearch' && puzzleData && gameMode !== 'mystery' && (
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
