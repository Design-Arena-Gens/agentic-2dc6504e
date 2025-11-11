import { Chess } from 'chess.js';
import { puzzles } from '../data/puzzles';

let hasError = false;

puzzles.forEach((puzzle) => {
  const game = new Chess(puzzle.fen);
for (let i = 0; i < puzzle.solution.length; i += 1) {
  const { move, reply } = puzzle.solution[i];
  const result = game.move(move);
  if (!result) {
    console.error(`Invalid move "${move}" at step ${i + 1} in puzzle ${puzzle.id}`);
    hasError = true;
    break;
  }
  if (reply) {
    const replyResult = game.move(reply);
    if (!replyResult) {
      console.error(`Invalid reply "${reply}" at step ${i + 1} in puzzle ${puzzle.id}`);
      hasError = true;
      break;
    }
  }
}
  if (!hasError) {
    if (!game.isGameOver()) {
      console.warn(`Puzzle ${puzzle.id} solution does not end the game.`);
    }
  }
});

if (hasError) {
  process.exit(1);
}
