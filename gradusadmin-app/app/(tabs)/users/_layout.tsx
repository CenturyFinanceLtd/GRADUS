import { Stack } from "expo-router";
import { Colors } from "../../../constants";

export default function UsersLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Website Users" }} />
      <Stack.Screen name="[id]" options={{ title: "User Details" }} />
    </Stack>
  );
}
