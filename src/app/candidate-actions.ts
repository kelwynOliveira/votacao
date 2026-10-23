'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getCandidates() {
  return prisma.candidate.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function createCandidate(data: { name: string } | FormData) {
  let name: string | undefined;

  if (data instanceof FormData) {
    name = (data.get('name') as string)?.trim();
  } else {
    name = data.name?.trim();
  }

  if (!name) {
    return { success: false, message: 'Nome do candidato é obrigatório' };
  }

  const candidate = await prisma.candidate.create({
    data: { name },
  });

  revalidatePath('/admin');
  return { success: true, candidate };
}

export async function updateCandidate(id: number, name: string) {
  const trimmed = name?.trim();
  if (!trimmed) {
    return { success: false, message: 'Nome do candidato é obrigatório' };
  }

  try {
    const candidate = await prisma.candidate.update({
      where: { id },
      data: { name: trimmed },
    });
    revalidatePath('/admin');
    return { success: true, candidate };
  } catch (error) {
    return { success: false, message: 'Candidato não encontrado' };
  }
}

export async function deleteCandidate(id: number) {
  try {
    await prisma.candidate.delete({
      where: { id },
    });
    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    return { success: false, message: 'Candidato não encontrado' };
  }
}
