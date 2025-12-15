import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingPage } from '@/components/onboarding-page';
import { markOnboardingSeen, hasSeenOnboarding } from '@/utils/onboarding-storage';
import { hasSignedIn } from '@/utils/auth-storage';

export default function OnboardingStep1() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const [seen, signedIn] = await Promise.all([hasSeenOnboarding(), hasSignedIn()]);
      if (seen || signedIn) {
        router.replace('/(tabs)');
      }
    })();
  }, [router]);

  return (
    <OnboardingPage
      step={1}
      total={4}
      title="Welcome to Gradus"
      body="Begin your journey with Gradus—designed to take you from classroom knowledge to real employability."
      image="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1100&q=80"
      onNext={() => router.push('/onboarding/step2')}
      onSkip={async () => {
        await markOnboardingSeen();
        router.replace('/(tabs)');
      }}
    />
  );
}
