// src/components/panels/FilterPanel.tsx - Wrapper for EnhancedFilterPanel

import { FC } from 'react';
import EnhancedFilterPanel from '../EnhancedFilterPanel';

interface FilterPanelProps {}

const FilterPanel: FC<FilterPanelProps> = () => {
  return <EnhancedFilterPanel />;
};

export default FilterPanel;