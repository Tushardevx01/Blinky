// SUTRA Design System Tokens
// Design Benchmark: Apple-level simplicity, Linear-level organisation
// Visual Identity: White-first, muted violet accent (#7653D6), lavender (#EDE7FC), deep charcoal (#24212D)

export const colors = {
  // Backgrounds
  background: '#FFFFFF', // Pure white primary canvas
  secondaryBackground: '#F7F6FA', // Soft off-white secondary canvas
  surface: '#FFFFFF', // Card and panel surface
  surfaceElevated: '#F7F6FA', // Elevated cards & subtle panels
  surfacePressed: '#EDE7FC', // Soft lavender active/pressed feedback

  // Borders
  border: '#E9E6EF', // Subtle grey-lavender border
  borderLight: '#F1EFF6', // Ultra-light internal divider

  // Typography
  textPrimary: '#24212D', // Deep charcoal
  textSecondary: '#6B6678', // Balanced neutral slate
  textMuted: '#9E9AA8', // Subtle caption grey
  textInverse: '#FFFFFF', // White text for primary buttons

  // Accents
  accent: '#7653D6', // Primary Muted Violet
  accentSecondary: '#EDE7FC', // Secondary Lavender
  accentMuted: 'rgba(118, 83, 214, 0.10)', // Subtle violet tint
  accentGlow: 'rgba(118, 83, 214, 0.25)', // Subtle violet glow

  // Status & Feedback
  success: '#10B981',
  successMuted: 'rgba(16, 185, 129, 0.12)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.12)',
  danger: '#EF4444',
  dangerMuted: 'rgba(239, 68, 68, 0.12)',

  // Basics
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#24212D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#24212D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#24212D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
};

export const typography = {
  heading1: { fontSize: 30, fontWeight: '700', letterSpacing: -0.6, color: colors.textPrimary },
  heading2: { fontSize: 22, fontWeight: '600', letterSpacing: -0.4, color: colors.textPrimary },
  heading3: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2, color: colors.textPrimary },
  bodyLarge: { fontSize: 16, fontWeight: '400', letterSpacing: -0.2, lineHeight: 22, color: colors.textPrimary },
  bodyMedium: { fontSize: 14, fontWeight: '400', letterSpacing: -0.1, lineHeight: 20, color: colors.textPrimary },
  bodySmall: { fontSize: 13, fontWeight: '500', letterSpacing: 0, color: colors.textSecondary },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', color: colors.textMuted },
} as const;
