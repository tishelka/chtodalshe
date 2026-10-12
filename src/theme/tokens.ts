export const colors = {
  background: "#F8F8F5",
  surface: "#FFFFFF",
  text: "#20251F",
  muted: "#72776E",
  primary: "#45673B",
  primaryDark: "#344F2D",
  primarySoft: "#E8EDDF",
  border: "#E5E7DF",
  lilac: "#ECE7F6",
  peach: "#F6E8D8",
  blue: "#E4EDF2",
  yellow: "#F3EDCF",
  danger: "#A33333",
  dangerSoft: "#FAEEEE",
  success: "#45673B",
} as const;
export const fonts = {
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  extraBold: "Manrope_800ExtraBold",
} as const;
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  xxl: 40,
} as const;
export const radii = { sm: 12, md: 20, lg: 28, pill: 999 } as const;
export const sizes = { touch: 48, button: 56, contentMax: 680 } as const;
