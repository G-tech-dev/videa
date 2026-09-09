export default function PageHeader({ eyebrow, title, description, onRefresh }) {
  return <header><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{onRefresh && <button className="refresh" onClick={onRefresh}>↻ Refresh</button>}</header>
}
