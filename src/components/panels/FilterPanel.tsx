// src/components/panels/FilterPanel.tsx - Wrapper for EnhancedFilterPanel

import React, { FC } from 'react';
import EnhancedFilterPanel from '../EnhancedFilterPanel';

interface FilterPanelProps {}

const FilterPanel: FC<FilterPanelProps> = () => {
  return <EnhancedFilterPanel />;
};

export default FilterPanel;