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

export async function authenticateGameCenter() {
  if (!GameCenterModule || !GameCenterModule.default) {
    console.warn('[GameCenter] Module unavailable, returning guest profile');
    return createGuestProfile();
  }

  try {
    const { default: GameCenter } = GameCenterModule;
    console.log('[GameCenter] Attempting sign-in');
    const authResult = await GameCenter.signInAsync();

    if (!authResult?.isAuthenticated) {
      console.warn('[GameCenter] Returned unauthenticated result, using guest profile');
      return createGuestProfile();
    }

    const player = await GameCenter.getPlayerInfoAsync();
    console.log('[GameCenter] Authenticated as', player?.displayName || authResult?.playerId);
    return {
      playerId: player?.playerId || authResult.playerId || createGuestProfile().playerId,
      displayName: player?.displayName || 'Player',
      isGuest: false,
    };
  } catch (error) {
    console.warn('[GameCenter] Authentication failed, falling back to guest:', error);
    return createGuestProfile();
  }
}
