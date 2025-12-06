import { supabase } from '../lib/supabase';
import { validateUsername, sanitizeUsername, generateSafeUsername } from '../utils/usernameValidator';

/**
 * User service for managing user data, XP, levels, and display names
 */

/**
 * Get or create user from Game Center profile
 * Validates and sanitizes display name
 */
export async function getOrCreateUser(gameCenterProfile) {
  if (!supabase) {
    console.warn('Supabase not configured');
    return null;
  }

  const { playerId, displayName } = gameCenterProfile;

  if (!playerId) {
    console.error('No playerId provided');
    return null;
  }

  try {
    // Validate and sanitize display name
    let safeDisplayName = displayName || 'Player';
    const validation = validateUsername(safeDisplayName);
    
    if (!validation.valid) {
      console.warn('Invalid username:', validation.reason);
      safeDisplayName = generateSafeUsername(displayName || 'Player');
      console.log('Generated safe username:', safeDisplayName);
    } else {
      safeDisplayName = sanitizeUsername(safeDisplayName);
    }

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', playerId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching user:', fetchError);
      return null;
    }

    if (existingUser) {
      // Update last_seen_at
      const updates = {
        last_seen_at: new Date().toISOString(),
      };

      // Don't auto-update display_name - let user set it themselves
      // Only update last_seen_at
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', playerId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating user:', updateError);
        return existingUser;
      }

      console.log('[userService] Existing user loaded:', { 
        id: updatedUser?.id || existingUser.id, 
        display_name: updatedUser?.display_name || existingUser.display_name 
      });
      return updatedUser || existingUser;
    }

    // Create new user without display_name - user will set it on first login
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        id: playerId,
        display_name: null, // User will set this on first login
        xp: 0,
        level: 1,
        coins: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      return null;
    }

    console.log('[userService] Created new user without display_name:', newUser?.id);
    return newUser;
  } catch (err) {
    console.error('Error in getOrCreateUser:', err);
    return null;
  }
}

/**
 * Award XP to user after completing a game
 * @param {string} userId - User ID
 * @param {number} xpAmount - Amount of XP to award
 * @returns {Promise<Object>} Updated user object
 */
export async function awardXP(userId, xpAmount) {
  if (!supabase || !userId || !xpAmount) {
    return null;
  }

  try {
    // Get current user
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('xp, level')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      console.error('Error fetching user for XP:', fetchError);
      return null;
    }

    const newXP = user.xp + xpAmount;
    
    // Calculate new level
    let newLevel = user.level;
    let levelXP = 100 * newLevel * (newLevel + 1) / 2;
    
    while (newXP >= levelXP) {
      newLevel++;
      levelXP = 100 * newLevel * (newLevel + 1) / 2;
    }

    // Update user
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        xp: newXP,
        level: newLevel,
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating XP:', updateError);
      return null;
    }

    return updatedUser;
  } catch (err) {
    console.error('Error in awardXP:', err);
    return null;
  }
}

/**
 * Get user by ID
 */
export async function getUser(userId) {
  if (!supabase || !userId) {
    return null;
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }

    return user;
  } catch (err) {
    console.error('Error in getUser:', err);
    return null;
  }
}

/**
 * Calculate XP reward for completing a game
 * Base XP + bonus for words found + time bonus
 */
export function calculateXPReward(wordsFound, totalWords, timeSeconds = null) {
  const baseXP = 50;
  const wordsXP = (wordsFound / totalWords) * 100; // Up to 100 XP for finding all words
  const timeBonus = timeSeconds ? Math.max(0, 200 - timeSeconds) / 2 : 0; // Up to 100 XP for speed
  
  return Math.round(baseXP + wordsXP + timeBonus);
}

