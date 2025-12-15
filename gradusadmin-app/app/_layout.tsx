import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AdminAuthProvider } from "../context/AdminAuthContext";

export default function RootLayout() {
  return (
    <AdminAuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AdminAuthProvider>
  );
}
