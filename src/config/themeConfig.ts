/**
 * Ant Design Theme Configuration
 * Implements the design token system for consistent theming
 */
import type { ThemeConfig } from 'antd';
import type { RiskLevelType } from '@/types';

// Light Theme
export const lightTheme: ThemeConfig = {
  token: {
    // Primary colors - TII Brand Identity
    colorPrimary: '#003d82',                    // TII primary blue
    colorPrimaryBg: '#e6f4ff',                  // Light blue background
    colorPrimaryBgHover: '#bae0ff',             // Hover state
    colorPrimaryBorder: '#91caff',             // Border color
    colorPrimaryBorderHover: '#69b1ff',         // Border hover
    colorPrimaryHover: '#4096ff',               // Primary hover
    colorPrimaryActive: '#0958d9',              // Primary active
    colorPrimaryTextHover: '#4096ff',           // Text hover
    colorPrimaryText: '#003d82',                // Text color
    colorPrimaryTextActive: '#0958d9',          // Text active

    // Semantic colors for flood risk levels
    colorSuccess: '#52c41a',                    // Low risk / safe
    colorWarning: '#faad14',                    // Medium risk
    colorError: '#ff4d4f',                      // High risk / danger
    colorInfo: '#1677ff',                       // Information

    // Background colors
    colorBgContainer: '#ffffff',                // Container background
    colorBgLayout: '#f5f5f5',                   // Layout background
    colorBgElevated: '#ffffff',                 // Elevated elements
    colorBgSpotlight: 'rgba(0, 0, 0, 0.85)',   // Spotlight/modal backdrop

    // Text colors
    colorText: 'rgba(0, 0, 0, 0.88)',          // Primary text
    colorTextSecondary: 'rgba(0, 0, 0, 0.65)', // Secondary text
    colorTextTertiary: 'rgba(0, 0, 0, 0.45)',  // Tertiary text
    colorTextQuaternary: 'rgba(0, 0, 0, 0.25)', // Quaternary text

    // Border colors
    colorBorder: '#d9d9d9',                     // Default border
    colorBorderSecondary: '#f0f0f0',            // Secondary border

    // Layout dimensions
    borderRadius: 6,                            // Default border radius
    borderRadiusLG: 8,                          // Large border radius
    borderRadiusSM: 4,                          // Small border radius

    // Spacing
    marginXXS: 4,
    marginXS: 8,
    marginSM: 12,
    marginMD: 16,
    marginLG: 24,
    marginXL: 32,
    marginXXL: 48,

    // Font
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'`,
    fontSize: 14,
    fontSizeSM: 12,
    fontSizeLG: 16,
    fontSizeXL: 20,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,

    // Line height
    lineHeight: 1.5714285714285714,
    lineHeightLG: 1.5,
    lineHeightSM: 1.6666666666666667,

    // Motion
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
    motionEaseInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
    motionEaseOut: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
    motionEaseOutBack: 'cubic-bezier(0.18, 0.89, 0.32, 1.28)',
    motionEaseInBack: 'cubic-bezier(0.6, -0.3, 0.74, 0.05)',
    motionEaseInQuint: 'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
    motionEaseOutQuint: 'cubic-bezier(0.23, 1, 0.32, 1)',

    // Z-index
    zIndexBase: 0,
    zIndexPopupBase: 1000,

    // Screen breakpoints
    screenXS: 480,
    screenSM: 576,
    screenMD: 768,
    screenLG: 992,
    screenXL: 1200,
    screenXXL: 1600,

    // Box shadow
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
    boxShadowSecondary: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
  },
  
  components: {
    // Layout customizations
    Layout: {
      bodyBg: '#f5f5f5',
      headerBg: '#ffffff',
      headerHeight: 64,
      headerPadding: '0 24px',
      headerColor: 'rgba(0, 0, 0, 0.88)',
      siderBg: '#ffffff',
      triggerBg: '#002050',
      triggerColor: '#ffffff',
    },
    
    // Card customizations
    Card: {
      headerBg: '#fafafa',
    },
  },
};

// Dark Theme (New)
export const darkTheme: ThemeConfig = {
  token: {
    ...lightTheme.token,
    // Override colors for dark mode
    colorPrimary: '#1677ff',
    colorBgLayout: '#001529',
    colorBgContainer: '#001f3d',
    colorBgElevated: '#001f3d',
    colorText: 'rgba(255, 255, 255, 0.85)',
    colorTextSecondary: 'rgba(255, 255, 255, 0.65)',
    colorBorder: '#303030',
    colorBorderSecondary: '#1f1f1f',
  },
  components: {
    ...lightTheme.components,
    Layout: {
      ...lightTheme.components?.Layout,
      bodyBg: '#001529',
      headerBg: '#001f3d',
      headerColor: 'rgba(255, 255, 255, 0.85)',
      siderBg: '#001f3d',
    },
    Card: {
      ...lightTheme.components?.Card,
      headerBg: 'transparent',
    },
    Select: {
      optionSelectedBg: '#003d82',
    },
    Table: {
      headerBg: '#012a4a',
      rowHoverBg: '#012a4a',
    },
    Modal: {
      headerBg: '#001f3d',
      contentBg: '#001f3d',
      footerBg: '#001f3d',
    }
  },
};


// Semantic color mappings for flood risk levels
export const floodRiskColors: Record<Exclude<RiskLevelType, 'historic'>, string> = {
  none: '#52c41a',        // Green - No risk
  low: '#73d13d',         // Light green - Low risk
  medium: '#faad14',      // Orange - Medium risk
  high: '#fa8c16',        // Dark orange - High risk
  extreme: '#ff4d4f',     // Red - Extreme risk
};

// Chart color palette
export const chartColors: Record<string, string[]> = {
  primary: ['#003d82', '#1890ff', '#69c0ff', '#91d5ff', '#bae7ff'],
  success: ['#52c41a', '#73d13d', '#95de64', '#b7eb8f', '#d9f7be'],
  warning: ['#faad14', '#ffc53d', '#ffd666', '#ffe58f', '#fff1b8'],
  danger: ['#ff4d4f', '#ff7875', '#ffa39e', '#ffccc7', '#ffebe6'],
  neutral: ['#262626', '#595959', '#8c8c8c', '#bfbfbf', '#d9d9d9'],
};

// Export a function to get color by risk level
export const getRiskColor = (riskLevel: number): string => {
  const colorMap: Record<number, string> = {
    0: floodRiskColors.none,
    1: floodRiskColors.low,
    2: floodRiskColors.medium,
    3: floodRiskColors.high,
    4: floodRiskColors.extreme,
    5: floodRiskColors.extreme,
  };
  return colorMap[riskLevel] || floodRiskColors.none;
};

interface SeverityBadgeProps {
    color: string;
    text: string;
}

// Export a function to get severity badge props
export const getSeverityBadgeProps = (severity: string): SeverityBadgeProps => {
  const severityMap: Record<string, SeverityBadgeProps> = {
    low: { color: 'success', text: 'Low Risk' },
    medium: { color: 'warning', text: 'Medium Risk' },
    high: { color: 'error', text: 'High Risk' },
    extreme: { color: 'error', text: 'Extreme Risk' },
  };
  return severityMap[severity] || { color: 'default', text: 'Unknown' };
};
