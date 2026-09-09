export default function Pagination({ pagination, onChange }) {
  if (!pagination || pagination.pages <= 1) return null
  return <div className="pagination"><button disabled={pagination.page <= 1} onClick={() => onChange(pagination.page - 1)}>Previous</button><span>Page {pagination.page} of {pagination.pages}</span><button disabled={pagination.page >= pagination.pages} onClick={() => onChange(pagination.page + 1)}>Next</button></div>
}