import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { adminApi } from '../api/adminApi'
import { useAdmin } from '../context/AdminContext'
import Pagination from '../components/Pagination'

const money = (value) => `RWF ${Number(value || 0).toLocaleString('en-RW')}`
const date = (value) => new Date(value).toLocaleString('en-RW', { dateStyle: 'medium', timeStyle: 'short' })

export default function PaymentsPage() {
  const { session } = useAdmin(); const [filter, setFilter] = useState('pending'); const [transactions, setTransactions] = useState([]); const [pagination, setPagination] = useState(null); const [page, setPage] = useState(1); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState('')
  const load = async () => { try { const result = await adminApi.transactions(filter, page, session.token); setTransactions(result.transactions); setPagination(result.pagination) } catch (error) { setNotice(error.message) } }
  useEffect(() => { setPage(1) }, [filter])
  useEffect(() => { load() }, [filter, page])
  const review = async (id, status) => { setBusy(id); try { await adminApi.reviewTransaction(id, status, session.token); setNotice(status === 'completed' ? 'Payment approved and balance updated.' : 'Payment rejected.'); await load() } catch (error) { setNotice(error.message) } finally { setBusy('') } }
  return <><PageHeader eyebrow="Control room / payments" title="Wallet transactions" description="Approve deposits and withdrawal requests." onRefresh={load} />{notice && <div className="notice">{notice}<button onClick={() => setNotice('')}>Dismiss</button></div>}<section className="panel page-panel"><div className="panel-heading"><div><span className="eyebrow">Payment queue</span><h2>Customer requests</h2></div><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="pending">Needs review</option><option value="completed">Approved</option><option value="rejected">Rejected</option></select></div>{transactions.length === 0 ? <div className="empty">No {filter} transactions.</div> : transactions.map((transaction) => <article className="transaction" key={transaction._id}><div className={`type-icon ${transaction.type}`}>{transaction.type === 'deposit' ? '↓' : '↑'}</div><div className="transaction-main"><div className="transaction-title"><strong>{transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'}</strong><span className={`status ${transaction.status}`}>{transaction.status === 'completed' ? 'approved' : transaction.status}</span></div><p>{transaction.user?.username || 'Unknown user'}</p><small>{date(transaction.createdAt)} · {transaction.user?.walletProvider?.toUpperCase()} {transaction.user?.walletPhoneNumber || 'No phone saved'}</small></div><div className="transaction-amount"><strong>{money(transaction.amount)}</strong>{transaction.status === 'pending' && <div className="actions"><button className="reject" disabled={busy === transaction._id} onClick={() => review(transaction._id, 'rejected')}>Reject</button><button className="approve" disabled={busy === transaction._id} onClick={() => review(transaction._id, 'completed')}>Approve</button></div>}</div></article>)}<Pagination pagination={pagination} onChange={setPage} /></section></>
}
