'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChessStore } from '@/store/useChessStore';
import type { GameRecord } from '@/store/useChessStore';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString();
const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

const colorMap = {
  live: '#6366F1',
  daily: '#22C55E',
  puzzle: '#F97316',
};

export default function PerformanceDashboard() {
  const { games, liveRating, dailyRating, puzzleRating, puzzleHistory, reset } = useChessStore((state) => ({
    games: state.games,
    liveRating: state.liveRating,
    dailyRating: state.dailyRating,
    puzzleRating: state.puzzleRating,
    puzzleHistory: state.puzzleHistory,
    reset: state.reset,
  }));
  const [viewRange, setViewRange] = useState<'10' | '25' | 'all'>('10');

  const slicedGames = useMemo(() => {
    if (viewRange === 'all') return games;
    const slice = Number(viewRange);
    return games.slice(0, slice);
  }, [games, viewRange]);

  const distribution = useMemo(() => {
    const resultBuckets = {
      wins: slicedGames.filter((game) => game.result === game.playerColor).length,
      losses: slicedGames.filter((game) => game.result !== 'draw' && game.result !== game.playerColor).length,
      draws: slicedGames.filter((game) => game.result === 'draw').length,
    };
    return [
      { name: 'Wins', value: resultBuckets.wins, fill: '#22C55E' },
      { name: 'Draws', value: resultBuckets.draws, fill: '#0EA5E9' },
      { name: 'Losses', value: resultBuckets.losses, fill: '#EF4444' },
    ];
  }, [slicedGames]);

  const averageMoveLength = useMemo(() => {
    if (!slicedGames.length) return 0;
    const totalMoves = slicedGames.reduce((acc, game) => acc + game.moves.length, 0);
    return Math.round(totalMoves / slicedGames.length);
  }, [slicedGames]);

  const liveSeries = useMemo(() => {
    let rolling = 1280;
    return games
      .slice()
      .reverse()
      .map((game, index) => {
        if (game.mode === 'live') {
          rolling = Math.round(rolling + (game.accuracy - 75) * 0.6);
        }
        return { index, rating: rolling, label: `G${index + 1}` };
      });
  }, [games]);

  const puzzleTrend = useMemo(() => {
    return puzzleHistory
      .slice(0, 20)
      .map((entry, index) => ({
        index,
        accuracy: entry.accuracyHistory.at(-1) ?? 0,
        label: entry.id,
      }))
      .reverse();
  }, [puzzleHistory]);

  const liveGames = slicedGames.filter((game) => game.mode === 'live');
  const dailyGames = slicedGames.filter((game) => game.mode === 'daily');

  return (
    <div className="flex flex-col gap-10">
      <header className="grid gap-2">
        <h1 className="text-3xl font-semibold text-slate-900">Performance Dashboard</h1>
        <p className="text-sm text-slate-500">
          Track live, daily, and tactical growth with unified insights. Toggle the range to drill into specific sessions.
        </p>
      </header>

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-card md:grid-cols-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-500">Live Rating</h2>
          <p className="mt-2 text-3xl font-bold text-slate-900">{liveRating}</p>
          <p className="text-xs text-slate-500">Based on your last 30 live encounters.</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-500">Daily Performance</h2>
          <p className="mt-2 text-3xl font-bold text-slate-900">{dailyRating}</p>
          <p className="text-xs text-slate-500">Incorporates endgame technique and long-term planning.</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-500">Tactical Rating</h2>
          <p className="mt-2 text-3xl font-bold text-slate-900">{puzzleRating}</p>
          <p className="text-xs text-slate-500">Reflects recent puzzle accuracy and streaks.</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="card h-[360px]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Live Accuracy Trend</h3>
            <div className="flex gap-2 text-xs">
              {(['10', '25', 'all'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setViewRange(option)}
                  className={`rounded-full px-3 py-1 font-semibold ${
                    viewRange === option
                      ? 'bg-primary text-white shadow-card'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                >
                  {option === 'all' ? 'All' : `${option} games`}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={liveSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[1100, 2200]} />
              <Tooltip />
              <Line type="monotone" dataKey="rating" stroke={colorMap.live} strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </article>

        <article className="card h-[360px]">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">Result Distribution</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={distribution} dataKey="value" innerRadius={60} outerRadius={110} paddingAngle={4} />
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="card h-[360px]">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">Puzzle Accuracy History</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={puzzleTrend}>
              <defs>
                <linearGradient id="accuracyGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={colorMap.puzzle} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={colorMap.puzzle} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} hide />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip />
              <Area type="monotone" dataKey="accuracy" stroke={colorMap.puzzle} fill="url(#accuracyGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </article>

        <article className="card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Session Insights</h3>
            <button type="button" className="text-xs font-semibold text-primary" onClick={reset}>
              Reset History
            </button>
          </div>
          <ul className="grid gap-2 text-sm text-slate-600">
            <li>• Average move count: {averageMoveLength || '—'} moves</li>
            <li>• Live sessions: {liveGames.length} · Daily sessions: {dailyGames.length}</li>
            <li>• Tactical streak entries: {puzzleHistory.length}</li>
          </ul>
        </article>
      </section>

      <section className="card">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Recent Games</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Opponent</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">Moves</th>
                <th className="px-4 py-3">Accuracy</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Finished</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {slicedGames.map((game) => (
                <tr key={game.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-semibold capitalize text-slate-700">{game.mode}</td>
                  <td className="px-4 py-3 text-slate-600">{game.opponent}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        game.result === 'draw'
                          ? 'bg-sky-100 text-sky-600'
                          : game.result === game.playerColor
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-rose-100 text-rose-600'
                      }`}
                    >
                      {game.result === 'draw' ? 'Draw' : game.result === game.playerColor ? 'Win' : 'Loss'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{game.moves.length}</td>
                  <td className="px-4 py-3 text-slate-600">{game.accuracy}%</td>
                  <td className="px-4 py-3 text-slate-600">{formatDuration(game.durationSeconds)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(game.finishedAt)}</td>
                </tr>
              ))}
              {!slicedGames.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    No games recorded yet. Play a live or daily game to populate insights.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
