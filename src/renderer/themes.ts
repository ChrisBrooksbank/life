/** Visual theme identifier. */
export type Theme = 'dark' | 'light'

/** RGBA color tuple matching RendererOptions color fields. */
export type RgbaColor = [number, number, number, number]

/** Colors used by both the WebGL renderer and the CSS layer. */
export interface ThemeColors {
  /** Cell fill color. */
  cellColor: RgbaColor
  /** Canvas background color. */
  backgroundColor: RgbaColor
  /** Grid line color. */
  gridColor: RgbaColor
}

export const DARK_THEME_COLORS: ThemeColors = {
  cellColor: [1, 1, 1, 1],
  backgroundColor: [0, 0, 0, 1],
  gridColor: [0.3, 0.3, 0.3, 1],
}

export const LIGHT_THEME_COLORS: ThemeColors = {
  cellColor: [0.1, 0.1, 0.1, 1],
  backgroundColor: [1, 1, 1, 1],
  gridColor: [0.75, 0.75, 0.75, 1],
}

export const THEME_COLORS: Record<Theme, ThemeColors> = {
  dark: DARK_THEME_COLORS,
  light: LIGHT_THEME_COLORS,
}
