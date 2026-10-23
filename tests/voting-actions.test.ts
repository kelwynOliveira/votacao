import { describe, it, expect } from 'vitest';
import {
  createVoting,
  toggleVotingStatus,
  submitVote,
  getVotingDetails,
  getVotings,
  getPublicVotings,
  deleteVoting,
} from '@/app/actions';
import { prisma } from '@/lib/prisma';

describe('Voting Server Actions', () => {
  describe('createVoting', () => {
    it('creates a voting with multiple options successfully', async () => {
      const formData = new FormData();
      formData.append('title', 'Qual seu framework favorito?');
      formData.append('options', 'Next.js\nRemix\nVite\n');

      const result = await createVoting(formData);

      expect(result.success).toBe(true);

      const created = await prisma.voting.findFirst({
        where: { title: 'Qual seu framework favorito?' },
        include: { options: true },
      });

      expect(created).not.toBeNull();
      expect(created?.isOpen).toBe(true);
      expect(created?.options).toHaveLength(3);
      expect(created?.options.map((o) => o.label)).toEqual(['Next.js', 'Remix', 'Vite']);
    });

    it('creates a voting with candidateIds array successfully', async () => {
      const c1 = await prisma.candidate.create({ data: { name: 'Candidato Alpha' } });
      const c2 = await prisma.candidate.create({ data: { name: 'Candidato Beta' } });
      const c3 = await prisma.candidate.create({ data: { name: 'Candidato Gamma' } });

      const formData = new FormData();
      formData.append('title', 'Eleição Oficial 2026');
      formData.append('candidateIds', c1.id.toString());
      formData.append('candidateIds', c3.id.toString());

      const result = await createVoting(formData);

      expect(result.success).toBe(true);

      const created = await prisma.voting.findFirst({
        where: { title: 'Eleição Oficial 2026' },
        include: { options: true },
      });

      expect(created).not.toBeNull();
      expect(created?.options).toHaveLength(2);
      expect(created?.options.map((o) => o.label)).toEqual(['Candidato Alpha', 'Candidato Gamma']);
    });

    it('fails if title is missing', async () => {
      const formData = new FormData();
      formData.append('title', '');
      formData.append('options', 'Opcao 1\nOpcao 2');

      const result = await createVoting(formData);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/obrigatório/i);
    });

    it('fails if options/candidates are missing', async () => {
      const formData = new FormData();
      formData.append('title', 'Votação sem opções');

      const result = await createVoting(formData);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/(obrigatório|candidatos)/i);
    });

    it('fails if fewer than 2 candidates are selected', async () => {
      const c1 = await prisma.candidate.create({ data: { name: 'Candidato Único' } });

      const formData = new FormData();
      formData.append('title', 'Votação com 1 candidato');
      formData.append('candidateIds', c1.id.toString());

      const result = await createVoting(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('pelo menos dois candidatos');
    });
  });

  describe('toggleVotingStatus', () => {
    it('toggles voting status between open and closed', async () => {
      const voting = await prisma.voting.create({
        data: {
          title: 'Status Test Poll',
          isOpen: true,
          options: {
            create: [{ label: 'Sim' }, { label: 'Não' }],
          },
        },
      });

      // Close voting
      await toggleVotingStatus(voting.id, false);
      let updated = await prisma.voting.findUnique({ where: { id: voting.id } });
      expect(updated?.isOpen).toBe(false);

      // Reopen voting
      await toggleVotingStatus(voting.id, true);
      updated = await prisma.voting.findUnique({ where: { id: voting.id } });
      expect(updated?.isOpen).toBe(true);
    });
  });

  describe('submitVote and Anti-Fraud Integrity', () => {
    it('successfully records a vote and increments option count', async () => {
      const voting = await prisma.voting.create({
        data: {
          title: 'Eleição 2026',
          isOpen: true,
          options: {
            create: [{ label: 'Candidato A' }, { label: 'Candidato B' }],
          },
        },
        include: { options: true },
      });

      const optionId = voting.options[0].id;
      const fingerprint = 'device-fingerprint-uuid-1';

      const result = await submitVote(voting.id, optionId, fingerprint);

      expect(result.success).toBe(true);

      // Check option vote counter
      const updatedOption = await prisma.option.findUnique({ where: { id: optionId } });
      expect(updatedOption?.votes).toBe(1);

      // Check voteLog entry
      const log = await prisma.voteLog.findUnique({
        where: {
          votingId_fingerprint: {
            votingId: voting.id,
            fingerprint,
          },
        },
      });
      expect(log).not.toBeNull();
    });

    it('prevents duplicate votes from the same fingerprint on the same voting', async () => {
      const voting = await prisma.voting.create({
        data: {
          title: 'Voto Único Test',
          isOpen: true,
          options: {
            create: [{ label: 'Opção 1' }, { label: 'Opção 2' }],
          },
        },
        include: { options: true },
      });

      const fingerprint = 'same-browser-fingerprint';

      // First vote - should succeed
      const firstVote = await submitVote(voting.id, voting.options[0].id, fingerprint);
      expect(firstVote.success).toBe(true);

      // Second vote from same device on same poll - should fail
      const secondVote = await submitVote(voting.id, voting.options[1].id, fingerprint);
      expect(secondVote.success).toBe(false);
      expect(secondVote.message).toBe('You have already voted');

      // Verify that option 2 was not incremented
      const opt2 = await prisma.option.findUnique({ where: { id: voting.options[1].id } });
      expect(opt2?.votes).toBe(0);

      // Total vote logs for this voting must remain 1
      const count = await prisma.voteLog.count({ where: { votingId: voting.id } });
      expect(count).toBe(1);
    });

    it('allows a different fingerprint to vote on the same poll', async () => {
      const voting = await prisma.voting.create({
        data: {
          title: 'Multi-device Poll',
          isOpen: true,
          options: {
            create: [{ label: 'Opção 1' }, { label: 'Opção 2' }],
          },
        },
        include: { options: true },
      });

      const vote1 = await submitVote(voting.id, voting.options[0].id, 'device-user-1');
      const vote2 = await submitVote(voting.id, voting.options[1].id, 'device-user-2');

      expect(vote1.success).toBe(true);
      expect(vote2.success).toBe(true);

      const logs = await prisma.voteLog.count({ where: { votingId: voting.id } });
      expect(logs).toBe(2);
    });

    it('allows the same fingerprint to vote on a different poll', async () => {
      const voting1 = await prisma.voting.create({
        data: {
          title: 'Poll 1',
          options: { create: [{ label: 'A' }, { label: 'B' }] },
        },
        include: { options: true },
      });

      const voting2 = await prisma.voting.create({
        data: {
          title: 'Poll 2',
          options: { create: [{ label: 'X' }, { label: 'Y' }] },
        },
        include: { options: true },
      });

      const fingerprint = 'shared-device-fingerprint';

      const res1 = await submitVote(voting1.id, voting1.options[0].id, fingerprint);
      const res2 = await submitVote(voting2.id, voting2.options[0].id, fingerprint);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
    });

    it('rejects voting when the poll is closed', async () => {
      const voting = await prisma.voting.create({
        data: {
          title: 'Poll Encerrada',
          isOpen: false,
          options: {
            create: [{ label: 'Opção A' }, { label: 'Opção B' }],
          },
        },
        include: { options: true },
      });

      const result = await submitVote(voting.id, voting.options[0].id, 'device-abc');
      expect(result.success).toBe(false);
      expect(result.message).toContain('closed');
    });

    it('rejects voting on a non-existent voting id', async () => {
      const result = await submitVote('non-existent-uuid', 99999, 'device-abc');
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('getVotingDetails', () => {
    it('returns null if voting is not found', async () => {
      const details = await getVotingDetails('invalid-id');
      expect(details).toBeNull();
    });

    it('returns voting with hasVoted=false when user has not voted', async () => {
      const voting = await prisma.voting.create({
        data: {
          title: 'Has Voted Check',
          options: { create: [{ label: 'Op1' }, { label: 'Op2' }] },
        },
        include: { options: true },
      });

      const details = await getVotingDetails(voting.id, 'fingerprint-not-voted');
      expect(details).not.toBeNull();
      expect(details?.title).toBe('Has Voted Check');
      expect(details?.hasVoted).toBe(false);
      expect(details?.options).toHaveLength(2);
    });

    it('returns hasVoted=true when user has voted', async () => {
      const voting = await prisma.voting.create({
        data: {
          title: 'Has Voted True Check',
          options: { create: [{ label: 'Op1' }, { label: 'Op2' }] },
        },
        include: { options: true },
      });

      const fingerprint = 'fingerprint-voted-device';
      await submitVote(voting.id, voting.options[0].id, fingerprint);

      const details = await getVotingDetails(voting.id, fingerprint);
      expect(details?.hasVoted).toBe(true);
    });
  });

  describe('getVotings and getPublicVotings', () => {
    it('correctly filters and paginates votings', async () => {
      // Create 3 open and 2 closed votings
      for (let i = 1; i <= 3; i++) {
        await prisma.voting.create({
          data: {
            title: `Open Poll ${i}`,
            isOpen: true,
            options: { create: [{ label: '1' }, { label: '2' }] },
          },
        });
      }

      for (let i = 1; i <= 2; i++) {
        await prisma.voting.create({
          data: {
            title: `Closed Poll ${i}`,
            isOpen: false,
            options: { create: [{ label: '1' }, { label: '2' }] },
          },
        });
      }

      // Check all
      const all = await getVotings({ status: 'all', limit: 10 });
      expect(all.votings).toHaveLength(5);
      expect(all.totalPages).toBe(1);

      // Check open only
      const openOnly = await getVotings({ status: 'open', limit: 10 });
      expect(openOnly.votings).toHaveLength(3);
      expect(openOnly.votings.every((v) => v.isOpen)).toBe(true);

      // Check closed only
      const closedOnly = await getVotings({ status: 'closed', limit: 10 });
      expect(closedOnly.votings).toHaveLength(2);
      expect(closedOnly.votings.every((v) => !v.isOpen)).toBe(true);

      // Check pagination (limit 2 per page)
      const page1 = await getVotings({ status: 'all', limit: 2, page: 1 });
      expect(page1.votings).toHaveLength(2);
      expect(page1.totalPages).toBe(3);
      expect(page1.currentPage).toBe(1);

      const page3 = await getVotings({ status: 'all', limit: 2, page: 3 });
      expect(page3.votings).toHaveLength(1);
    });

    it('getPublicVotings orders active votings before closed votings', async () => {
      const closed = await prisma.voting.create({
        data: {
          title: 'Older Closed',
          isOpen: false,
          createdAt: new Date('2026-01-01'),
          options: { create: [{ label: 'A' }, { label: 'B' }] },
        },
      });

      const open = await prisma.voting.create({
        data: {
          title: 'Open Poll',
          isOpen: true,
          createdAt: new Date('2026-01-02'),
          options: { create: [{ label: 'A' }, { label: 'B' }] },
        },
      });

      const publicList = await getPublicVotings({ limit: 10 });
      expect(publicList.votings[0].id).toBe(open.id);
      expect(publicList.votings[0].isOpen).toBe(true);
    });
  });

  describe('deleteVoting', () => {
    it('deletes voting and cascades deletion of options and voteLogs', async () => {
      const voting = await prisma.voting.create({
        data: {
          title: 'To Be Deleted',
          options: { create: [{ label: 'Del 1' }, { label: 'Del 2' }] },
        },
        include: { options: true },
      });

      await submitVote(voting.id, voting.options[0].id, 'fingerprint-del');

      // Delete the voting
      await deleteVoting(voting.id);

      // Verify voting is gone
      const foundVoting = await prisma.voting.findUnique({ where: { id: voting.id } });
      expect(foundVoting).toBeNull();

      // Verify options are cascade deleted
      const remainingOptions = await prisma.option.findMany({ where: { votingId: voting.id } });
      expect(remainingOptions).toHaveLength(0);

      // Verify voteLogs are cascade deleted
      const remainingLogs = await prisma.voteLog.findMany({ where: { votingId: voting.id } });
      expect(remainingLogs).toHaveLength(0);
    });
  });
});
