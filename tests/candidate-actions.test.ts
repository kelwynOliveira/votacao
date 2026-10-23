import { describe, it, expect } from 'vitest';
import {
  getCandidates,
  createCandidate,
  updateCandidate,
  deleteCandidate,
} from '@/app/candidate-actions';
import { prisma } from '@/lib/prisma';

describe('Candidate Server Actions CRUD', () => {
  it('creates a candidate via object payload', async () => {
    const res = await createCandidate({ name: 'Alice Smith' });
    expect(res.success).toBe(true);
    expect(res.candidate?.name).toBe('Alice Smith');
    expect(res.candidate?.id).toBeDefined();

    const inDb = await prisma.candidate.findUnique({ where: { id: res.candidate!.id } });
    expect(inDb).not.toBeNull();
    expect(inDb?.name).toBe('Alice Smith');
  });

  it('creates a candidate via FormData', async () => {
    const formData = new FormData();
    formData.append('name', 'Bob Jones');

    const res = await createCandidate(formData);
    expect(res.success).toBe(true);
    expect(res.candidate?.name).toBe('Bob Jones');
  });

  it('fails to create a candidate with empty name', async () => {
    const res = await createCandidate({ name: '   ' });
    expect(res.success).toBe(false);
    expect(res.message).toBe('Nome do candidato é obrigatório');
  });

  it('lists all candidates ordered alphabetically from A to Z', async () => {
    await prisma.candidate.create({
      data: { name: 'Zeca', createdAt: new Date('2026-01-01') },
    });
    await prisma.candidate.create({
      data: { name: 'Ana', createdAt: new Date('2026-01-02') },
    });

    const list = await getCandidates();
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe('Ana');
    expect(list[1].name).toBe('Zeca');
  });

  it('updates an existing candidate name', async () => {
    const created = await prisma.candidate.create({
      data: { name: 'Charlie Initial' },
    });

    const res = await updateCandidate(created.id, 'Charlie Updated');
    expect(res.success).toBe(true);
    expect(res.candidate?.name).toBe('Charlie Updated');

    const inDb = await prisma.candidate.findUnique({ where: { id: created.id } });
    expect(inDb?.name).toBe('Charlie Updated');
  });

  it('fails to update candidate with empty name', async () => {
    const created = await prisma.candidate.create({
      data: { name: 'Charlie' },
    });

    const res = await updateCandidate(created.id, '   ');
    expect(res.success).toBe(false);
    expect(res.message).toBe('Nome do candidato é obrigatório');
  });

  it('returns failure when updating non-existent candidate', async () => {
    const res = await updateCandidate(999999, 'Ghost Candidate');
    expect(res.success).toBe(false);
    expect(res.message).toBe('Candidato não encontrado');
  });

  it('deletes an existing candidate', async () => {
    const created = await prisma.candidate.create({
      data: { name: 'To Delete' },
    });

    const res = await deleteCandidate(created.id);
    expect(res.success).toBe(true);

    const inDb = await prisma.candidate.findUnique({ where: { id: created.id } });
    expect(inDb).toBeNull();
  });

  it('returns failure when deleting non-existent candidate', async () => {
    const res = await deleteCandidate(999999);
    expect(res.success).toBe(false);
    expect(res.message).toBe('Candidato não encontrado');
  });
});
