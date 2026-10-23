'use client';

import { createVoting } from '../actions';
import { useState, useRef } from 'react';
import Link from 'next/link';

interface Candidate {
  id: number;
  name: string;
}

export default function CreateVotingForm({
  candidates = [],
}: {
  candidates?: Candidate[];
}) {
  const sortedCandidates = [...candidates].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  );

  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleToggle(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    if (error) setError('');
  }

  function handleSelectAll() {
    setSelectedIds(candidates.map((c) => c.id));
    if (error) setError('');
  }

  function handleClearAll() {
    setSelectedIds([]);
  }

  async function handleSubmit(formData: FormData) {
    setError('');

    const title = (formData.get('title') as string)?.trim();
    if (!title) {
      setError('Por favor, informe o título da votação.');
      return;
    }

    if (selectedIds.length < 2) {
      setError('Selecione pelo menos dois candidatos para criar a votação.');
      return;
    }

    // Ensure all selectedIds are present in the FormData
    formData.delete('candidateIds');
    selectedIds.forEach((id) => {
      formData.append('candidateIds', id.toString());
    });

    setIsSubmitting(true);
    try {
      const result = await createVoting(formData);

      if (result && !result.success) {
        setError(result.message || 'Erro ao criar votação');
      } else {
        // Success - clear the form and selection
        formRef.current?.reset();
        setSelectedIds([]);
      }
    } catch (err) {
      console.error(err);
      setError('Falha ao criar votação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Título da votação
        </label>
        <input
          name="title"
          type="text"
          className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
          placeholder="Ex: Melhor Pitch - 23/10/2026"
          required
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
          <label className="block text-sm font-medium text-gray-700">
            Candidatos participantes (selecione pelo menos 2)
          </label>
          {candidates.length > 0 && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-500 font-medium">
                {selectedIds.length} de {candidates.length} selecionado(s)
              </span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-blue-600 hover:text-blue-800 underline font-medium"
              >
                Selecionar todos
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-gray-500 hover:text-gray-700 underline"
              >
                Limpar
              </button>
            </div>
          )}
        </div>

        {candidates.length === 0 ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <p className="font-medium">Nenhum candidato cadastrado ainda.</p>
            <p className="mt-1">
              Para criar uma votação, você precisa cadastrar pelo menos 2 candidatos primeiro.{' '}
              <Link
                href="/admin/candidates"
                className="font-semibold underline text-blue-700 hover:text-blue-900"
              >
                Cadastrar candidatos agora →
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto p-1 border rounded-lg bg-gray-50">
            {sortedCandidates.map((candidate) => {
              const isSelected = selectedIds.includes(candidate.id);

              return (
                <label
                  key={candidate.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-white shadow-sm ring-1 ring-blue-500'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggle(candidate.id)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {candidate.name}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || candidates.length < 2}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium disabled:opacity-50 transition-colors"
      >
        {isSubmitting
          ? 'Criando votação...'
          : selectedIds.length > 0
          ? `Criar votação (${selectedIds.length} candidatos)`
          : 'Criar votação'}
      </button>
    </form>
  );
}
