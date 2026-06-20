export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line short" />
      <div className="skeleton-line title" />
      <div className="skeleton-line" />
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
    </div>
  )
}

export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="alertas-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
