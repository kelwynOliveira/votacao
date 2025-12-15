'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { headers, cookies } from 'next/headers';

export async function createVoting(formData: FormData) {
  const title = formData.get('title') as string;
  const optionsInput = formData.get('options') as string;

  if (!title || !optionsInput) {
    return { success: false, message: 'Título e opções são obrigatórios' };
  }

  const optionsList = optionsInput
    .split('\n')
    .map((opt) => opt.trim())
    .filter((opt) => opt.length > 0);

  if (optionsList.length < 2) {
    return { success: false, message: 'Pelo menos duas opções são necessárias' };
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

export async function submitVote(votingId: string, optionId: number) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || '127.0.0.1';
  
  // Clean IP (take first if multiple)
  const ipAddress = ip.split(',')[0].trim();

  // Check if voting is open
  const voting = await prisma.voting.findUnique({
    where: { id: votingId },
  });

  if (!voting || !voting.isOpen) {
    return { success: false, message: 'Voting is closed or not found' };
  }

  // Check if IP already voted
  const existingVote = await prisma.voteLog.findUnique({
    where: {
      votingId_ipAddress: {
        votingId,
        ipAddress,
      },
    },
  });

  if (existingVote) {
    return { success: false, message: 'You have already voted' };
  }

  // Transaction to register vote
  await prisma.$transaction([
    prisma.voteLog.create({
      data: {
        votingId,
        ipAddress,
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

export async function getVotingDetails(votingId: string) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || '127.0.0.1';
  const ipAddress = ip.split(',')[0].trim();

  const voting = await prisma.voting.findUnique({
    where: { id: votingId },
    include: {
      options: {
        orderBy: { id: 'asc' },
      },
    },
  });

  if (!voting) return null;

  const userVote = await prisma.voteLog.findUnique({
    where: {
      votingId_ipAddress: {
        votingId,
        ipAddress,
      },
    },
  });

  return {
    ...voting,
    hasVoted: !!userVote,
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
  
  console.log('Login attempt:', { 
    receivedUser: username, 
    envUser: process.env.ADMIN_USER,
    matchUser: username === process.env.ADMIN_USER,
    matchPass: password === process.env.ADMIN_PASSWORD // intentionally not logging password
  });

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
