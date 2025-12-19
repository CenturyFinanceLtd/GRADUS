/**
 * Courses Stack Navigator
 * Handles My Courses, Course Home (LMS), and Lesson screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CoursesStackParamList } from './types';
import MyCoursesScreen from '../screens/courses/MyCoursesScreen';
import CourseHomeScreen from '../screens/courses/CourseHomeScreen';
import LessonDetailScreen from '../screens/courses/LessonDetailScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<CoursesStackParamList>();

const CoursesStack: React.FC = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: {
                    backgroundColor: colors.primary,
                },
                headerTintColor: colors.white,
                headerTitleStyle: {
                    fontWeight: '600',
                },
                contentStyle: { backgroundColor: colors.background },
            }}
        >
            <Stack.Screen
                name="MyCourses"
                component={MyCoursesScreen}
                options={{ title: 'My Courses' }}
            />
            <Stack.Screen
                name="CourseHome"
                component={CourseHomeScreen}
                options={{ title: 'Course' }}
            />
            <Stack.Screen
                name="LessonDetail"
                component={LessonDetailScreen}
                options={{ title: 'Lesson' }}
            />
        </Stack.Navigator>
    );
};

export default CoursesStack;
