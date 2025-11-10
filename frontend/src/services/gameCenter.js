import { Platform } from 'react-native';

let GameCenterModule = null;
try {
  // eslint-disable-next-line global-require
  GameCenterModule = require('expo-game-center');
} catch (err) {
  console.warn('[GameCenter] expo-game-center module not available, using guest fallback.', err);
}

function createGuestProfile() {
  const randomId = `guest-${Platform.OS}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    playerId: randomId,
    displayName: 'Guest',
    isGuest: true,
  };
}

export async function authenticateGameCenter(maxRetries = 10, delayMs = 2000) {
  if (!GameCenterModule || !GameCenterModule.default) {
    console.warn('[GameCenter] Module unavailable, returning guest profile');
    return createGuestProfile();
  }

  const { default: GameCenter } = GameCenterModule;

  // First, wait for native authentication to complete (from AppDelegate)
  // Native auth can take 2-5 seconds, and expo-game-center needs additional time to sync
  // Wait longer to ensure native auth is fully complete and expo-game-center has synced
  console.log('[GameCenter] Waiting 5 seconds for native authentication to complete and expo-game-center to sync...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      if (attempt > 0) {
        const delay = delayMs * attempt;
        console.log(`[GameCenter] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Try to get player info first (in case already authenticated by native)
      // This should work if native authentication succeeded and expo-game-center has synced
      try {
        console.log(`[GameCenter] [Attempt ${attempt + 1}] Checking if player is already authenticated...`);
        const player = await Promise.race([
          GameCenter.getPlayerInfoAsync(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('getPlayerInfoAsync timeout')), 5000))
        ]);
        console.log('[GameCenter] getPlayerInfoAsync result:', JSON.stringify(player, null, 2));
        
        if (player && typeof player === 'object') {
          // Check for playerId in various possible properties
          const playerId = player.playerID || player.playerId || player.gamePlayerID || player.gamePlayerId;
          const displayName = player.displayName || player.alias || player.name;
          
          if (playerId) {
            const finalDisplayName = displayName || 'Player';
            console.log('[GameCenter] ✓✓✓ Player already authenticated natively:', finalDisplayName, '(', playerId, ')');
            return {
              playerId: playerId,
              displayName: finalDisplayName,
              isGuest: false,
            };
          } else {
            console.warn('[GameCenter] getPlayerInfoAsync returned player object but no playerId found. Keys:', Object.keys(player));
          }
        } else {
          console.warn('[GameCenter] getPlayerInfoAsync returned non-object:', typeof player, player);
        }
      } catch (infoError) {
        console.log(`[GameCenter] getPlayerInfoAsync failed on attempt ${attempt + 1} (player may not be authenticated yet):`, infoError?.message || infoError);
      }

      // If not authenticated, try to sign in
      // Note: signInAsync should be idempotent - if already authenticated natively, it should detect it
      console.log('[GameCenter] Attempting sign-in (attempt', attempt + 1, '/', maxRetries, ')');
      let authResult;
      try {
        // Add timeout to signInAsync as well
        authResult = await Promise.race([
          GameCenter.signInAsync(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('signInAsync timeout')), 10000))
        ]);
        console.log('[GameCenter] signInAsync result:', JSON.stringify(authResult, null, 2));
      } catch (signInError) {
        console.warn('[GameCenter] signInAsync threw an error:', signInError?.message || signInError);
        // Even if signInAsync throws, the player might still be authenticated natively
        // Wait a bit and try getting player info again (expo-game-center might need time to sync)
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          console.log('[GameCenter] Retrying getPlayerInfoAsync after signInAsync error...');
          const player = await GameCenter.getPlayerInfoAsync();
          const playerId = player?.playerID || player?.playerId || player?.gamePlayerID || player?.gamePlayerId;
          if (playerId) {
            const displayName = player?.displayName || player?.alias || player?.name || 'Player';
            console.log('[GameCenter] ✓✓✓ Player authenticated (detected after signInAsync error):', displayName);
            return {
              playerId: playerId,
              displayName: displayName,
              isGuest: false,
            };
          }
        } catch (finalError) {
          console.warn('[GameCenter] Could not get player info after signInAsync error:', finalError?.message);
        }
        // Continue to next attempt (signInAsync failed, but we'll try again)
        continue;
      }

      // Check if authenticated (check both isAuthenticated flag and presence of playerId in various formats)
      const authPlayerId = authResult?.playerID || authResult?.playerId || authResult?.gamePlayerID || authResult?.gamePlayerId;
      const isAuthenticated = authResult?.isAuthenticated === true || authPlayerId != null;
      
      if (isAuthenticated && authPlayerId) {
        console.log('[GameCenter] Sign-in successful on attempt', attempt + 1);
        
        // Get player info after successful sign-in (most reliable source)
        try {
          const player = await GameCenter.getPlayerInfoAsync();
          const playerId = player?.playerID || player?.playerId || player?.gamePlayerID || player?.gamePlayerId;
          if (playerId) {
            const displayName = player?.displayName || player?.alias || player?.name || 'Player';
            console.log('[GameCenter] ✓✓✓ Authenticated as', displayName, '(', playerId, ')');
            return {
              playerId: playerId,
              displayName: displayName,
              isGuest: false,
            };
          }
        } catch (playerError) {
          console.warn('[GameCenter] Failed to get player info after sign-in:', playerError?.message);
          // Fall through to use authResult data
        }

        // Fallback to authResult data if it has player info
        const displayName = authResult?.displayName || authResult?.alias || authResult?.name || 'Player';
        console.log('[GameCenter] ✓✓✓ Using authResult data:', displayName, '(', authPlayerId, ')');
        return {
          playerId: authPlayerId,
          displayName: displayName,
          isGuest: false,
        };
      } else {
        console.warn('[GameCenter] Sign-in returned unauthenticated on attempt', attempt + 1, 'authResult:', JSON.stringify(authResult, null, 2));
      }
    } catch (error) {
      console.warn(`[GameCenter] Authentication attempt ${attempt + 1} failed:`, error?.message || error);
      if (attempt === maxRetries - 1) {
        console.warn('[GameCenter] All authentication attempts failed, using guest profile');
      }
    }
  }

  console.warn('[GameCenter] Exhausted all authentication attempts, using guest profile');
  return createGuestProfile();
}
