'use client';

import { submitVote } from '../../actions';
import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Option {
  id: number;
  label: string;
  votes: number;
}

interface Voting {
  id: string;
  title: string;
  isOpen: boolean;
  hasVoted: boolean;
  options: Option[];
}

export default function VotingClient({ voting }: { voting: Voting }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticVoted, setOptimisticVoted] = useState(false);

  // Polling for results
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    // Only poll if the voting is closed OR if the user has voted
    // This allows them to see live updates of the results
    if (!voting.isOpen || voting.hasVoted || optimisticVoted) {
      interval = setInterval(() => {
        startTransition(() => {
          router.refresh();
        });
      }, 5000);
    }

    return () => clearInterval(interval);
  }, [voting.isOpen, voting.hasVoted, optimisticVoted, router]);

  async function handleVote(optionId: number) {
    if (isPending) return;

    setOptimisticVoted(true); // Immediate UI feedback
    
    try {
      const res = await submitVote(voting.id, optionId);
      if (!res.success) {
        alert(res.message);
        setOptimisticVoted(false); // Revert if failed
      } else {
        // Success handled by router.refresh in action + re-render with hasVoted=true
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      setOptimisticVoted(false);
      alert('Failed to submit vote');
    }
  }

  // Show Results View
  if (!voting.isOpen || voting.hasVoted || optimisticVoted) {
    const totalVotes = voting.options.reduce((acc, opt) => acc + opt.votes, 0);
    
    // Find leader(s)
    const maxVotes = Math.max(...voting.options.map(o => o.votes), 0);
    
    return (
      <div className="max-w-xl mx-auto bg-white p-8 rounded-lg shadow-md border border-gray-200">
        <h1 className="text-2xl font-bold mb-2 text-center text-gray-800">{voting.title}</h1>
        <div className={`text-center mb-6 font-medium ${voting.isOpen ? 'text-green-600' : 'text-red-500'}`}>
           {voting.isOpen ? 'Votação Aberta' : 'Votação Encerrada'}
        </div>

        {(voting.hasVoted || optimisticVoted) && (
             <div className="mb-6 bg-blue-50 text-blue-700 p-3 rounded text-center text-sm">
                Seu voto já foi registrado. Confira abaixo o andamento da votação.
             </div>
        )}

        <div className="space-y-4">
            {[...voting.options].sort((a, b) => b.votes - a.votes).map((option) => {
                const percentage = totalVotes > 0 ? ((option.votes / totalVotes) * 100).toFixed(1) : '0';
                const isLeader = totalVotes > 0 && option.votes === maxVotes;
                
                return (
                    <div key={option.id} className="relative">
                        <div className="flex justify-between items-center mb-1">
                            <span className={`w-1/2 font-medium ${isLeader ? 'text-blue-700 font-bold' : 'text-gray-700'}`}>
                                {option.label} {isLeader && '👑'}
                            </span>
                            <span className="text-sm text-gray-500">{option.votes} votos ({percentage}%)</span>
                        </div>
                        <div className="hidden md:block md:w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                            <div 
                                className={`h-4 rounded-full transition-all duration-500 ${isLeader ? 'bg-blue-600' : 'bg-gray-400'}`}
                                style={{ width: `${percentage}%` }}
                            ></div>
                        </div>
                    </div>
                );
            })}
        </div>

        <div className="mt-8 text-center text-sm text-gray-400">
           Atualizando resultados em tempo real...
        </div>
      </div>
    )
  }

  // Vote View
  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-lg shadow-md border border-gray-200">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">{voting.title}</h1>
      
      <p className="text-gray-600 text-center mb-8">
        Faça a sua escolha abaixo. Você só pode votar uma vez.
      </p>

      <div className="space-y-3">
        {voting.options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleVote(option.id)}
            disabled={isPending}
            className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
          >
            <span className="font-medium group-hover:text-blue-700">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
