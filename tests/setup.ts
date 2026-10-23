import { beforeAll, beforeEach, afterAll, vi } from 'vitest';

// Configure test environment variables BEFORE importing application code
process.env.DATABASE_URL = 'file:./test.db';
process.env.ADMIN_USER = 'admin';
process.env.ADMIN_PASSWORD = 'testpassword123';
(process.env as Record<string, string | undefined>).NODE_ENV = 'test';

export const mockCookieStore = {
  store: new Map<string, string>(),
  get: vi.fn((name: string) => {
    const val = mockCookieStore.store.get(name);
    return val !== undefined ? { name, value: val } : undefined;
  }),
  set: vi.fn((name: string, value: string, options?: any) => {
    mockCookieStore.store.set(name, value);
  }),
  delete: vi.fn((name: string) => {
    mockCookieStore.store.delete(name);
  }),
  has: vi.fn((name: string) => mockCookieStore.store.has(name)),
  clear: () => {
    mockCookieStore.store.clear();
  },
};

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookieStore),
  headers: vi.fn(async () => new Headers()),
}));

import { prisma } from '@/lib/prisma';

export async function cleanDatabase() {
  await prisma.voteLog.deleteMany({});
  await prisma.option.deleteMany({});
  await prisma.voting.deleteMany({});
  await prisma.candidate.deleteMany({});
}

beforeAll(async () => {
  await cleanDatabase();
});

beforeEach(async () => {
  mockCookieStore.clear();
  vi.clearAllMocks();
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});
