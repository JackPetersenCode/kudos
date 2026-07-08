export default function Loading() {
  return (
    <main className="page-container" style={{ paddingTop: 32, paddingBottom: 32 }}>
      <div className="skeleton" style={{ height: 40, width: "40%", marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 200, borderRadius: 12, marginBottom: 20 }} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 160, borderRadius: 12 }} />
        ))}
      </div>
    </main>
  );
}
