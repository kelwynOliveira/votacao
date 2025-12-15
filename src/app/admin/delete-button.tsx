'use client';

import { deleteVoting } from '../actions';
import { useTransition } from 'react';

export default function DeleteVotingButton({ votingId }: { votingId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (confirm('Tem certeza que deseja excluir esta votação? Esta ação não pode ser desfeita.')) {
      startTransition(async () => {
        await deleteVoting(votingId);
      });
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className={`text-sm text-red-600 hover:text-red-900 underline ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isPending ? 'Excluindo...' : 'Excluir'}
    </button>
  );
}
