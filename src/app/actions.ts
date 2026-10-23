'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { headers, cookies } from 'next/headers';

export async function createVoting(
  formData:
    | FormData
    | {
        title: string;
        candidateIds?: number[];
        candidateNames?: string[];
        options?: string[];
      }
) {
  let title = '';
  let optionsList: string[] = [];

  if (formData instanceof FormData) {
    title = (formData.get('title') as string)?.trim() || '';

    // 1. Check for candidateIds array from checkboxes
    const candidateIdStrings = formData.getAll('candidateIds') as string[];
    if (candidateIdStrings.length > 0) {
      const ids = candidateIdStrings
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));

      if (ids.length > 0) {
        const candidates = await prisma.candidate.findMany({
          where: { id: { in: ids } },
        });
        const candidateMap = new Map(candidates.map((c) => [c.id, c.name]));
        optionsList = ids
          .map((id) => candidateMap.get(id))
          .filter((name): name is string => typeof name === 'string' && name.trim().length > 0);
      }
    }

    // 2. Check for candidateNames array
    if (optionsList.length === 0) {
      const candidateNames = formData.getAll('candidateNames') as string[];
      if (candidateNames.length > 0) {
        optionsList = candidateNames
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
    }

    // 3. Fallback to legacy textarea newline-separated options
    if (optionsList.length === 0) {
      const optionsInput = formData.get('options') as string;
      if (optionsInput) {
        optionsList = optionsInput
          .split('\n')
          .map((opt) => opt.trim())
          .filter((opt) => opt.length > 0);
      }
    }
  } else {
    // Plain object payload
    title = formData.title?.trim() || '';
    if (formData.candidateIds && formData.candidateIds.length > 0) {
      const candidates = await prisma.candidate.findMany({
        where: { id: { in: formData.candidateIds } },
      });
      const candidateMap = new Map(candidates.map((c) => [c.id, c.name]));
      optionsList = formData.candidateIds
        .map((id) => candidateMap.get(id))
        .filter((name): name is string => typeof name === 'string' && name.trim().length > 0);
    } else if (formData.candidateNames && formData.candidateNames.length > 0) {
      optionsList = formData.candidateNames
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    } else if (formData.options && formData.options.length > 0) {
      optionsList = formData.options
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
  }

  if (!title) {
    return { success: false, message: 'Título da votação é obrigatório' };
  }

  if (optionsList.length < 2) {
    return { success: false, message: 'Selecione pelo menos dois candidatos para a votação' };
  }

  await prisma.voting.create({
    data: {
      title,
      options: {
        create: optionsList.map((label) => ({ label })),
      },
    },
  });

  revalidatePath('/admin');
  revalidatePath('/');
  return { success: true };
}

export async function toggleVotingStatus(votingId: string, isOpen: boolean) {
  await prisma.voting.update({
    where: { id: votingId },
    data: { isOpen },
  });
  revalidatePath('/admin');
  revalidatePath(`/vote/${votingId}`);
}

export async function submitVote(votingId: string, optionId: number, fingerprint: string) {
  // Check if voting is open
  const voting = await prisma.voting.findUnique({
    where: { id: votingId },
  });

  if (!voting || !voting.isOpen) {
    return { success: false, message: 'Voting is closed or not found' };
  }

  // Check if fingerprint already voted
  const existingVote = await prisma.voteLog.findFirst({
    where: {
      votingId,
      fingerprint,
    },
  });

  if (existingVote) {
    return { success: false, message: 'You have already voted' };
  }

  // Transaction to register vote
  await prisma.$transaction([
    prisma.voteLog.create({
      data: {
        fingerprint,
        voting: {
          connect: { id: votingId },
        },
      },
    }),
    prisma.option.update({
      where: { id: optionId },
      data: {
        votes: { increment: 1 },
      },
    }),
  ]);

  revalidatePath(`/vote/${votingId}`);
  return { success: true };
}

export async function getVotingDetails(votingId: string, fingerprint?: string) {
  const voting = await prisma.voting.findUnique({
    where: { id: votingId },
    include: {
      options: {
        orderBy: { id: 'asc' },
      },
    },
  });

  if (!voting) return null;

  // Only check for existing vote if fingerprint is provided (client-side)
  let hasVoted = false;
  if (fingerprint) {
    const userVote = await prisma.voteLog.findFirst({
      where: {
        votingId,
        fingerprint,
      },
    });
    hasVoted = !!userVote;
  }

  return {
    ...voting,
    hasVoted,
  };
}


export async function getVotings({ page = 1, limit = 5, status = 'all' }: { page?: number; limit?: number; status?: 'all' | 'open' | 'closed' } = {}) {
  const skip = (page - 1) * limit;
  
  const where = status === 'all' ? {} : { isOpen: status === 'open' };
  
  const [votings, total] = await Promise.all([
    prisma.voting.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        options: true,
        _count: {
          select: { voteLogs: true },
        },
      },
    }),
    prisma.voting.count({ where }),
  ]);

  return {
    votings,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  };
}

export async function deleteVoting(votingId: string) {
  await prisma.voting.delete({
    where: { id: votingId },
  });
  revalidatePath('/admin');
  revalidatePath('/');
}

export async function login(formData: FormData) {
  const password = formData.get('password') as string;
  const username = formData.get('username') as string;
  
  /*
  console.log('Login attempt:', { 
    receivedUser: username, 
    envUser: process.env.ADMIN_USER,
    matchUser: username === process.env.ADMIN_USER,
    matchPass: password === process.env.ADMIN_PASSWORD // intentionally not logging password
  });
  */

  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const cookieStore = await cookies();
    cookieStore.set('admin_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });
    return { success: true };
  }

  return { success: false, message: 'Invalid credentials' };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
  revalidatePath('/');
}

export async function getPublicVotings({ page = 1, limit = 5, status = 'all' }: { page?: number; limit?: number; status?: 'all' | 'open' | 'closed' } = {}) {
  const skip = (page - 1) * limit;
  
  const where = status === 'all' ? {} : { isOpen: status === 'open' };

  const [votings, total] = await Promise.all([
    prisma.voting.findMany({
      where,
      orderBy: [
        { isOpen: 'desc' }, // Active first
        { createdAt: 'desc' }, // Then newest
      ],
      take: limit,
      skip: skip,
      include: {
        _count: {
          select: { voteLogs: true },
        },
      },
    }),
    prisma.voting.count({ where }),
  ]);

  return {
    votings,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  };
}
