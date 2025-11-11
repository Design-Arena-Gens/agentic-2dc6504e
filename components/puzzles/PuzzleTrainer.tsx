'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import ClientChessboard from '@/components/ClientChessboard';
import { puzzles, Puzzle, PuzzleDifficulty } from '@/data/puzzles';
import { useChessStore } from '@/store/useChessStore';

const sanitize = (san: string) => san.replace(/[+#?!]/g, '');

const difficultyLabels: Record<PuzzleDifficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const filterPuzzles = (difficulty: PuzzleDifficulty) => puzzles.filter((puzzle) => puzzle.difficulty === difficulty);

const pickRandomPuzzle = (difficulty: PuzzleDifficulty) => {
  const pool = filterPuzzles(difficulty);
  return pool[Math.floor(Math.random() * pool.length)];
};

export default function PuzzleTrainer() {
  const recordPuzzleAttempt = useChessStore((state) => state.recordPuzzleAttempt);
  const puzzleRating = useChessStore((state) => state.puzzleRating);
  const puzzleHistory = useChessStore((state) => state.puzzleHistory);

  const [difficulty, setDifficulty] = useState<PuzzleDifficulty>('intermediate');
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle>(() => pickRandomPuzzle('intermediate'));
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [status, setStatus] = useState('Calculate the winning line.');
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(false);
  const [timeStarted, setTimeStarted] = useState(() => Date.now());
  const [moveTrail, setMoveTrail] = useState<string[]>([]);

  const chessRef = useRef(new Chess(currentPuzzle.fen));

  const historicalRecord = useMemo(() => puzzleHistory.find((entry) => entry.id === currentPuzzle.id), [
    currentPuzzle.id,
    puzzleHistory,
  ]);

  useEffect(() => {
    chessRef.current = new Chess(currentPuzzle.fen);
    setSolutionIndex(0);
    setStatus('Calculate the winning line.');
    setAttempts(0);
    setSolved(false);
    setTimeStarted(Date.now());
    setMoveTrail([]);
  }, [currentPuzzle]);

  const advancePuzzle = () => {
    const nextPuzzle = pickRandomPuzzle(difficulty);
    setCurrentPuzzle(nextPuzzle);
  };

  const finishPuzzle = (didSolve: boolean) => {
    const timeTaken = Math.round((Date.now() - timeStarted) / 1000);
    const accuracySeed = didSolve ? 95 - attempts * 10 : Math.max(40, 65 - attempts * 8);
    const accuracy = Math.max(35, Math.min(99, accuracySeed));
    recordPuzzleAttempt({
      puzzleId: currentPuzzle.id,
      solved: didSolve,
      timeTaken,
      accuracy,
    });
    setSolved(didSolve);
    setStatus(didSolve ? 'Puzzle complete! Excellent calculation.' : 'Marked as missed. Review the solution.');
  };

  const handleDrop = (source: string, target: string) => {
    if (solved) return false;
    const nextRequired = currentPuzzle.solution[solutionIndex];
    if (!nextRequired) return false;

    const move = chessRef.current.move({
      from: source,
      to: target,
      promotion: target[1] === '8' || target[1] === '1' ? 'q' : undefined,
    });

    if (!move) return false;

    const sanitizedUserMove = sanitize(move.san);
    const sanitizedExpected = sanitize(nextRequired.move);

    if (sanitizedUserMove !== sanitizedExpected) {
      chessRef.current.undo();
      setStatus('Not quite right — reassess the tactic.');
      setAttempts((count) => count + 1);
      return false;
    }

    const nextIndex = solutionIndex + 1;
    setMoveTrail((trail) => [...trail, move.san]);
    setStatus('Great! Follow through the line.');

    const replyMove = nextRequired.reply;
    if (replyMove) {
      const response = chessRef.current.move(replyMove);
      if (response) {
        setMoveTrail((trail) => [...trail, response.san]);
      }
    }

    if (nextIndex >= currentPuzzle.solution.length) {
      finishPuzzle(true);
    } else {
      setSolutionIndex(nextIndex);
    }

    return true;
  };

  const skipPuzzle = () => {
    if (!solved) {
      finishPuzzle(false);
    }
    setTimeout(() => advancePuzzle(), 450);
  };

  const replayPuzzle = () => {
    chessRef.current = new Chess(currentPuzzle.fen);
    setSolutionIndex(0);
    setAttempts(0);
    setSolved(false);
    setStatus('Replaying puzzle from the start.');
    setMoveTrail([]);
    setTimeStarted(Date.now());
  };

  const changeDifficulty = (nextDifficulty: PuzzleDifficulty) => {
    setDifficulty(nextDifficulty);
    const candidate = pickRandomPuzzle(nextDifficulty);
    setCurrentPuzzle(candidate);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(320px,420px)_1fr]">
      <section className="card flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">Tactical Trainer</h1>
          <p className="text-sm text-slate-500">
            Solve curated puzzles that target your current weaknesses and strengthen calculation discipline.
          </p>
        </header>

        <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
          <p>{status}</p>
          <p className="mt-2 text-xs text-slate-500">Rating: {puzzleRating} · Attempts: {attempts}</p>
          {historicalRecord && (
            <p className="mt-1 text-xs text-slate-500">
              Best time: {historicalRecord.bestTime ? `${historicalRecord.bestTime}s` : '—'} · Total attempts: {historicalRecord.attempts}
            </p>
          )}
        </div>

        <div className="grid gap-3 text-sm">
          <span className="font-semibold text-slate-700">Difficulty</span>
          <div className="flex flex-wrap gap-2">
            {(['beginner', 'intermediate', 'advanced'] as PuzzleDifficulty[]).map((level) => (
              <button
                key={level}
                type="button"
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  level === difficulty
                    ? 'border-primary bg-primary text-white shadow-card'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-primary/70 hover:text-primary'
                }`}
                onClick={() => changeDifficulty(level)}
              >
                {difficultyLabels[level]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 text-sm">
          <span className="font-semibold text-slate-700">Puzzle Metadata</span>
          <dl className="grid gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-xs text-slate-500">
            <div className="flex items-center justify-between">
              <dt>ID</dt>
              <dd className="font-semibold text-slate-700">{currentPuzzle.id}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Theme</dt>
              <dd className="font-semibold text-slate-700">{currentPuzzle.themes.join(', ')}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Side to move</dt>
              <dd className="font-semibold text-slate-700">{currentPuzzle.sideToMove === 'w' ? 'White' : 'Black'}</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <button type="button" className="btn" onClick={advancePuzzle}>
            New Puzzle
          </button>
          <button type="button" className="btn btn-secondary" onClick={replayPuzzle}>
            Retry
          </button>
          <button type="button" className="btn btn-secondary" onClick={skipPuzzle}>
            Skip
          </button>
        </div>
      </section>

      <section className="card grid gap-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <ClientChessboard
            position={chessRef.current.fen()}
            boardOrientation={currentPuzzle.sideToMove === 'w' ? 'white' : 'black'}
            arePiecesDraggable={!solved}
            customBoardStyle={{ borderRadius: '18px' }}
            onPieceDrop={handleDrop}
          />
        </div>

        <div className="grid gap-3 text-sm">
          <h3 className="text-lg font-semibold text-slate-800">Solution Trail</h3>
          <div className="flex flex-wrap gap-2">
            {moveTrail.map((move, index) => (
              <span key={`${move}-${index}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {move}
              </span>
            ))}
            {!moveTrail.length && <span className="text-xs text-slate-400">No moves yet. Find the forcing line.</span>}
          </div>
        </div>

        {solved && (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-700">
            <p className="font-semibold">Solution locked in.</p>
            <p>Challenge yourself with a tougher difficulty or replay for mastery.</p>
          </div>
        )}
      </section>
    </div>
  );
}
