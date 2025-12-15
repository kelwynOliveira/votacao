import { getVotingDetails } from '../../actions';
import VotingClient from './client';
import { notFound } from 'next/navigation';

interface Params {
  id: string;
}

export default async function VotePage(props: { params: Promise<Params> }) {
  const params = await props.params;
  const voting = await getVotingDetails(params.id);

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
