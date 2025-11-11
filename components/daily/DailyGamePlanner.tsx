'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import ClientChessboard from '@/components/ClientChessboard';
import { useChessStore, DailyGame, GameResult } from '@/store/useChessStore';
import { pickEngineMove, AiStyle } from '@/lib/ai';

const opponentProfiles: { id: AiStyle; label: string; cadence: string; style: string }[] = [
  {
    id: 'balanced',
    label: 'Strategist',
    cadence: 'Replies within 12 hours',
    style: 'Solid positional responses with occasional tactical ideas.',
  },
  {
    id: 'tactical',
    label: 'Tactician',
    cadence: 'Replies in short bursts',
    style: 'Looks for forcing continuations and sacrifices when available.',
  },
  {
    id: 'casual',
    label: 'Relaxed Gambiteer',
    cadence: 'Replies daily',
    style: 'Prefers practical moves and gambits to keep the game lively.',
  },
];

const formatTimestamp = (iso: string) => new Date(iso).toLocaleString();

const INITIAL_TITLE = 'Daily Clash';

export default function DailyGamePlanner() {
  const { dailyGames, upsertDailyGame, updateDailyGame, completeDailyGame } = useChessStore((state) => ({
    dailyGames: state.dailyGames,
    upsertDailyGame: state.upsertDailyGame,
    updateDailyGame: state.updateDailyGame,
    completeDailyGame: state.completeDailyGame,
  }));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState(opponentProfiles[0]);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState(chessRef.current.fen());
  const [autoFinishMessage, setAutoFinishMessage] = useState<string | null>(null);

  const currentGame = useMemo(() => dailyGames.find((game) => game.id === selectedId) ?? dailyGames[0] ?? null, [
    dailyGames,
    selectedId,
  ]);

  useEffect(() => {
    if (!selectedId && dailyGames.length) {
      setSelectedId(dailyGames[0].id);
    }
  }, [dailyGames, selectedId]);

  useEffect(() => {
    if (currentGame) {
      chessRef.current = new Chess(currentGame.fen);
      setFen(currentGame.fen);
    } else {
      chessRef.current = new Chess();
      setFen(chessRef.current.fen());
    }
  }, [currentGame]);

  const createDailyGame = () => {
    const id = `daily-${Date.now()}`;
    const newGame: DailyGame = {
      id,
      title: `${INITIAL_TITLE} #${dailyGames.length + 1}`,
      opponent: opponent.label,
      fen: new Chess().fen(),
      moves: [],
      lastUpdated: new Date().toISOString(),
      colorToMove: 'w',
      playerColor,
      remindersEnabled: true,
    };

    upsertDailyGame(newGame);
    setSelectedId(id);
    chessRef.current = new Chess(newGame.fen);
    setFen(newGame.fen);
    if (playerColor === 'black') {
      setTimeout(() => {
        const engineMove = pickEngineMove(chessRef.current, opponent.id);
        if (engineMove) {
          chessRef.current.move(engineMove.san);
          setFen(chessRef.current.fen());
          upsertDailyGame({
            ...newGame,
            fen: chessRef.current.fen(),
            moves: chessRef.current.history(),
            lastUpdated: new Date().toISOString(),
            colorToMove: 'w',
          });
        }
      }, 400);
    }
  };

  const finishGame = (result: GameResult) => {
    if (!currentGame) return;
    const totalMoves = chessRef.current.history().length;
    const accuracy = Math.max(
      58,
      Math.min(99, Math.round(80 + (result === 'draw' ? 0 : result === currentGame.playerColor ? 10 : -8) - totalMoves * 0.4))
    );
    completeDailyGame(currentGame.id, result, accuracy, totalMoves * 45);
    setAutoFinishMessage('Game archived. Check your performance dashboard for insights.');
  };

  const handleDrop = (sourceSquare: string, targetSquare: string) => {
    if (!currentGame) return false;
    if ((currentGame.colorToMove === 'w' && currentGame.playerColor !== 'white') || (currentGame.colorToMove === 'b' && currentGame.playerColor !== 'black')) {
      return false;
    }

    const move = chessRef.current.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: targetSquare[1] === '8' || targetSquare[1] === '1' ? 'q' : undefined,
    });

    if (!move) return false;

    const nextFen = chessRef.current.fen();
    const history = chessRef.current.history();
    updateDailyGame(currentGame.id, {
      fen: nextFen,
      moves: history,
      colorToMove: chessRef.current.turn(),
      lastUpdated: new Date().toISOString(),
    });
    setFen(nextFen);

    if (chessRef.current.isGameOver()) {
      if (chessRef.current.isCheckmate()) {
        finishGame(currentGame.playerColor);
      } else {
        finishGame('draw');
      }
      return true;
    }

    setTimeout(() => {
      const reply = pickEngineMove(chessRef.current, opponent.id);
      if (reply) {
        chessRef.current.move(reply.san);
        const replyFen = chessRef.current.fen();
        const replyHistory = chessRef.current.history();
        if (chessRef.current.isGameOver()) {
          if (chessRef.current.isCheckmate()) {
            finishGame(currentGame.playerColor === 'white' ? 'black' : 'white');
          } else {
            finishGame('draw');
          }
        } else {
          updateDailyGame(currentGame.id, {
            fen: replyFen,
            moves: replyHistory,
            colorToMove: chessRef.current.turn(),
            lastUpdated: new Date().toISOString(),
          });
          setFen(replyFen);
        }
      }
    }, 600);

    return true;
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(320px,420px)_1fr]">
      <section className="card flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">Daily Planner</h1>
          <p className="text-sm text-slate-500">
            Maintain long-form games with reminders, annotated timelines, and structured plans for every move.
          </p>
        </header>

        <div className="grid gap-4 text-sm">
          <label className="flex flex-col gap-1 font-medium text-slate-700">
            Opponent Persona
            <select
              className="rounded-xl border border-slate-200 px-3 py-2"
              value={opponent.id}
              onChange={(event) => {
                const profile = opponentProfiles.find((item) => item.id === event.target.value as AiStyle);
                if (profile) setOpponent(profile);
              }}
            >
              {opponentProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-xl bg-slate-100 px-3 py-3 text-xs text-slate-500">
            <p className="font-semibold text-slate-600">Cadence: {opponent.cadence}</p>
            <p>{opponent.style}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="flex flex-col gap-1 font-medium text-slate-700">
            Your Color
            <select
              className="rounded-xl border border-slate-200 px-3 py-2"
              value={playerColor}
              onChange={(event) => setPlayerColor(event.target.value as 'white' | 'black')}
            >
              <option value="white">White</option>
              <option value="black">Black</option>
            </select>
          </label>
          <button type="button" className="btn" onClick={createDailyGame}>
            Launch Correspondence Game
          </button>
        </div>

        <div className="grid gap-3 text-sm">
          <span className="font-semibold text-slate-700">Active Daily Games</span>
          <div className="flex max-h-56 flex-col gap-2 overflow-y-auto rounded-2xl border border-slate-200 p-3">
            {dailyGames.length === 0 && <p className="text-xs text-slate-400">No daily games yet. Create one above.</p>}
            {dailyGames.map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => setSelectedId(game.id)}
                className={`flex flex-col gap-1 rounded-xl border px-3 py-2 text-left transition ${
                  currentGame && game.id === currentGame.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 hover:border-primary/60 hover:bg-slate-50'
                }`}
              >
                <span className="text-sm font-semibold">{game.title}</span>
                <span className="text-xs text-slate-500">
                  {game.moves.length} moves · Updated {formatTimestamp(game.lastUpdated)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card grid gap-6">
        {currentGame ? (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold text-slate-900">{currentGame.title}</h2>
              <p className="text-sm text-slate-500">
                You are playing as <strong>{currentGame.playerColor}</strong> against {currentGame.opponent}. Next move:{' '}
                {currentGame.colorToMove === 'w' ? 'White' : 'Black'}.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <ClientChessboard
                position={fen}
                boardOrientation={currentGame.playerColor}
                arePiecesDraggable={currentGame.colorToMove === (currentGame.playerColor === 'white' ? 'w' : 'b')}
                customBoardStyle={{ borderRadius: '18px' }}
                onPieceDrop={handleDrop}
              />
            </div>

            <div className="grid gap-2 text-sm">
              <h3 className="text-lg font-semibold text-slate-800">Move Timeline</h3>
              <div className="grid max-h-48 grid-cols-2 gap-x-6 gap-y-1 overflow-y-auto rounded-2xl bg-slate-100 px-4 py-4">
                {currentGame.moves.map((move, index) => (
                  <span key={`${move}-${index}`} className="text-slate-600">
                    <span className="font-semibold text-slate-400">{Math.floor(index / 2) + 1}.</span> {move}
                  </span>
                ))}
                {currentGame.moves.length === 0 && <p className="text-xs text-slate-400">No moves recorded. Lead with an opening idea.</p>}
              </div>
            </div>

            <div className="grid gap-3 text-sm">
              <h3 className="text-lg font-semibold text-slate-800">Planning Notes</h3>
              <ul className="grid gap-2 text-slate-600">
                <li>• Highlight candidate moves and evaluate resulting pawn structures.</li>
                <li>• Track critical moments inside your performance dashboard after completion.</li>
                <li>• Enable reminders to receive nudges on long think sessions.</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
            <p className="text-lg font-semibold text-slate-600">No daily game selected</p>
            <p className="text-sm">Create a correspondence match to begin planning your long-term strategy.</p>
          </div>
        )}

        {autoFinishMessage && <p className="rounded-xl bg-green-100 px-4 py-2 text-xs text-green-700">{autoFinishMessage}</p>}
      </section>
    </div>
  );
}
