/**
 * Username validation for child-friendly usernames
 * Filters out inappropriate words and ensures safe display names
 */

// List of inappropriate words/phrases to filter (add more as needed)
const BLOCKED_WORDS = [
  // Profanity and inappropriate terms
  'fuck', 'shit', 'damn', 'hell', 'ass', 'bitch', 'bastard',
  // Sexual content
  'sex', 'porn', 'xxx', 'nsfw',
  // Violence
  'kill', 'murder', 'death', 'suicide',
  // Drugs and alcohol
  'drug', 'cocaine', 'heroin', 'marijuana', 'weed', 'alcohol',
  // Hate speech indicators
  'hate', 'racist', 'nazi',
  // Other inappropriate
  'stupid', 'idiot', 'retard', 'dumb',
];

// Patterns to block (partial matches)
const BLOCKED_PATTERNS = [
  /[0-9]{4,}/, // Too many consecutive numbers (likely phone/SSN)
  /(.)\1{4,}/, // Same character repeated 5+ times (spam)
];

/**
 * Validates if a username is child-friendly
 * @param {string} username - The username to validate
 * @returns {Object} { valid: boolean, reason?: string }
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, reason: 'Username is required' };
  }

  const trimmed = username.trim();

  // Length checks
  if (trimmed.length < 3) {
    return { valid: false, reason: 'Username must be at least 3 characters' };
  }

  if (trimmed.length > 20) {
    return { valid: false, reason: 'Username must be 20 characters or less' };
  }

  // Character validation (alphanumeric, spaces, hyphens, underscores only)
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
    return { valid: false, reason: 'Username can only contain letters, numbers, spaces, hyphens, and underscores' };
  }

  // Check for blocked words (case-insensitive)
  const lowerUsername = trimmed.toLowerCase();
  for (const word of BLOCKED_WORDS) {
    if (lowerUsername.includes(word.toLowerCase())) {
      return { valid: false, reason: 'Username contains inappropriate content' };
    }
  }

  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, reason: 'Username contains invalid patterns' };
    }
  }

  // Check for only spaces/whitespace
  if (!trimmed.replace(/\s/g, '').length) {
    return { valid: false, reason: 'Username cannot be only spaces' };
  }

  return { valid: true };
}

/**
 * Sanitizes a username by removing invalid characters
 * @param {string} username - The username to sanitize
 * @returns {string} Sanitized username
 */
export function sanitizeUsername(username) {
  if (!username || typeof username !== 'string') {
    return '';
  }

  // Remove invalid characters, keep only alphanumeric, spaces, hyphens, underscores
  let sanitized = username.replace(/[^a-zA-Z0-9\s\-_]/g, '');

  // Trim and limit length
  sanitized = sanitized.trim().substring(0, 20);

  // Remove excessive spaces
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
}

/**
 * Generates a safe default username if validation fails
 * @param {string} originalUsername - The original username
 * @returns {string} Safe default username
 */
export function generateSafeUsername(originalUsername) {
  const sanitized = sanitizeUsername(originalUsername);
  
  if (sanitized.length >= 3) {
    // Try to use sanitized version if it's valid
    const validation = validateUsername(sanitized);
    if (validation.valid) {
      return sanitized;
    }
  }

  // Generate a random safe username
  const randomNum = Math.floor(Math.random() * 10000);
  return `Player${randomNum}`;
}

