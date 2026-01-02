import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { ContractorChatbot } from '../components/ai/ContractorChatbot';
import { ContractorMode } from '../lib/ai/contractor-config';

const validModes: ContractorMode[] = ['estimating', 'projects', 'crm', 'finance', 'general'];

const AITeamHub: React.FC = () => {
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get('mode');
  const initialMode: ContractorMode = modeParam && validModes.includes(modeParam as ContractorMode)
    ? (modeParam as ContractorMode)
    : 'general';

  return (
    <div className="h-full w-full overflow-hidden bg-[#0F0F0F]">
      <ContractorChatbot initialMode={initialMode} />
    </div>
  );
};

export default AITeamHub;
