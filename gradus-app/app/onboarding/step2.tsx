import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingPage } from '@/components/onboarding-page';
import { markOnboardingSeen, hasSeenOnboarding } from '@/utils/onboarding-storage';
import { hasSignedIn } from '@/utils/auth-storage';

export default function OnboardingStep2() {
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
      step={2}
      total={4}
      title="Career Paths Built for Your Success"
      body="Tech, business, or sales—choose your track and get ready to hit your goals with Gradus."
      image="https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1100&q=80"
      onBack={() => router.back()}
      onNext={() => router.push('/onboarding/step3')}
      onSkip={async () => {
        await markOnboardingSeen();
        router.replace('/(tabs)');
      }}
    />
  );
}
