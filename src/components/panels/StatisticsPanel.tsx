// src/components/panels/StatisticsPanel.tsx - Wrapper for EnhancedStatsPanel

import React, { FC } from 'react';
import EnhancedStatsPanel from '../EnhancedStatsPanel';

interface StatisticsPanelProps {}

const StatisticsPanel: FC<StatisticsPanelProps> = () => {
  return <EnhancedStatsPanel />;
};

export default StatisticsPanel;