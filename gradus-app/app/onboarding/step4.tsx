import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingPage } from '@/components/onboarding-page';
import { markOnboardingSeen, hasSeenOnboarding } from '@/utils/onboarding-storage';
import { hasSignedIn } from '@/utils/auth-storage';

export default function OnboardingStep4() {
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
      step={4}
      total={4}
      title="Your Career, Guaranteed"
      body="Join Gradus programs and unlock assured placement with industry-ready training."
      image="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1100&q=80&sat=-50"
      onBack={() => router.back()}
      onNext={async () => {
        await markOnboardingSeen();
        router.replace('/(tabs)');
      }}
      onSkip={async () => {
        await markOnboardingSeen();
        router.replace('/(tabs)');
      }}
      isLast
    />
  );
}
