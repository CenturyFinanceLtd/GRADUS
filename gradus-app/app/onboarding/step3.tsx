import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingPage } from '@/components/onboarding-page';
import { markOnboardingSeen, hasSeenOnboarding } from '@/utils/onboarding-storage';
import { hasSignedIn } from '@/utils/auth-storage';

export default function OnboardingStep3() {
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
      step={3}
      total={4}
      title="Learn from top Mentors"
      body="Industry mentors are here to coach you through everything you need to know to get to your goal."
      image="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1100&q=80&sat=-30"
      onBack={() => router.back()}
      onNext={() => router.push('/onboarding/step4')}
      onSkip={async () => {
        await markOnboardingSeen();
        router.replace('/(tabs)');
      }}
    />
  );
}
