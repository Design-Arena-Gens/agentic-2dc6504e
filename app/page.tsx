import Link from 'next/link';

const featureCards = [
  {
    title: 'Live Arena',
    description: 'Play real-time matches with a responsive chessboard, intuitive move previews, and built-in timers.',
    href: '/play/live',
    cta: 'Enter Live Arena',
  },
  {
    title: 'Daily Challenges',
    description: 'Maintain correspondence-style games with reminders, annotated history, and synced progress tracking.',
    href: '/play/daily',
    cta: 'Plan Your Next Move',
  },
  {
    title: 'Tactical Puzzles',
    description: 'Solve curated puzzles that adapt to your rating, with instant feedback and interactive visualizations.',
    href: '/puzzles',
    cta: 'Train Tactics',
  },
  {
    title: 'Performance Analytics',
    description: 'Review heatmaps, streak trackers, and accuracy reports across live, daily, and puzzle play modes.',
    href: '/analysis',
    cta: 'View Insights',
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-14 py-4">
      <section className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
        <div className="flex flex-col gap-6">
          <span className="inline-flex items-center gap-2 self-start rounded-full bg-indigo-100 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            All-in-one chess platform
          </span>
          <h1 className="text-4xl font-bold text-slate-900 md:text-6xl">
            Master every phase of your game with Agentic Chess.
          </h1>
          <p className="text-lg text-slate-600 md:text-xl">
            Seamlessly switch between live battles, long-form strategy, tactical drills, and performance analytics — all
            from a single, elegant interface optimized for serious improvement.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/play/live" className="btn">
              Play Live Now
            </Link>
            <Link href="/analysis" className="btn btn-secondary">
              Analyze Progress
            </Link>
          </div>
          <dl className="mt-6 grid max-w-xl grid-cols-2 gap-6 text-sm text-slate-500">
            <div>
              <dt className="font-semibold text-slate-900">Adaptive ratings</dt>
              <dd>Track improvements in live, daily, and puzzle performance with contextual insights.</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">Tactical growth</dt>
              <dd>Unlock themed puzzles engineered to sharpen calculation, pattern spotting, and visualization.</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">Progress memory</dt>
              <dd>Auto-save your games and puzzles locally so every move counts toward your training story.</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">Insightful review</dt>
              <dd>Heatmaps, streaks, and accuracy charts make improvement visible day by day.</dd>
            </div>
          </dl>
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500 p-[1px] shadow-2xl">
          <div className="flex h-full w-full flex-col gap-6 rounded-[1.45rem] bg-white/95 p-8 text-slate-700">
            <h2 className="text-lg font-semibold text-slate-900">Live Momentum</h2>
            <p className="text-sm text-slate-600">
              Your last 5 live results are on a tear. Keep the streak alive with focused training blocks tailored to your
              calculator strengths.
            </p>
            <div className="grid grid-cols-5 gap-2">
              {['W', 'W', 'D', 'W', 'W'].map((result, index) => (
                <span
                  key={index}
                  className="flex h-12 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{
                    background:
                      result === 'W'
                        ? 'linear-gradient(135deg, rgba(34,197,94,0.9), rgba(16,185,129,0.9))'
                        : 'linear-gradient(135deg, rgba(59,130,246,0.9), rgba(99,102,241,0.9))',
                  }}
                >
                  {result}
                </span>
              ))}
            </div>
            <div className="rounded-2xl bg-slate-900/90 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Next up</p>
              <p className="mt-1 text-sm font-semibold">
                Tactical Sprint · 5 puzzles under 120 seconds • Target accuracy ≥ 80%
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {featureCards.map((card) => (
          <article key={card.title} className="card flex flex-col gap-4 border border-slate-100">
            <h3 className="text-2xl font-semibold text-slate-900">{card.title}</h3>
            <p className="text-sm text-slate-600">{card.description}</p>
            <Link href={card.href} className="btn mt-auto w-fit">
              {card.cta}
            </Link>
          </article>
        ))}
      </section>

      <section className="grid gap-6 rounded-3xl bg-slate-900 px-8 py-10 text-slate-100 md:grid-cols-3">
        <div>
          <h3 className="text-lg font-semibold">Live Strength</h3>
          <p className="mt-2 text-3xl font-bold">1386</p>
          <p className="text-sm text-slate-300">Rapid Glicko-2 Rating</p>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Daily Momentum</h3>
          <p className="mt-2 text-3xl font-bold">1421</p>
          <p className="text-sm text-slate-300">30-day performance rating</p>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Tactics Accuracy</h3>
          <p className="mt-2 text-3xl font-bold">86%</p>
          <p className="text-sm text-slate-300">Last 50 puzzle attempts</p>
        </div>
      </section>
    </div>
  );
}
