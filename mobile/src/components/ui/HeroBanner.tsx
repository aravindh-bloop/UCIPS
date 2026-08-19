import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from './Text';
import { palette, radii, spacing, gradients } from '../../theme';

interface HeroBannerProps {
  onPress: () => void;
}

export function HeroBanner({ onPress }: HeroBannerProps) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Text variant="h2" style={styles.title}>
            Report, track and see{'\n'}
            <Text variant="h2" style={styles.highlight}>real change</Text> in your area
          </Text>
          
          <Pressable style={styles.button} onPress={onPress}>
            <Text variant="label" style={styles.buttonText}>
              Report an issue
            </Text>
            <Ionicons name="chevron-forward" size={16} color={palette.primary} />
          </Pressable>
        </View>
        
        {/* Abstract graphic representation since we don't have the 3D asset */}
        <View style={styles.graphicContainer}>
          <Ionicons name="map" size={100} color="rgba(255,255,255,0.15)" style={styles.bgIcon} />
          <View style={styles.pinCircle}>
            <Ionicons name="location" size={32} color={palette.white} />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    marginVertical: spacing.lg,
  },
  gradient: {
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 160,
  },
  content: {
    flex: 1,
    zIndex: 2,
  },
  title: {
    color: palette.white,
    marginBottom: spacing.lg,
    lineHeight: 28,
  },
  highlight: {
    color: '#FBCFE8', // A soft pink/purple highlight to match the mockup
  },
  button: {
    backgroundColor: palette.white,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  buttonText: {
    color: palette.primary,
  },
  graphicContainer: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  bgIcon: {
    position: 'absolute',
    transform: [{ rotate: '-15deg' }],
  },
  pinCircle: {
    width: 60,
    height: 60,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -10 }, { translateX: -10 }],
  },
});
