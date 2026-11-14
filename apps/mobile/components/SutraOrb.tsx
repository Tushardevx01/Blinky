import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '../theme/theme';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'responding' | 'executing';

interface SutraOrbProps {
  state?: OrbState;
  size?: number;
}

/**
 * SUTRA AI Orb
 * Signature component reflecting the AI's internal state.
 * States:
 * - idle: Gentle, rhythmic breathing pulse
 * - listening: Dynamic wave/ripple responsiveness
 * - thinking: Continuous rotational swirl and core shift
 * - responding: Soft radiant bloom
 * - executing: Crisp, rapid kinetic pulse
 */
export function SutraOrb({ state = 'idle', size = 80 }: SutraOrbProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const bloomAnim = useRef(new Animated.Value(0.7)).current;
  const rippleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    pulseAnim.stopAnimation();
    rotateAnim.stopAnimation();
    bloomAnim.stopAnimation();
    rippleAnim.stopAnimation();

    if (state === 'idle') {
      // Gentle breathing
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else if (state === 'listening') {
      // Audio reactive ripple
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(rippleAnim, {
              toValue: 1.25,
              duration: 800,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(bloomAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(rippleAnim, {
              toValue: 1,
              duration: 800,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(bloomAnim, {
              toValue: 0.6,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    } else if (state === 'thinking') {
      // Continuous orbit / rotation
      rotateAnim.setValue(0);
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.95,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else if (state === 'responding') {
      // Soft radiant bloom cadence
      Animated.loop(
        Animated.sequence([
          Animated.timing(bloomAnim, {
            toValue: 1.15,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(bloomAnim, {
            toValue: 0.85,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else if (state === 'executing') {
      // Crisp rapid pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.18,
            duration: 350,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.96,
            duration: 450,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [state]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getPrimaryOrbColor = () => {
    switch (state) {
      case 'listening':
        return colors.accent;
      case 'thinking':
        return '#8B5CF6';
      case 'responding':
        return colors.accent;
      case 'executing':
        return '#5E3EB8';
      case 'idle':
      default:
        return colors.accent;
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Outer Ripple / Bloom Halo */}
      <Animated.View
        style={[
          styles.halo,
          {
            width: size * 1.3,
            height: size * 1.3,
            borderRadius: (size * 1.3) / 2,
            backgroundColor: colors.accentSecondary,
            opacity: bloomAnim,
            transform: [{ scale: rippleAnim }],
          },
        ]}
      />

      {/* Orbiting / Pulsing Core */}
      <Animated.View
        style={[
          styles.core,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: getPrimaryOrbColor(),
            transform: [{ scale: pulseAnim }, { rotate: spin }],
          },
        ]}
      >
        {/* Internal Swirl Accent */}
        <View
          style={[
            styles.innerGlow,
            {
              width: size * 0.45,
              height: size * 0.45,
              borderRadius: (size * 0.45) / 2,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
  },
  core: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  innerGlow: {
    backgroundColor: '#FFFFFF',
    opacity: 0.5,
  },
});
