/**
 * GRADUS Mobile App Color Theme
 * Matches the branding from the web application
 */

export const colors = {
    // Primary brand colors
    primary: '#3B82F6',      // Blue - main brand color
    primaryDark: '#2563EB',  // Darker blue for pressed states
    primaryLight: '#93C5FD', // Lighter blue for backgrounds

    // Secondary colors
    secondary: '#10B981',    // Green - success/accent
    secondaryDark: '#059669',
    secondaryLight: '#A7F3D0',

    // Neutral colors
    white: '#FFFFFF',
    black: '#000000',

    // Gray scale
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',

    // Semantic colors
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',

    // Background colors
    background: '#FFFFFF',
    backgroundSecondary: '#F9FAFB',

    // Text colors
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    textInverse: '#FFFFFF',

    // Border colors
    border: '#E5E7EB',
    borderFocused: '#3B82F6',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',
};

export const gradients = {
    primary: ['#3B82F6', '#2563EB'],
    secondary: ['#10B981', '#059669'],
    hero: ['#1E3A8A', '#3B82F6'],
};

export type Colors = typeof colors;
