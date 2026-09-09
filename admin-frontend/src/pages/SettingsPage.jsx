import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { adminApi } from '../api/adminApi'
import { useAdmin } from '../context/AdminContext'

export default function SettingsPage() {
  const { session } = useAdmin(); const [form, setForm] = useState(null); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { adminApi.overview(session.token).then((data) => setForm(data.overview.platformWallet)).catch((error) => setNotice(error.message)) }, [])
  const submit = async (event) => { event.preventDefault(); setBusy(true); try { await adminApi.updatePlatformWallet(form, session.token); setNotice('Deposit recipient updated.') } catch (error) { setNotice(error.message) } finally { setBusy(false) } }
  return <><PageHeader eyebrow="Control room / configuration" title="Platform settings" description="Manage the mobile money account used for deposits." />{notice && <div className="notice">{notice}</div>}<section className="panel settings-panel"><div className="panel-heading"><div><span className="eyebrow">Deposit routing</span><h2>Platform recipient</h2></div><span className="live-dot">Live</span></div><p className="panel-copy">Customers send deposits to this account before submitting them for review.</p>{form && <form onSubmit={submit}><label>Registered name<input value={form.registeredName} onChange={(event) => setForm({ ...form, registeredName: event.target.value })} required /></label><label>Phone number<input value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} required /></label><label>Provider<select value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })}><option value="mtn">MTN Mobile Money</option><option value="airtel">Airtel Money</option><option value="other">Other</option></select></label><button className="primary" disabled={busy}>{busy ? 'Saving...' : 'Save recipient'}</button></form>}</section></>
}
