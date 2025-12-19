/**
 * Spacing and sizing constants for consistent UI
 */

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
} as const;

export const borderRadius = {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
} as const;

export const fontSize = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 40,
} as const;

export const fontWeight = {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
};

export const lineHeight = {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
};

export const iconSize = {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
};

export type Spacing = typeof spacing;
