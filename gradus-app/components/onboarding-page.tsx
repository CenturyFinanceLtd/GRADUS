import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type OnboardingPageProps = {
  title: string;
  body: string;
  image: string;
  step: number;
  total: number;
  onNext: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  isLast?: boolean;
};

export function OnboardingPage({
  title,
  body,
  image,
  step,
  total,
  onNext,
  onBack,
  onSkip,
  isLast,
}: OnboardingPageProps) {
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.hero}>
        <Image
          source={require('@/assets/images/onboarding-bg.png')}
          style={styles.heroBg}
          contentFit="cover"
        />

        <View style={styles.topRow}>
          <Pressable style={styles.backButton} onPress={onBack} disabled={!onBack}>
            <Text style={[styles.backText, !onBack && styles.backTextDisabled]}>{'<'}</Text>
          </Pressable>
          <Pressable hitSlop={8} onPress={onSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        <Image source={image} style={styles.person} contentFit="contain" />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>

        <View style={styles.dots}>
          {Array.from({ length: total }).map((_, i) => (
            <View key={i} style={[styles.dot, i === step - 1 && styles.dotActive]} />
          ))}
        </View>

        <Pressable style={styles.nextButton} onPress={onNext}>
          <Text style={styles.nextText}>{isLast ? 'Done' : 'Next'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },
  hero: {
    height: '60%',
    position: 'relative',
    overflow: 'hidden',
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  backText: {
    fontSize: 18,
    color: '#111',
    fontWeight: '600',
  },
  backTextDisabled: {
    color: '#aaa',
  },
  skipText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  person: {
    position: 'absolute',
    bottom: -30,
    alignSelf: 'center',
    width: '95%',
    height: '90%',
  },
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: -56,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#121212',
    textAlign: 'left',
  },
  body: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d8d8d8',
  },
  dotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2d75ff',
  },
  nextButton: {
    marginTop: 24,
    backgroundColor: '#2d75ff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
