export default function Stat({ label, value, accent }) {
  return <div className={`stat ${accent || ''}`}><span>{label}</span><strong>{value}</strong></div>
}
