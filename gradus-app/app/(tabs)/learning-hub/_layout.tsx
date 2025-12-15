import { Stack } from 'expo-router';

export default function LearningHubLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="course/[id]" />
    </Stack>
  );
}
