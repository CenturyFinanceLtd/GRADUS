import { Tabs } from "expo-router";
import { Text } from "react-native";
import { Colors } from "../../constants";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          headerTitle: "Gradus Admin",
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>📊</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: "Courses",
          headerShown: false,
          tabBarLabel: "Courses",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>📚</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          headerShown: false,
          tabBarLabel: "Users",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>👥</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          headerShown: false,
          tabBarLabel: "More",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>⋯</Text>
          ),
        }}
      />
    </Tabs>
  );
}
