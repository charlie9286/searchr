import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableWithoutFeedback,
  AccessibilityInfo,
  Animated
} from 'react-native';

const { width, height } = Dimensions.get('window');
// Letters to spell "WordSearchR"
const LETTERS = 'WordSearchR'.split('');

export default function SplashScreen({ onComplete }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const hasStarted = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      // Skip animation for reduced motion
      setShowTitle(true);
      setTimeout(() => {
        handleComplete();
      }, 500);
    } else {
      // Normal animation sequence
      setTimeout(() => {
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
        setShowTitle(true);
      }, 500);

      setTimeout(() => {
        handleComplete();
      }, 4000);
    }
  }, [reducedMotion]);

  const handleComplete = () => {
    if (hasStarted.current) return;
    hasStarted.current = true;
      onComplete();
  };

  const renderLetterRain = () => {
    if (reducedMotion) {
      // Static pattern for reduced motion
      return (
        <View style={styles.staticContainer}>
          {LETTERS.map((letter, index) => (
            <View 
              key={index} 
              style={[
                styles.staticLetter,
                {
                  left: `${(index * 11 + 5)}%`,
                  top: `${20 + (index % 3) * 30}%`,
                }
              ]}
            >
              <Text style={styles.letterText}>{letter}</Text>
            </View>
          ))}
        </View>
      );
    }

    // Animated falling letters
    return LETTERS.map((letter, index) => (
      <FallingLetter 
        key={index} 
        letter={letter} 
        delay={index * 150}
      />
    ));
  };

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={handleComplete}>
        <View style={styles.container}>
          {renderLetterRain()}
          
          {showTitle && (
            <Animated.View 
              style={[
                styles.titleContainer,
                { opacity: titleOpacity }
              ]}
            >
              <Text style={styles.title}>Word Search Generator</Text>
            </Animated.View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

function FallingLetter({ letter, delay }) {
  // Start from above screen with padding to avoid status bar
  const TOP_PADDING = 80;
  const translateY = useRef(new Animated.Value(-TOP_PADDING)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: height + 50,
          duration: 3500 + Math.random() * 1500,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -TOP_PADDING,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [delay]);

  return (
    <Animated.View
      style={[
        styles.fallingLetter,
        {
          left: `${15 + Math.random() * 70}%`,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={styles.letterText}>{letter}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  staticContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  fallingLetter: {
    position: 'absolute',
    opacity: 0.7,
  },
  staticLetter: {
    position: 'absolute',
    opacity: 0.3,
  },
  letterText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
  },
  titleContainer: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
});
