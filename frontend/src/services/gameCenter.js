import { Platform } from 'react-native';

let GameCenterModule = null;
try {
  // eslint-disable-next-line global-require
  GameCenterModule = require('expo-game-center');
} catch (err) {
  console.warn('[GameCenter] expo-game-center module not available, using guest fallback.');
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
    return createGuestProfile();
  }

  try {
    const { default: GameCenter } = GameCenterModule;
    const authResult = await GameCenter.signInAsync();

    if (!authResult?.isAuthenticated) {
      return createGuestProfile();
    }

    const player = await GameCenter.getPlayerInfoAsync();
    return {
      playerId: player?.playerId || authResult.playerId || createGuestProfile().playerId,
      displayName: player?.displayName || 'Player',
      isGuest: false,
    };
  } catch (error) {
    console.warn('[GameCenter] Authentication failed, falling back to guest:', error?.message);
    return createGuestProfile();
  }
}
