// lib/ideas.js — Product Lab API client (owner-only endpoints)
import api from './api';

const BASE = '/api/admin/ideas';

export async function listIdeas() {
  const { data } = await api.get(BASE);
  return Array.isArray(data?.ideas) ? data.ideas : [];
}

export async function createIdea(fields) {
  const { data } = await api.post(BASE, fields);
  return data?.idea;
}

export async function updateIdea(id, fields) {
  const { data } = await api.patch(`${BASE}/${id}`, fields);
  return data?.idea;
}

export async function deleteIdea(id) {
  await api.delete(`${BASE}/${id}`);
}

export async function bulkImport(ideas) {
  const { data } = await api.post(`${BASE}/bulk`, { ideas });
  return Array.isArray(data?.ideas) ? data.ideas : [];
}
