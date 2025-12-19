/**
 * Navigation type definitions
 */

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// Auth stack screens
export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
};

// Main tab screens
export type MainTabParamList = {
    HomeTab: NavigatorScreenParams<HomeStackParamList>;
    CoursesTab: NavigatorScreenParams<CoursesStackParamList>;
    MoreTab: NavigatorScreenParams<MoreStackParamList>;
    ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

// Home stack screens
export type HomeStackParamList = {
    Home: undefined;
    CourseDetail: { courseId: string; slug?: string };
    BlogDetail: { blogId: string; slug?: string };
    EventDetail: { eventId: string; slug?: string };
};

// Courses stack screens
export type CoursesStackParamList = {
    MyCourses: undefined;
    CourseHome: { courseId: string; programme: string; course: string };
    LessonDetail: { courseId: string; lessonId: string };
};

// More stack screens
export type MoreStackParamList = {
    More: undefined;
    Blogs: undefined;
    BlogDetail: { blogId: string; slug?: string };
    Events: undefined;
    EventDetail: { eventId: string; slug?: string };
    Gallery: undefined;
    Jobs: undefined;
    About: undefined;
    Contact: undefined;
};

// Profile stack screens
export type ProfileStackParamList = {
    Profile: undefined;
    EditProfile: undefined;
    Support: undefined;
    SupportTicket: { ticketId: string };
    Settings: undefined;
};

// Root navigator
export type RootStackParamList = {
    Auth: NavigatorScreenParams<AuthStackParamList>;
    Main: NavigatorScreenParams<MainTabParamList>;
};

// Screen props types
export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
    NativeStackScreenProps<AuthStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
    CompositeScreenProps<
        BottomTabScreenProps<MainTabParamList, T>,
        NativeStackScreenProps<RootStackParamList>
    >;

export type HomeStackScreenProps<T extends keyof HomeStackParamList> =
    CompositeScreenProps<
        NativeStackScreenProps<HomeStackParamList, T>,
        BottomTabScreenProps<MainTabParamList>
    >;

export type CoursesStackScreenProps<T extends keyof CoursesStackParamList> =
    CompositeScreenProps<
        NativeStackScreenProps<CoursesStackParamList, T>,
        BottomTabScreenProps<MainTabParamList>
    >;

export type MoreStackScreenProps<T extends keyof MoreStackParamList> =
    CompositeScreenProps<
        NativeStackScreenProps<MoreStackParamList, T>,
        BottomTabScreenProps<MainTabParamList>
    >;

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> =
    CompositeScreenProps<
        NativeStackScreenProps<ProfileStackParamList, T>,
        BottomTabScreenProps<MainTabParamList>
    >;
