'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import ClientChessboard from '@/components/ClientChessboard';
import { useChessStore } from '@/store/useChessStore';
import { pickEngineMove, AiStyle } from '@/lib/ai';

const timePresets = [
  { id: '5+0', label: '5 + 0 Blitz', baseSeconds: 300, increment: 0 },
  { id: '10+0', label: '10 + 0 Rapid', baseSeconds: 600, increment: 0 },
  { id: '15+10', label: '15 + 10 Classical', baseSeconds: 900, increment: 10 },
];

const opponents: { id: AiStyle; label: string; description: string }[] = [
  { id: 'casual', label: 'Casual Bot', description: 'Plays quick, human-like moves with plenty of surprises.' },
  { id: 'balanced', label: 'Balanced Engine', description: 'Prioritises solid development and trades.' },
  { id: 'tactical', label: 'Tactical Nemesis', description: 'Seeks forcing tactics and open lines relentlessly.' },
];

const formatClock = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = Math.max(0, seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
};

export default function LiveGameArena() {
  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState(chessRef.current.fen());
  const [selectedOpponent, setSelectedOpponent] = useState(opponents[1]);
  const [timeControl, setTimeControl] = useState(timePresets[1]);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [timers, setTimers] = useState({ white: timePresets[1].baseSeconds, black: timePresets[1].baseSeconds });
  const [active, setActive] = useState(false);
  const [result, setResult] = useState<'white' | 'black' | 'draw' | null>(null);
  const [statusMessage, setStatusMessage] = useState('Configure a match to get started.');
  const [moveList, setMoveList] = useState<string[]>([]);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const recordGame = useChessStore((state) => state.recordGame);

  const score = useMemo(() => {
    if (!result) return 0.5;
    if (result === 'draw') return 0.5;
    return result === playerColor ? 1 : 0;
  }, [playerColor, result]);

  const resetGame = useCallback(
    (configurationOnly = false) => {
      chessRef.current = new Chess();
      setFen(chessRef.current.fen());
      setMoveList([]);
      setResult(null);
      setStatusMessage(configurationOnly ? 'Configuration updated.' : 'New game ready.');
      setTimers({ white: timeControl.baseSeconds, black: timeControl.baseSeconds });
      setActive(false);
      setStartedAt(null);
      setElapsed(0);
    },
    [timeControl.baseSeconds]
  );

  const concludeGame = useCallback(
    (outcome: 'white' | 'black' | 'draw', reason: string) => {
      setResult(outcome);
      setStatusMessage(reason);
      setActive(false);
      const finishedAt = new Date().toISOString();
      const moves = chessRef.current.history();
      if (!startedAt) return;
      const accuracy = Math.max(
        55,
        Math.min(98, Math.round(82 + (score - 0.5) * 28 - Math.max(0, moves.length - 40) * 0.8))
      );
      recordGame({
        id: `live-${Date.now()}`,
        mode: 'live',
        opponent: selectedOpponent.label,
        moves,
        startedAt,
        finishedAt,
        result: outcome,
        playerColor,
        accuracy,
        durationSeconds: elapsed,
        tags: ['live', selectedOpponent.id],
      });
    },
    [elapsed, playerColor, recordGame, score, selectedOpponent.id, selectedOpponent.label, startedAt]
  );

  const handleGameOver = useCallback(() => {
    if (chessRef.current.isCheckmate()) {
      const winner = chessRef.current.turn() === 'w' ? 'black' : 'white';
      concludeGame(winner, 'Checkmate on the board.');
    } else if (chessRef.current.isDraw()) {
      concludeGame('draw', 'Game drawn by rule.');
    }
  }, [concludeGame]);

  const startGame = useCallback(() => {
    resetGame(true);
    setActive(true);
    setStatusMessage('Game in progress. Make your first move.');
    setStartedAt(new Date().toISOString());
    if (playerColor === 'black') {
      setTimeout(() => {
        const aiMove = pickEngineMove(chessRef.current, selectedOpponent.id);
        if (aiMove) {
          chessRef.current.move(aiMove.san);
          setFen(chessRef.current.fen());
          setMoveList(chessRef.current.history({ verbose: false }));
        }
      }, 600);
    }
  }, [playerColor, resetGame, selectedOpponent.id]);

  useEffect(() => {
    if (!active || result) return;
    const interval = setInterval(() => {
      const turn = chessRef.current.turn();
      setTimers((prev) => {
        const key = turn === 'w' ? 'white' : 'black';
        if (prev[key] <= 0) {
          concludeGame(key === 'white' ? 'black' : 'white', 'Time has expired.');
          return prev;
        }
        return { ...prev, [key]: prev[key] - 1 };
      });
      setElapsed((value) => value + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [active, concludeGame, result]);

  const handleDrop = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      if (!active || result) return false;
      const move = chessRef.current.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: targetSquare[1] === '8' || targetSquare[1] === '1' ? 'q' : undefined,
      });
      if (move) {
        setFen(chessRef.current.fen());
        setMoveList(chessRef.current.history());
        if (timeControl.increment > 0) {
          setTimers((prev) => ({
            ...prev,
            [playerColor]: prev[playerColor] + timeControl.increment,
          }));
        }
        if (chessRef.current.isGameOver()) {
          handleGameOver();
        } else {
          setTimeout(() => {
            const aiMove = pickEngineMove(chessRef.current, selectedOpponent.id);
            if (aiMove) {
              chessRef.current.move(aiMove.san);
              setFen(chessRef.current.fen());
              setMoveList(chessRef.current.history());
              if (timeControl.increment > 0) {
                const aiKey = playerColor === 'white' ? 'black' : 'white';
                setTimers((prev) => ({ ...prev, [aiKey]: prev[aiKey] + timeControl.increment }));
              }
              if (chessRef.current.isGameOver()) {
                handleGameOver();
              }
            }
          }, 650);
        }
        return true;
      }
      return false;
    },
    [active, handleGameOver, playerColor, result, selectedOpponent.id, timeControl.increment]
  );

  useEffect(() => {
    resetGame(false);
  }, [playerColor, selectedOpponent, timeControl, resetGame]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(320px,420px)_1fr]">
      <section className="card flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">Live Arena</h1>
          <p className="text-sm text-slate-500">Real-time match experience with adaptive bots and time controls.</p>
        </header>

        <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
          <p>{statusMessage}</p>
          {result && (
            <p className="mt-2 font-semibold text-slate-900">
              Result: {result === 'draw' ? '½ - ½' : result === playerColor ? '1 - 0' : '0 - 1'}
            </p>
          )}
        </div>

        <div className="grid gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Opponent Strength
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={selectedOpponent.id}
              onChange={(event) => {
                const option = opponents.find((item) => item.id === event.target.value as AiStyle);
                if (option) setSelectedOpponent(option);
              }}
            >
              {opponents.map((bot) => (
                <option key={bot.id} value={bot.id}>
                  {bot.label}
                </option>
              ))}
            </select>
          </label>
          <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500">
            {selectedOpponent.description}
          </p>
        </div>

        <div className="grid gap-3 text-sm">
          <span className="font-medium text-slate-700">Time Control</span>
          <div className="flex flex-wrap gap-2">
            {timePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  preset.id === timeControl.id
                    ? 'border-primary bg-primary text-white shadow-card'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-primary/60 hover:text-primary'
                }`}
                onClick={() => setTimeControl(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="flex flex-col gap-1 font-medium text-slate-700">
            Your Color
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={playerColor}
              onChange={(event) => setPlayerColor(event.target.value as 'white' | 'black')}
            >
              <option value="white">White</option>
              <option value="black">Black</option>
            </select>
          </label>
          <div className="flex flex-col justify-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500">
            <span>Increment: {timeControl.increment}s</span>
            <span>Base Time: {Math.round(timeControl.baseSeconds / 60)} minutes</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn" onClick={startGame}>
            Start New Game
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => resetGame(false)}>
            Reset Board
          </button>
        </div>
      </section>

      <section className="card grid gap-6">
        <div className="grid grid-cols-2 gap-4 text-center text-sm font-semibold text-slate-800">
          <div className={`rounded-2xl border px-4 py-3 ${playerColor === 'white' ? 'border-primary shadow-card' : 'border-slate-200'}`}>
            <p className="text-xs uppercase tracking-wide text-slate-500">White</p>
            <p className="mt-1 text-2xl tabular-nums">{formatClock(timers.white)}</p>
          </div>
          <div className={`rounded-2xl border px-4 py-3 ${playerColor === 'black' ? 'border-primary shadow-card' : 'border-slate-200'}`}>
            <p className="text-xs uppercase tracking-wide text-slate-500">Black</p>
            <p className="mt-1 text-2xl tabular-nums">{formatClock(timers.black)}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <ClientChessboard
            position={fen}
            arePremovesAllowed
            boardOrientation={playerColor}
            arePiecesDraggable={active && !result}
            customBoardStyle={{ borderRadius: '16px' }}
            onPieceDrop={handleDrop}
          />
        </div>

        <div className="grid gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Move List</h2>
          <ol className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-2xl bg-slate-100 px-4 py-4 text-sm text-slate-700">
            {moveList.map((move, index) => (
              <li key={`${move}-${index}`} className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">{Math.floor(index / 2) + 1}.</span>
                <span>{move}</span>
              </li>
            ))}
            {!moveList.length && <span className="text-xs text-slate-400">No moves yet — make the first move to begin.</span>}
          </ol>
        </div>

        {result && startedAt && (
          <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Performance Snapshot</p>
            <p>Accuracy estimate: {(Math.round((82 + (score - 0.5) * 28) * 10) / 10).toFixed(1)}%</p>
            <p>Total moves: {moveList.length}</p>
            <p>Elapsed: {Math.round(elapsed / 60)} minutes</p>
          </div>
        )}
      </section>
    </div>
  );
}
