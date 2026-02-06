export default function App() {
  return (
    <div className="min-h-screen bg-[#0b0f17] text-white p-8">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Fire TV Dashboard</h1>
          <p className="text-sm text-slate-300">World clocks • Weather • News</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 w-64">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Local Weather</div>
          <div className="mt-3 text-2xl font-semibold">--°</div>
          <div className="text-sm text-slate-300">Loading…</div>
        </div>
      </header>

      <main className="mt-8 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">World Clocks</div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
            {['London', 'New York', 'Tokyo', 'Sydney'].map(city => (
              <button
                key={city}
                className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-left focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <div className="text-sm text-slate-300">{city}</div>
                <div className="text-2xl font-semibold">--:--</div>
                <div className="text-xs text-slate-500">Day, Date</div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Top Headlines</div>
          <ul className="mt-4 space-y-3 text-sm">
            {[1, 2, 3, 4, 5].map(item => (
              <li key={item}>
                <button className="w-full text-left rounded-lg border border-slate-800 bg-slate-950/60 p-3 focus:outline-none focus:ring-2 focus:ring-sky-400">
                  <div className="text-slate-200">Headline placeholder {item}</div>
                  <div className="text-xs text-slate-500">Source · 10m ago</div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
