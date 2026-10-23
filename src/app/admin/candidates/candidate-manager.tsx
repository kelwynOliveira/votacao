'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCandidate, updateCandidate, deleteCandidate } from '@/app/candidate-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Candidate {
  id: number;
  name: string;
  createdAt: Date | string;
}

function sortByName(list: Candidate[]): Candidate[] {
  return [...list].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  );
}

export default function CandidateManager({
  initialCandidates,
}: {
  initialCandidates: Candidate[];
}) {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>(() =>
    sortByName(initialCandidates)
  );
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editError, setEditError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  // Create handler
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');

    if (!newName.trim()) {
      setCreateError('Por favor, informe o nome do candidato.');
      return;
    }

    setIsCreating(true);
    try {
      const res = await createCandidate({ name: newName });
      if (!res.success || !res.candidate) {
        setCreateError(res.message || 'Erro ao criar candidato.');
      } else {
        setCandidates((prev) => sortByName([res.candidate!, ...prev]));
        setNewName('');
        startTransition(() => {
          router.refresh();
        });
      }
    } catch (err) {
      console.error(err);
      setCreateError('Falha ao cadastrar candidato.');
    } finally {
      setIsCreating(false);
    }
  }

  // Start inline editing
  function handleStartEdit(candidate: Candidate) {
    setEditingId(candidate.id);
    setEditingName(candidate.name);
    setEditError('');
  }

  // Cancel inline editing
  function handleCancelEdit() {
    setEditingId(null);
    setEditingName('');
    setEditError('');
  }

  // Save inline edit
  async function handleSaveEdit(id: number) {
    setEditError('');
    if (!editingName.trim()) {
      setEditError('O nome não pode ficar em branco.');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await updateCandidate(id, editingName);
      if (!res.success || !res.candidate) {
        setEditError(res.message || 'Erro ao atualizar candidato.');
      } else {
        setCandidates((prev) =>
          sortByName(
            prev.map((c) => (c.id === id ? { ...c, name: res.candidate!.name } : c))
          )
        );
        setEditingId(null);
        setEditingName('');
        startTransition(() => {
          router.refresh();
        });
      }
    } catch (err) {
      console.error(err);
      setEditError('Falha ao atualizar candidato.');
    } finally {
      setIsUpdating(false);
    }
  }

  // Delete handler
  async function handleDelete(id: number, name: string) {
    if (!confirm(`Tem certeza que deseja excluir o candidato "${name}"?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await deleteCandidate(id);
      if (!res.success) {
        alert(res.message || 'Erro ao excluir candidato.');
      } else {
        setCandidates((prev) => prev.filter((c) => c.id !== id));
        startTransition(() => {
          router.refresh();
        });
      }
    } catch (err) {
      console.error(err);
      alert('Falha ao excluir candidato.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Create Candidate Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800">
            Cadastrar Novo Candidato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            {createError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm font-medium">
                ⚠️ {createError}
              </div>
            )}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome completo do candidato"
                  className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={isCreating}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {isCreating ? 'Cadastrando...' : 'Adicionar Candidato'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Candidates List Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            Candidatos Cadastrados ({candidates.length})
          </h2>
        </div>

        {editError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm font-medium">
            ⚠️ {editError}
          </div>
        )}

        {candidates.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center text-gray-500">
            Nenhum candidato cadastrado ainda. Utilize o formulário acima para adicionar o primeiro.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-700">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                  <tr>
                    <th scope="col" className="px-6 py-3 w-16">
                      #
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Nome do Candidato
                    </th>
                    <th scope="col" className="px-6 py-3 w-48 hidden sm:table-cell">
                      Cadastrado em
                    </th>
                    <th scope="col" className="px-6 py-3 text-right w-44">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {candidates.map((candidate) => {
                    const isEditing = editingId === candidate.id;
                    const isDeleting = deletingId === candidate.id;

                    return (
                      <tr key={candidate.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-gray-400 text-xs">
                          {candidate.id}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="border rounded px-2 py-1 text-sm w-full focus:ring-2 focus:ring-blue-500 outline-none"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <span className="font-medium text-gray-900">{candidate.name}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-xs hidden sm:table-cell">
                          {new Date(candidate.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {isEditing ? (
                            <div className="flex justify-end items-center gap-2">
                              <button
                                onClick={() => handleSaveEdit(candidate.id)}
                                disabled={isUpdating}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs px-2.5 py-1.5 rounded font-medium disabled:opacity-50"
                              >
                                {isUpdating ? 'Salvando...' : 'Salvar'}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={isUpdating}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs px-2.5 py-1.5 rounded font-medium disabled:opacity-50"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end items-center gap-3">
                              <button
                                onClick={() => handleStartEdit(candidate)}
                                disabled={isDeleting}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline disabled:opacity-50"
                              >
                                Editar
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={() => handleDelete(candidate.id, candidate.name)}
                                disabled={isDeleting}
                                className="text-red-500 hover:text-red-700 text-sm font-medium hover:underline disabled:opacity-50"
                              >
                                {isDeleting ? 'Excluindo...' : 'Excluir'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
