import { Stack } from "expo-router";
import { Colors } from "../../../constants";

export default function MoreLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "More" }} />
      <Stack.Screen name="events" options={{ title: "Events" }} />
      <Stack.Screen name="emails" options={{ title: "Emails" }} />
      <Stack.Screen name="tickets" options={{ title: "Tickets" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}
