import { getCandidates } from '@/app/candidate-actions';
import CandidateManager from './candidate-manager';

export const dynamic = 'force-dynamic';

export default async function CandidatesPage() {
  const initialCandidates = await getCandidates();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Gerenciamento de Candidatos
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Cadastre, edite e remova candidatos cadastrados no sistema.
        </p>
      </div>

      <CandidateManager initialCandidates={initialCandidates} />
    </div>
  );
}
