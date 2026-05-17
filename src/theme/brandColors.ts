/**
 * Traffic Eye — official police-tech / smart-city enforcement palette.
 * Use semantic tokens in UI; legacy BRAND_* names map here for gradual migration.
 */

/** Primary Blue #0057B8 */
export const PRIMARY_BLUE = '#0057B8';
/** Modern Accent Blue #0066CC */
export const ACCENT_BLUE = '#0066CC';
/** Traffic Gold / Yellow #F4B400 */
export const TRAFFIC_GOLD = '#F4B400';
/** Light Background Blue #EAF4FF */
export const BG_LIGHT_BLUE = '#EAF4FF';
/** Secondary Light Blue #DCEEFF */
export const BG_SECONDARY_BLUE = '#DCEEFF';
/** Dark Navy Text #0A1F44 */
export const NAVY_TEXT = '#0A1F44';
/** Alert Red #D32F2F */
export const ALERT_RED = '#D32F2F';
/** Success Green #2E7D32 */
export const SUCCESS_GREEN = '#2E7D32';
export const WHITE = '#FFFFFF';

/** Deeper primary for headers, pressed states */
export const PRIMARY_BLUE_DARK = '#004494';
export const PRIMARY_BLUE_DARKER = '#003A7A';

/** Text on primary (blue) surfaces */
export const ON_PRIMARY_SUBTLE = '#C8E4FF';
export const ON_PRIMARY_MUTED = '#A8D4FF';

/** Body text */
export const TEXT_PRIMARY = NAVY_TEXT;
export const TEXT_SECONDARY = '#1E3A5F';
export const TEXT_MUTED = '#4A6278';

/** Surfaces */
export const SURFACE_PANEL = WHITE;
export const SURFACE_PANEL_BORDER = BG_SECONDARY_BLUE;
export const SCRIM_OVER_WATERMARK = 'rgba(234, 244, 255, 0.94)';
export const BG_SUCCESS_TINT = '#E8F5E9';
export const BORDER_SUCCESS = '#81C784';

/** Violation semantics */
export const VIOLATION_HELMET = '#E65100';
export const VIOLATION_PHONE = TRAFFIC_GOLD;
export const VIOLATION_SEATBELT = ALERT_RED;
export const VIOLATION_SAFE = SUCCESS_GREEN;

/** Detection overlay strokes */
export const DETECT_CAR = '#0891B2';
export const DETECT_MOTORCYCLE = '#F97316';
export const DETECT_BUS = TRAFFIC_GOLD;
export const DETECT_TRUCK = '#EA580C';
export const DETECT_VIOLATION = ALERT_RED;
export const DETECT_SAFE = SUCCESS_GREEN;

// —— Legacy aliases (screens import these) ——
export const BRAND_HEADER_BG = PRIMARY_BLUE;
export const BRAND_HEADER_BG_DEEP = PRIMARY_BLUE_DARK;
export const BRAND_ACCENT = ACCENT_BLUE;
export const BRAND_ON_PRIMARY_SUBTLE = ON_PRIMARY_SUBTLE;
export const BRAND_ON_PRIMARY_MUTED = ON_PRIMARY_MUTED;
export const BRAND_TAB_ACTIVE = PRIMARY_BLUE;
export const BRAND_DRAWER_PRESS = BG_LIGHT_BLUE;
export const BRAND_TAB_BAR_BG = '#F5FAFF';
export const BRAND_TAB_BAR_BORDER = BG_SECONDARY_BLUE;
