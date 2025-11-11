export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} Agentic Chess. Train. Play. Improve.</p>
        <div className="flex flex-wrap items-center gap-4">
          <a href="/analysis" className="hover:text-slate-900">Performance Dashboard</a>
          <a href="/puzzles" className="hover:text-slate-900">Puzzle Trainer</a>
          <a href="https://lichess.org/practice" target="_blank" rel="noreferrer" className="hover:text-slate-900">
            Practice Resources
          </a>
        </div>
      </div>
    </footer>
  );
}
