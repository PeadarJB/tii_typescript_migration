// src/styles/styled.ts - Unified styling system using Ant Design's CSS-in-JS

import { createStyles } from 'antd-style';
import type { CSSObject } from 'antd-style';

// Re-export theme tokens for easy access
// We export lightTheme as 'theme' to be used as a default or fallback.
export { lightTheme as theme } from '@/config/themeConfig';

// Common style mixins
export const mixins = {
  // Floating panel styles
  floatingPanel: (token: any): CSSObject => ({
    position: 'absolute',
    background: token.colorBgElevated,
    borderRadius: token.borderRadiusLG,
    boxShadow: token.boxShadowSecondary,
    transition: `all ${token.motionDurationMid} ${token.motionEaseInOut}`,
    '&:hover': {
      boxShadow: '0 6px 20px 0 rgba(0, 0, 0, 0.12), 0 4px 8px -4px rgba(0, 0, 0, 0.16), 0 12px 32px 8px rgba(0, 0, 0, 0.08)',
    },
  }),

  // Flex center
  flexCenter: (): CSSObject => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),

  // Text ellipsis
  textEllipsis: (): CSSObject => ({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),

  // Full size
  fullSize: (): CSSObject => ({
    width: '100%',
    height: '100%',
  }),

  // Hide on print
  noPrint: (): CSSObject => ({
    '@media print': {
      display: 'none !important',
    },
  }),
};

// Common component styles
export const useCommonStyles = createStyles(({ token, css }: { token: any; css: any }) => ({
  // Map container
  mapContainer: css`
    width: 100%;
    height: 100%;
    position: relative;
    outline: none;

    .esri-ui-corner {
      transition: all ${token.motionDurationMid} ${token.motionEaseInOut};
    }

    .esri-widget {
      font-family: ${token.fontFamily};
      border-radius: ${token.borderRadius}px;
      box-shadow: ${token.boxShadow};
    }

    .esri-popup {
      .esri-popup__header {
        background-color: ${token.colorBgLayout};
        border-bottom: 1px solid ${token.colorBorderSecondary};
      }

      .esri-popup__content {
        font-size: ${token.fontSize}px;
      }
    }
  `,

  // Loading container
  loadingContainer: css`
    ${mixins.flexCenter()}
    ${mixins.fullSize()}
    background: transparent;
    position: absolute;
    top: 0;
    left: 0;
    z-index: ${token.zIndexPopupBase};
  `,

  // Panel header with icon
  panelHeader: css`
    display: flex;
    align-items: center;
    gap: ${token.marginXS}px;

    .anticon {
      font-size: 16px;
    }
  `,

  // Stats card
  statsCard: css`
    &.ant-card {
      transition: all ${token.motionDurationMid} ${token.motionEaseInOut};
    }

    &.risk-low {
      background: #f6ffed;
      border-color: #b7eb8f;
    }

    &.risk-medium {
      background: #fffbe6;
      border-color: #ffe58f;
    }

    &.risk-high {
      background: #fff2e8;
      border-color: #ffbb96;
    }

    &.risk-extreme {
      background: #fff1f0;
      border-color: #ffccc7;
    }
  `,

  // Chart container
  chartContainer: css`
    position: relative;
    height: 100%;
    width: 100%;
    min-height: 300px;

    canvas {
      max-height: 100%;
      max-width: 100%;
    }
  `,

  // Filter section
  filterSection: css`
    .ant-collapse-header {
      padding: ${token.paddingSM}px ${token.padding}px !important;
    }

    .filter-badge {
      margin-left: ${token.marginXS}px;
    }
  `,

  // Error state
  errorContainer: css`
    ${mixins.flexCenter()}
    height: 100vh;
    background: ${token.colorBgLayout};

    .error-icon {
      font-size: 48px;
      color: ${token.colorError};
      margin-bottom: ${token.marginLG}px;
    }
  `,

  // Sider logo
  siderLogo: css`
    height: 64px;
    ${mixins.flexCenter()}
    border-bottom: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorWhite};
    color: ${token.colorWhite};
    font-weight: bold;
    font-size: 20px;
  `,
}));

