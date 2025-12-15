'use client';

import { getVotingDetails } from '../../actions';
import VotingClient from './client';
import { notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getBrowserFingerprint } from '@/lib/fingerprint';

interface Params {
  id: string;
}

export default function VotePage(props: { params: Promise<Params> }) {
  const [voting, setVoting] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVoting() {
      try {
        const params = await props.params;
        const fingerprint = getBrowserFingerprint();
        const votingData = await getVotingDetails(params.id, fingerprint);
        
        if (!votingData) {
          notFound();
        }
        
        setVoting(votingData);
      } catch (error) {
        console.error('Error loading voting:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadVoting();
  }, [props.params]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!voting) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full">
        <VotingClient voting={voting} />
      </div>
    </div>
  );
}

