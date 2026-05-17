import React from 'react';
import { useApp } from '../context/AppContext';
import { AllChallansScreen } from '../screens/AllChallansScreen';
import { CandidateQueueScreen } from '../screens/CandidateQueueScreen';

/** Bottom tab: candidate queue (officer) or all challans (admin). */
export function QueueTabScreen() {
  const { user } = useApp();
  if (user?.role === 'admin') {
    return <AllChallansScreen />;
  }
  return <CandidateQueueScreen />;
}