// Panel-specific styles
export const usePanelStyles = createStyles(({ token, css }: { token: any; css: any }) => ({
  filterPanel: css`
    ${mixins.floatingPanel(token)}
    top: ${token.margin}px;
    right: ${token.margin}px;
    width: 360px;
    max-height: calc(100vh - 100px);
    display: flex;
    flex-direction: column;

    .ant-card-body {
      padding: ${token.paddingSM}px;
      overflow: auto;
      flex: 1;
    }
  `,

  statsPanel: css`
    ${mixins.floatingPanel(token)}
    bottom: ${token.margin}px;
    left: ${token.margin}px;
    width: 450px;

    .ant-card-body {
      padding: ${token.paddingSM}px 0 30px 0;
      position: relative;
    }

    .navigation-button {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 10;

      &.prev {
        left: ${token.marginXS}px;
      }

      &.next {
        right: ${token.marginXS}px;
      }
    }

    .slide-indicators {
      position: absolute;
      bottom: ${token.marginXS}px;
      left: 0;
      right: 0;
      text-align: center;
    }
  `,

  chartPanel: css`
    ${mixins.floatingPanel(token)}
    top: ${token.margin}px;
    right: ${token.margin}px;
    width: 480px;
    max-height: calc(100vh - 96px); /* Use max-height to prevent overflow */
    display: flex;
    flex-direction: column;

    .ant-card-body {
      padding: ${token.paddingSM}px;
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: auto; /* Allow scrolling if content is very large */
    }

    .chart-config {
      margin-bottom: ${token.marginSM}px;
    }

    .chart-area {
      flex-shrink: 0; /* Allow chart area to maintain its size */
      position: relative;
      min-height: 300px;
      ${mixins.flexCenter()}
    }
  `,

  swipePanel: css`
    ${mixins.floatingPanel(token)}
    bottom: ${token.margin}px;
    right: ${token.margin}px;
    width: 350px;

    .layer-select {
      margin-bottom: ${token.marginSM}px;
    }
  `,

  reportModal: css`
    .map-preview {
      text-align: center;
      margin: ${token.margin}px 0;

      img {
        max-width: 100%;
        border: 1px solid ${token.colorBorder};
        border-radius: ${token.borderRadius}px;
      }
    }

    .report-section {
      margin-bottom: ${token.marginLG}px;
    }

    .info-card {
      background-color: ${token.colorInfoBg};
      border-color: ${token.colorInfoBorder};
      margin-bottom: ${token.margin}px;
    }
  `,

  dataOverviewPage: css`
    padding: ${token.marginLG}px;
    max-width: 1400px;
    margin: 0 auto;
    background-color: ${token.colorBgContainer};
    min-height: 100vh;
    overflow-y: auto;
    
    .header-section {
      margin-bottom: ${token.marginXL}px;
      
      .page-title {
        display: flex;
        align-items: center;
        gap: ${token.marginSM}px;
        margin-bottom: ${token.margin}px;
        
        .icon {
          font-size: 32px;
          color: ${token.colorPrimary};
        }
        
        h2 {
          margin: 0;
        }
      }
      
      .intro-text {
        font-size: 15px;
        line-height: 1.8;
        color: ${token.colorTextSecondary};
      }
    }
    
    .data-section-card {
      margin-bottom: ${token.marginLG}px;
      box-shadow: ${token.boxShadowTertiary};
      
      .section-title {
        color: ${token.colorPrimary};
        margin-bottom: ${token.margin}px;
      }
      
      .section-description {
        color: ${token.colorTextSecondary};
        margin-bottom: ${token.margin}px;
      }
    }
    
    .data-table {
      .ant-table {
        font-size: 13px;
      }
      
      .ant-table-thead > tr > th {
        background-color: ${token.colorFillAlter};
        font-weight: 600;
      }
      
      code {
        font-size: 12px;
        padding: 2px 4px;
        background-color: ${token.colorFillTertiary};
        border-radius: ${token.borderRadiusSM}px;
      }
    }
    
    .data-type-tag {
      font-size: 11px;
    }
    
    .system-fields-container {
      display: flex;
      flex-wrap: wrap;
      gap: ${token.marginXS}px;
      
      .ant-tag {
        margin: 0;
      }
    }
  `,
}));



// Utility style functions
export const styleUtils = {
  // Get risk level color
  getRiskColor: (level: string, token: any): string => {
    const colorMap: Record<string, string> = {
      none: token.colorSuccess,
      low: '#73d13d',
      medium: token.colorWarning,
      high: '#fa8c16',
      extreme: token.colorError,
    };
    return colorMap[level.toLowerCase()] || token.colorTextSecondary;
  },

  // Get chart colors
  getChartColor: (index: number, opacity: number = 1): string => {
    const colors = [
      `rgba(0, 61, 130, ${opacity})`,    // TII Blue
      `rgba(250, 173, 20, ${opacity})`,  // Warning Orange
      `rgba(82, 196, 26, ${opacity})`,   // Success Green
      `rgba(255, 77, 79, ${opacity})`,   // Danger Red
      `rgba(24, 144, 255, ${opacity})`,  // Info Blue
      `rgba(114, 46, 209, ${opacity})`,  // Purple
      `rgba(250, 140, 22, ${opacity})`,  // Dark Orange
      `rgba(19, 194, 194, ${opacity})`   // Cyan
    ];
    return colors[index % colors.length];
  },

  // Responsive styles
  mobile: (styles: CSSObject): CSSObject => ({
    '@media (max-width: 768px)': styles,
  }),

  tablet: (styles: CSSObject): CSSObject => ({
    '@media (max-width: 992px)': styles,
  }),

  desktop: (styles: CSSObject): CSSObject => ({
    '@media (min-width: 993px)': styles,
  }),
};

// Type-safe style props builder
export const buildStyleProps = (
  className?: string,
  style?: React.CSSProperties
) => ({
  className,
  style,
});

// Export common style constants
export const PANEL_WIDTH = {
  filter: 360,
  stats: 450,
  chart: 480,
  swipe: 350,
} as const;

export const Z_INDEX = {
  panel: 10,
  modal: 1000,
  popover: 1050,
  tooltip: 1060,
} as const;