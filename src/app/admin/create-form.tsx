'use client';

import { createVoting } from '../actions';
import { useState, useRef } from 'react';

export default function CreateVotingForm() {
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setError('');
    const result = await createVoting(formData);
    
    if (result && !result.success) {
      setError(result.message || 'Erro ao criar votação');
    } else {
      // Success - clear the form
      formRef.current?.reset();
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm font-medium">
          ⚠️ {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Título da votação</label>
        <input
          name="title"
          type="text"
          className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
          placeholder="e.g. Melhor Pitch - Reunião 15/12"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Opções (uma por linha)
        </label>
        <textarea
          name="options"
          className="w-full border rounded-md p-2 h-32 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
          placeholder="John Doe&#10;Jane Smith&#10;Acme Corp"
          required
        />
      </div>
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium"
      >
        Criar votação
      </button>
    </form>
  );
}
