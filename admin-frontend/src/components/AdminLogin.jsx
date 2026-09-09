import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../api/adminApi'
import { useAdmin } from '../context/AdminContext'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { login } = useAdmin()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError('')
    try {
      const data = await adminApi.login(form)
      if (data.user.role !== 'admin') throw new Error('This account does not have administrator access')
      login(data.token, data.user); navigate('/admin')
    } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
  }

  return <main className="login-shell"><div className="login-panel"><span className="eyebrow">Videa operations</span><h1>Admin sign in</h1><p>Review payments and moderate the platform.</p><form onSubmit={submit}><label>Email<input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Password<input type="password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>{error && <div className="error">{error}</div>}<button className="primary" disabled={loading}>{loading ? 'Signing in...' : 'Open admin console'}</button></form></div></main>
}
