import { describe, it, expect } from 'vitest';
import { GET as getCandidatesRoute, POST as postCandidateRoute } from '@/app/api/candidates/route';
import {
  GET as getSingleCandidateRoute,
  PUT as putCandidateRoute,
  PATCH as patchCandidateRoute,
  DELETE as deleteCandidateRoute,
} from '@/app/api/candidates/[id]/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

describe('Candidate REST API Routes', () => {
  it('POST /api/candidates creates a new candidate', async () => {
    const req = new NextRequest('http://localhost:3000/api/candidates', {
      method: 'POST',
      body: JSON.stringify({ name: 'Maria Silva' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await postCandidateRoute(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.name).toBe('Maria Silva');
    expect(body.id).toBeDefined();
  });

  it('POST /api/candidates rejects missing name with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/candidates', {
      method: 'POST',
      body: JSON.stringify({ name: '' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await postCandidateRoute(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('required');
  });

  it('GET /api/candidates returns all candidates', async () => {
    await prisma.candidate.create({ data: { name: 'Cand 1' } });
    await prisma.candidate.create({ data: { name: 'Cand 2' } });

    const res = await getCandidatesRoute();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
  });

  it('GET /api/candidates/[id] returns candidate or 404', async () => {
    const created = await prisma.candidate.create({ data: { name: 'Find Me' } });

    const req = new NextRequest(`http://localhost:3000/api/candidates/${created.id}`);
    const res = await getSingleCandidateRoute(req, {
      params: Promise.resolve({ id: String(created.id) }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Find Me');

    // Non-existent id
    const res404 = await getSingleCandidateRoute(req, {
      params: Promise.resolve({ id: '999999' }),
    });
    expect(res404.status).toBe(404);
  });

  it('PUT and PATCH /api/candidates/[id] updates candidate name', async () => {
    const created = await prisma.candidate.create({ data: { name: 'Original Name' } });

    // PUT
    const putReq = new NextRequest(`http://localhost:3000/api/candidates/${created.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: 'PUT Updated Name' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const putRes = await putCandidateRoute(putReq, {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(putRes.status).toBe(200);
    const putBody = await putRes.json();
    expect(putBody.name).toBe('PUT Updated Name');

    // PATCH
    const patchReq = new NextRequest(`http://localhost:3000/api/candidates/${created.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'PATCH Final Name' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const patchRes = await patchCandidateRoute(patchReq, {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(patchRes.status).toBe(200);
    const patchBody = await patchRes.json();
    expect(patchBody.name).toBe('PATCH Final Name');
  });

  it('DELETE /api/candidates/[id] deletes the candidate', async () => {
    const created = await prisma.candidate.create({ data: { name: 'To Be Removed' } });

    const req = new NextRequest(`http://localhost:3000/api/candidates/${created.id}`, {
      method: 'DELETE',
    });
    const res = await deleteCandidateRoute(req, {
      params: Promise.resolve({ id: String(created.id) }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const inDb = await prisma.candidate.findUnique({ where: { id: created.id } });
    expect(inDb).toBeNull();
  });
});
