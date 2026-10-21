// Material Design 3 – Theme tokens (light mode) for Achados e Perdidos
// Identity purple kept as primary color.
export const theme = {
  // ---- Colors ----
  colors: {
    // Primary (purple 500) – used for UI accent, buttons, highlights
    primary: '#6750A4',
    onPrimary: '#FFFFFF',
    // Secondary (amber) – for secondary actions or informational tags
    secondary: '#FFB300',
    onSecondary: '#000000',
    // Surface – background of cards, sheets, dialogs
    surface: '#FFFFFF',
    onSurface: '#1C1B1F',
    // Background – overall app background
    background: '#FDFDFD',
    onBackground: '#1C1B1F',
    // Error – used for validation messages
    error: '#B3261E',
    onError: '#FFFFFF',
    // Status colors (optional, can be reused for badges)
    success: '#388E3C',
    warning: '#F9AA33',
  },
  // ---- Typography ----
  // Font sizes are expressed in dp (density‑independent pixels) as per Material 3.
  typography: {
    displayLarge: { fontSize: 32, fontWeight: '400', lineHeight: 40 },
    headlineMedium: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
    titleLarge: { fontSize: 22, fontWeight: '500', lineHeight: 28 },
    bodyLarge: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
    labelMedium: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  },
  // ---- Spacing ----
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  // ---- Shape (border radius) ----
  shape: {
    // Small – chips, small buttons
    small: 4,
    // Medium – cards, larger buttons
    medium: 8,
    // Large – modal sheets, floating action button
    large: 12,
  },
  // ---- Elevation (shadow depth) ----
  elevation: {
    none: 0,
    low: 1,
    medium: 4,
    high: 8,
  },
};
