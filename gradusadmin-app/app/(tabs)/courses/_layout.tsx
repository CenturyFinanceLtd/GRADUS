import { Stack } from "expo-router";
import { Colors } from "../../../constants";

export default function CoursesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Courses" }} />
      <Stack.Screen name="[slug]" options={{ title: "Course Details" }} />
      <Stack.Screen name="enrollments" options={{ title: "Enrollments" }} />
    </Stack>
  );
}
