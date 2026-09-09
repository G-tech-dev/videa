const API_URL = import.meta.env.API_URL || import.meta.env.VITE_API_URL || 'https://videa-api.onrender.com/api'

export async function request(path, options = {}, token) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Request failed')
  return data
}

export const adminApi = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  overview: (token) => request('/admin/overview', {}, token),
  transactions: (status, page, token) => request(`/admin/transactions?status=${status}&page=${page}`, {}, token),
  reviewTransaction: (id, status, token) => request(`/admin/transactions/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
  videos: (status, page, token) => request(`/admin/videos?status=${status}&page=${page}`, {}, token),
  reviewVideo: (id, status, token) => request(`/admin/videos/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
  resetVideoViews: (id, token) => request(`/admin/videos/${id}/reset-views`, { method: 'PATCH' }, token),
  viewAudit: (page, token) => request(`/admin/view-audit?page=${page}`, {}, token),
  suspiciousSessions: (page, token) => request(`/admin/watch-sessions/suspicious?page=${page}`, {}, token),
  auditLog: (page, token) => request(`/admin/audit-log?page=${page}`, {}, token),
  updatePlatformWallet: (data, token) => request('/admin/platform-wallet', { method: 'PUT', body: JSON.stringify(data) }, token),
  users: (params, token) => request(`/admin/users?${new URLSearchParams(params)}`, {}, token),
  updateUser: (id, data, token) => request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
}
