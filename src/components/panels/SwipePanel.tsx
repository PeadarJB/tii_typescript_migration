// src/components/panels/SwipePanel.tsx - Wrapper for SimpleSwipePanel

import React, { FC } from 'react';
import SimpleSwipePanel from '../SimpleSwipePanel';

interface SwipePanelProps {
  onClose?: () => void;
}

const SwipePanel: FC<SwipePanelProps> = ({ onClose }) => {
  // SimpleSwipePanel manages its own close behavior through the store
  return <SimpleSwipePanel />;
};

export default SwipePanel;