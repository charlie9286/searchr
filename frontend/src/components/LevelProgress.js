import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

// Try to import react-native-svg, fallback if not available
let Svg, Rect, Path;
try {
  const svgModule = require('react-native-svg');
  Svg = svgModule.default || svgModule.Svg;
  Rect = svgModule.Rect;
  Path = svgModule.Path;
} catch (e) {
  console.warn('react-native-svg not available, using fallback');
  Svg = null;
  Rect = null;
  Path = null;
}

/**
 * Calculate XP required for a given level
 * Formula: XP = 100 * level * (level + 1) / 2
 * This creates exponential growth: Level 1 = 100, Level 2 = 300, Level 3 = 600, etc.
 */
export function getXPForLevel(level) {
  return 100 * level * (level + 1) / 2;
}

/**
 * Calculate level from total XP
 */
export function getLevelFromXP(totalXP) {
  let level = 1;
  while (getXPForLevel(level + 1) <= totalXP) {
    level++;
  }
  return level;
}

/**
 * Get XP progress for current level
 * @param {number} totalXP - Total XP accumulated
 * @returns {Object} { level, currentLevelXP, nextLevelXP, progress }
 */
export function getXPProgress(totalXP) {
  const level = getLevelFromXP(totalXP);
  const xpForCurrentLevel = getXPForLevel(level);
  const xpForNextLevel = getXPForLevel(level + 1);
  const xpInCurrentLevel = totalXP - xpForCurrentLevel;
  const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
  const progress = xpNeededForNextLevel > 0 ? xpInCurrentLevel / xpNeededForNextLevel : 1;

  return {
    level,
    currentLevelXP: xpInCurrentLevel,
    nextLevelXP: xpNeededForNextLevel,
    progress: Math.min(progress, 1), // Cap at 1.0
  };
}

/**
 * Level Progress Component
 * Shows a circular progress indicator with level number
 */
export default function LevelProgress({ xp = 0, style }) {
  const progress = useMemo(() => getXPProgress(xp), [xp]);
  const { level, progress: progressValue } = progress;

  const percentage = Math.round(progressValue * 100);
  const outerSize = 80; // Total size including border
  const strokeWidth = 8; // Border width
  const innerSize = outerSize - (strokeWidth * 2); // Inner square size = 80 - 16 = 64
  const perimeter = innerSize * 4; // Square perimeter = 64 * 4 = 256
  const progressLength = perimeter * progressValue;

  return (
    <View style={[styles.container, style]}>
      {/* Square progress container */}
      <View style={styles.squareContainer}>
        {Svg && Rect && Path ? (
          <>
            <Svg width={outerSize} height={outerSize} style={styles.svg}>
              {/* Background square border (gray) */}
              <Rect
                x={strokeWidth}
                y={strokeWidth}
                width={innerSize}
                height={innerSize}
                stroke="#E0E0E0"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Progress square border (blue) - drawn as path */}
              <Path
                d={getSquareProgressPath(strokeWidth, innerSize, progressLength, perimeter)}
                stroke="#1976D2"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            {/* Magnifying glass icon filling inner square */}
            <View style={[styles.iconContainer, { width: innerSize, height: innerSize, top: strokeWidth, left: strokeWidth }]}>
              <Image
                source={require('../../assets/glass.png')}
                style={styles.icon}
                resizeMode="cover"
              />
              {/* Level badge inside the magnifying glass */}
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{level}</Text>
              </View>
            </View>
          </>
        ) : (
          // Fallback: simple square with fill
          <View style={styles.outerSquare}>
            <View style={[styles.progressFill, { height: `${percentage}%` }]} />
            {/* Magnifying glass icon filling inner square */}
            <View style={[styles.iconContainer, { width: innerSize, height: innerSize, top: strokeWidth, left: strokeWidth }]}>
              <Image
                source={require('../../assets/glass.png')}
                style={styles.icon}
                resizeMode="cover"
              />
              {/* Level badge inside the magnifying glass */}
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{level}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Generate SVG path for square progress border
 */
function getSquareProgressPath(offset, size, progressLength, perimeter) {
  if (progressLength <= 0) return '';
  if (progressLength >= perimeter) {
    // Full square
    return `M ${offset} ${offset} L ${offset + size} ${offset} L ${offset + size} ${offset + size} L ${offset} ${offset + size} Z`;
  }

  const sideLength = size;
  let path = '';
  let currentLength = 0;
  const startX = offset;
  const startY = offset;

  // Top edge (left to right)
  if (currentLength + sideLength <= progressLength) {
    path += `M ${startX} ${startY} L ${startX + sideLength} ${startY} `;
    currentLength += sideLength;
  } else {
    const remaining = progressLength - currentLength;
    path += `M ${startX} ${startY} L ${startX + remaining} ${startY} `;
    return path;
  }

  // Right edge (top to bottom)
  if (currentLength + sideLength <= progressLength) {
    path += `L ${startX + sideLength} ${startY + sideLength} `;
    currentLength += sideLength;
  } else {
    const remaining = progressLength - currentLength;
    path += `L ${startX + sideLength} ${startY + remaining} `;
    return path;
  }

  // Bottom edge (right to left)
  if (currentLength + sideLength <= progressLength) {
    path += `L ${startX} ${startY + sideLength} `;
    currentLength += sideLength;
  } else {
    const remaining = progressLength - currentLength;
    path += `L ${startX + sideLength - remaining} ${startY + sideLength} `;
    return path;
  }

  // Left edge (bottom to top)
  const remaining = progressLength - currentLength;
  if (remaining > 0) {
    path += `L ${startX} ${startY + sideLength - remaining} `;
  }

  return path;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadge: {
    position: 'absolute',
    top: 7, // Moved 1 pixel up (8 - 1 = 7)
    left: 6.8, // Moved 0.8 pixels to the right (6 + 0.8 = 6.8)
    backgroundColor: '#0065a7',
    borderRadius: 16.48, // 3% bigger: 16 * 1.03 = 16.48
    minWidth: 32.96, // 3% bigger: 32 * 1.03 = 32.96
    height: 32.96, // 3% bigger: 32 * 1.03 = 32.96
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  squareContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  iconContainer: {
    position: 'absolute',
    zIndex: 5,
    overflow: 'hidden',
  },
  icon: {
    width: '100%',
    height: '100%',
  },
  // Fallback styles (when SVG not available)
  outerSquare: {
    width: 80,
    height: 80,
    borderRadius: 4,
    borderWidth: 8,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1976D2',
    opacity: 0.3,
    zIndex: 1,
  },
});

