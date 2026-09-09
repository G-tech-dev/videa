import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Stat from '../components/Stat'
import { adminApi } from '../api/adminApi'
import { useAdmin } from '../context/AdminContext'

const money = (value) => `RWF ${Number(value || 0).toLocaleString('en-RW')}`

export default function OverviewPage() {
  const { session } = useAdmin(); const [overview, setOverview] = useState(null); const [error, setError] = useState('')
  const load = async () => { try { setOverview((await adminApi.overview(session.token)).overview) } catch (requestError) { setError(requestError.message) } }
  useEffect(() => { load() }, [])
  return <><PageHeader eyebrow="Control room / platform" title="Operations overview" description="Monitor payments, users, content, and watch security." onRefresh={load} />{error && <div className="notice">{error}</div>}<section className="stats"><Stat label="Pending payments" value={overview?.pendingTransactions ?? '—'} accent="pending" /><Stat label="Approved deposits" value={money(overview?.completedDeposits)} /><Stat label="Approved withdrawals" value={money(overview?.completedWithdrawals)} /><Stat label="Registered users" value={overview?.users ?? '—'} /><Stat label="Suspicious sessions" value={overview?.suspiciousSessions ?? 0} accent="pending" /><Stat label="Repeated IP signals" value={overview?.repeatedIpSignals ?? 0} /><Stat label="Repeated device signals" value={overview?.repeatedDeviceSignals ?? 0} /></section><div className="overview-links"><Link to="/admin/payments">Review payment requests <span>→</span></Link><Link to="/admin/videos">Moderate uploaded videos <span>→</span></Link><Link to="/admin/security">Review security signals <span>→</span></Link></div></>
}
