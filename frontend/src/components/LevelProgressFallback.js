import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { getXPProgress } from './LevelProgress';

/**
 * Fallback Level Progress Component (without SVG)
 * Uses a simpler visual representation if react-native-svg is not available
 */
export default function LevelProgressFallback({ xp = 0, style }) {
  const progress = getXPProgress(xp);
  const { level, progress: progressValue } = progress;
  const percentage = Math.round(progressValue * 100);

  return (
    <View style={[styles.container, style]}>
      {/* Level badge */}
      <View style={styles.levelBadge}>
        <Text style={styles.levelText}>{level}</Text>
      </View>

      {/* Circular progress container */}
      <View style={styles.circleContainer}>
        {/* Outer circle (background) */}
        <View style={styles.outerCircle}>
          {/* Progress fill (blue arc simulation) */}
          <View style={[styles.progressFill, { width: `${percentage}%` }]} />
          
          {/* Inner circle with icon */}
          <View style={styles.innerCircle}>
            <Image
              source={require('../../../magnifying-glass-computer-icons-magnification-loupe.jpg')}
              style={styles.icon}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#1976D2',
    borderRadius: 12,
    minWidth: 32,
    height: 32,
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
  circleContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 8,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: '100%',
    backgroundColor: '#1976D2',
    opacity: 0.3,
  },
  innerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  icon: {
    width: 40,
    height: 40,
  },
});

