import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { colors, fonts } from '@/constants/Theme';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={24} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarActiveBackgroundColor: colors.glassHighlight,
        headerShown: true,
        headerRight: () => (
          <Pressable
            onPress={() => router.push('/profile')}
            style={styles.profileButton}
          >
            <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
          </Pressable>
        ),
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: Platform.OS === 'ios' ? 18 : 12,
          height: 74,
          paddingBottom: 10,
          paddingTop: 8,
          borderRadius: 26,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          backgroundColor: 'transparent',
          overflow: 'hidden',
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.18,
          shadowRadius: 20,
          elevation: 10,
        },
        tabBarItemStyle: {
          marginHorizontal: 6,
          marginVertical: 6,
          borderRadius: 16,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          fontFamily: fonts.bodyMedium,
        },
        headerStyle: {
          backgroundColor: 'transparent',
        },
        headerTransparent: true,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '700',
          fontFamily: fonts.headingSemi,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            {Platform.OS === 'ios' ? (
              <BlurView
                intensity={85}
                tint="light"
                style={styles.tabBarBlur}
              />
            ) : (
              <View style={styles.tabBarFallback} />
            )}
            <LinearGradient
              colors={['rgba(255,255,255,0.72)', 'rgba(255,255,255,0.45)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          </View>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'home' : 'home-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="masterclasses"
        options={{
          title: 'Masterclasses',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'play-circle' : 'play-circle-outline'}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'calendar' : 'calendar-outline'}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Courses',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'book' : 'book-outline'} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBlur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.glass,
  },
  tabBarFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.glass,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.glassHighlight,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
});
