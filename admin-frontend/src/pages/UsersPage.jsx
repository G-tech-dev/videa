import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { adminApi } from '../api/adminApi'
import { useAdmin } from '../context/AdminContext'
import Pagination from '../components/Pagination'

const money = (value) => `RWF ${Number(value || 0).toLocaleString('en-RW')}`
const date = (value) => new Date(value).toLocaleDateString('en-RW', { dateStyle: 'medium' })

export default function UsersPage() {
  const { session } = useAdmin()
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [notice, setNotice] = useState('')
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState('')

  const load = async () => {
    try { const result = await adminApi.users({ search, status, page }, session.token); setUsers(result.users); setPagination(result.pagination) } catch (error) { setNotice(error.message) }
  }
  useEffect(() => { setPage(1) }, [status])
  useEffect(() => { load() }, [status, page])

  const updateUser = async (id, data) => {
    setBusy(id)
    try { await adminApi.updateUser(id, data, session.token); setNotice('User updated.'); await load() } catch (error) { setNotice(error.message) } finally { setBusy('') }
  }

  return <><PageHeader eyebrow="Control room / accounts" title="User management" description="Search accounts, change roles, and control access." onRefresh={load} />{notice && <div className="notice">{notice}<button onClick={() => setNotice('')}>Dismiss</button></div>}<section className="panel page-panel"><div className="panel-heading user-filters"><div><span className="eyebrow">Account directory</span><h2>{pagination?.total ?? users.length} users</h2></div><div className="filter-controls"><input aria-label="Search users" placeholder="Search name or email" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && (setPage(1), load())} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All accounts</option><option value="active">Active</option><option value="inactive">Inactive</option></select><button className="refresh" onClick={() => { setPage(1); load() }}>Search</button></div></div>{users.length === 0 ? <div className="empty">No users found.</div> : <div className="user-table"><div className="user-table-head"><span>Account</span><span>Role</span><span>Access</span><span>Joined</span></div>{users.map((user) => <article className="user-row" key={user._id}><div><strong>{user.username}</strong></div><select value={user.role} disabled={busy === user._id} onChange={(event) => updateUser(user._id, { role: event.target.value })}><option value="viewer">Viewer</option><option value="creator">Creator</option><option value="both">Both</option><option value="admin">Admin</option></select><small>{date(user.createdAt)}</small><button className={user.isActive ? 'access-active' : 'access-inactive'} disabled={busy === user._id || user._id === session.user.id} onClick={() => updateUser(user._id, { isActive: !user.isActive })}>{user.isActive ? 'Active' : 'Inactive'}</button></article>)}</div>}<Pagination pagination={pagination} onChange={setPage} /></section></>
}