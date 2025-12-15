import { Tabs } from "expo-router";
import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";

import { HapticTab } from "@/components/haptic-tab";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#3c7bff",
        tabBarInactiveTintColor: "#5e5e5e",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "700" },
        tabBarStyle: {
          height: 70,
          paddingBottom: 6,
          paddingTop: 6,
          backgroundColor: "#ffffff",
          borderTopColor: "#e5e5e5",
          borderTopWidth: 1,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="live-classes"
        options={{
          title: "Live Classes",
          tabBarIcon: ({ color }) => (
            <Ionicons name="radio-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="learning-hub"
        options={{
          title: "Learning Hub",
          tabBarIcon: ({ color }) => (
            <Ionicons name="school-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="placement"
        options={{
          title: "Placement",
          tabBarIcon: ({ color }) => (
            <Ionicons name="headset-outline" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
