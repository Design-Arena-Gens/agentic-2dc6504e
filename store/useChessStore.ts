'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type GameMode = 'live' | 'daily';
export type GameResult = 'white' | 'black' | 'draw';
export type PlayerColor = 'white' | 'black';

export interface GameRecord {
  id: string;
  mode: GameMode;
  opponent: string;
  moves: string[];
  startedAt: string;
  finishedAt: string;
  result: GameResult;
  playerColor: PlayerColor;
  accuracy: number;
  durationSeconds: number;
  tags?: string[];
}

export interface DailyGame {
  id: string;
  title: string;
  opponent: string;
  fen: string;
  moves: string[];
  lastUpdated: string;
  colorToMove: 'w' | 'b';
  playerColor: PlayerColor;
  remindersEnabled: boolean;
}

export interface PuzzleHistory {
  id: string;
  attempts: number;
  solved: boolean;
  bestTime: number | null;
  lastAttemptAt: string | null;
  accuracyHistory: number[];
}

interface ChessState {
  liveRating: number;
  dailyRating: number;
  puzzleRating: number;
  liveStreak: number;
  dailyStreak: number;
  puzzleStreak: number;
  games: GameRecord[];
  dailyGames: DailyGame[];
  puzzleHistory: PuzzleHistory[];
  recordGame: (game: GameRecord) => void;
  upsertDailyGame: (game: DailyGame) => void;
  updateDailyGame: (id: string, patch: Partial<DailyGame>) => void;
  completeDailyGame: (id: string, result: GameResult, accuracy: number, durationSeconds: number) => void;
  recordPuzzleAttempt: (payload: {
    puzzleId: string;
    solved: boolean;
    timeTaken: number;
    accuracy: number;
  }) => void;
  reset: () => void;
}

const ratingBump = (current: number, score: number) => {
  const k = current < 2000 ? 32 : 16;
  const delta = Math.round(k * (score - 0.5));
  return Math.max(100, current + delta);
};

const computeScore = (result: GameResult, playerColor: PlayerColor): number => {
  if (result === 'draw') return 0.5;
  const winner = result === 'white' ? 'white' : 'black';
  return winner === playerColor ? 1 : 0;
};

export const useChessStore = create<ChessState>()(
  persist(
    (set, get) => ({
      liveRating: 1280,
      dailyRating: 1325,
      puzzleRating: 1240,
      liveStreak: 0,
      dailyStreak: 0,
      puzzleStreak: 0,
      games: [],
      dailyGames: [],
      puzzleHistory: [],
      recordGame: (game) => {
        const { games, liveRating, dailyRating, liveStreak, dailyStreak } = get();
        const score = computeScore(game.result, game.playerColor);
        const isLive = game.mode === 'live';

        const updatedRating = isLive
          ? ratingBump(liveRating, score)
          : ratingBump(dailyRating, score);

        set({
          games: [game, ...games].slice(0, 100),
          liveRating: isLive ? updatedRating : liveRating,
          dailyRating: isLive ? dailyRating : updatedRating,
          liveStreak: isLive ? (score === 1 ? liveStreak + 1 : 0) : liveStreak,
          dailyStreak: !isLive ? (score === 1 ? dailyStreak + 1 : 0) : dailyStreak,
        });
      },
      upsertDailyGame: (game) => {
        const { dailyGames } = get();
        const existingIndex = dailyGames.findIndex((g) => g.id === game.id);
        if (existingIndex === -1) {
          set({ dailyGames: [game, ...dailyGames] });
        } else {
          const next = [...dailyGames];
          next[existingIndex] = game;
          set({ dailyGames: next });
        }
      },
      updateDailyGame: (id, patch) => {
        const { dailyGames } = get();
        const next = dailyGames.map((game) => (game.id === id ? { ...game, ...patch } : game));
        set({ dailyGames: next });
      },
      completeDailyGame: (id, result, accuracy, durationSeconds) => {
        const { dailyGames } = get();
        const target = dailyGames.find((game) => game.id === id);
        if (!target) return;
        const finishedAt = new Date().toISOString();
        const newRecord: GameRecord = {
          id: `${id}-completed-${finishedAt}`,
          mode: 'daily',
          opponent: target.opponent,
          moves: target.moves,
          startedAt: target.lastUpdated,
          finishedAt,
          result,
          playerColor: target.playerColor,
          accuracy,
          durationSeconds,
          tags: ['daily'],
        };
        set({ dailyGames: dailyGames.filter((game) => game.id !== id) });
        get().recordGame(newRecord);
      },
      recordPuzzleAttempt: ({ puzzleId, solved, timeTaken, accuracy }) => {
        const { puzzleHistory, puzzleRating, puzzleStreak } = get();
        const existing = puzzleHistory.find((item) => item.id === puzzleId);
        const now = new Date().toISOString();

        let updatedHistory: PuzzleHistory[];
        if (existing) {
          updatedHistory = puzzleHistory.map((item) =>
            item.id === puzzleId
              ? {
                  ...item,
                  attempts: item.attempts + 1,
                  solved,
                  bestTime: solved
                    ? item.bestTime === null
                      ? timeTaken
                      : Math.min(item.bestTime, timeTaken)
                    : item.bestTime,
                  lastAttemptAt: now,
                  accuracyHistory: [...item.accuracyHistory, accuracy].slice(-20),
                }
              : item
          );
        } else {
          updatedHistory = [
            {
              id: puzzleId,
              attempts: 1,
              solved,
              bestTime: solved ? timeTaken : null,
              lastAttemptAt: now,
              accuracyHistory: [accuracy],
            },
            ...puzzleHistory,
          ];
        }

        const score = solved ? 1 : 0;
        const updatedRating = ratingBump(puzzleRating, score);

        set({
          puzzleHistory: updatedHistory,
          puzzleRating: updatedRating,
          puzzleStreak: solved ? puzzleStreak + 1 : 0,
        });
      },
      reset: () =>
        set({
          liveRating: 1280,
          dailyRating: 1325,
          puzzleRating: 1240,
          liveStreak: 0,
          dailyStreak: 0,
          puzzleStreak: 0,
          games: [],
          dailyGames: [],
          puzzleHistory: [],
        }),
    }),
    {
      name: 'agentic-chess-state',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
