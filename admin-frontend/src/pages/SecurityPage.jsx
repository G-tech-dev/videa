import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Pagination from '../components/Pagination'
import { adminApi } from '../api/adminApi'
import { useAdmin } from '../context/AdminContext'

const date = (value) => new Date(value).toLocaleString('en-RW', { dateStyle: 'medium', timeStyle: 'short' })

export default function SecurityPage() {
  const { session } = useAdmin()
  const [sessions, setSessions] = useState([])
  const [entries, setEntries] = useState([])
  const [sessionPagination, setSessionPagination] = useState(null)
  const [auditPagination, setAuditPagination] = useState(null)
  const [sessionPage, setSessionPage] = useState(1)
  const [auditPage, setAuditPage] = useState(1)
  const [notice, setNotice] = useState('')

  const loadSessions = async () => {
    try {
      const result = await adminApi.suspiciousSessions(sessionPage, session.token)
      setSessions(result.sessions)
      setSessionPagination(result.pagination)
    } catch (error) { setNotice(error.message) }
  }
  const loadAudit = async () => {
    try {
      const result = await adminApi.auditLog(auditPage, session.token)
      setEntries(result.entries)
      setAuditPagination(result.pagination)
    } catch (error) { setNotice(error.message) }
  }

  useEffect(() => { loadSessions() }, [sessionPage])
  useEffect(() => { loadAudit() }, [auditPage])

  return <><PageHeader eyebrow="Control room / security" title="Security review" description="Review suspicious watch activity and administrator actions." onRefresh={() => { loadSessions(); loadAudit() }} />{notice && <div className="notice">{notice}<button onClick={() => setNotice('')}>Dismiss</button></div>}<section className="panel page-panel"><div className="panel-heading"><div><span className="eyebrow">Watch protection</span><h2>Suspicious sessions</h2></div></div>{sessions.length === 0 ? <div className="empty">No suspicious sessions found.</div> : sessions.map((sessionItem) => <article className="transaction" key={sessionItem._id}><div className="type-icon withdrawal">!</div><div className="transaction-main"><div className="transaction-title"><strong>{sessionItem.user?.username || 'Unknown user'}</strong><span className="status rejected">Review</span></div><p>{sessionItem.video?.videoTitle || 'Unknown video'}</p><small>{date(sessionItem.updatedAt)} · IP {sessionItem.ipAddress || 'Unavailable'} · {sessionItem.suspiciousReasons?.join(', ')}</small></div><div className="transaction-amount"><strong>{sessionItem.creditedSeconds || 0}s</strong></div></article>)}<Pagination pagination={sessionPagination} onChange={setSessionPage} /></section><section className="panel page-panel"><div className="panel-heading"><div><span className="eyebrow">Accountability</span><h2>Admin audit log</h2></div></div>{entries.length === 0 ? <div className="empty">No administrator actions recorded.</div> : entries.map((entry) => <article className="transaction" key={entry._id}><div className="type-icon deposit">•</div><div className="transaction-main"><div className="transaction-title"><strong>{entry.action}</strong></div><p>{entry.actor?.username || 'Unknown administrator'} · {entry.targetType}</p><small>{date(entry.createdAt)} · IP {entry.ipAddress || 'Unavailable'}</small></div></article>)}<Pagination pagination={auditPagination} onChange={setAuditPage} /></section></>
}
