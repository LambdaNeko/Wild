import {
  applyAction,
  getLegalDropsForToken,
  getLegalMovesForToken
} from "./rules";
import { getTokenAt } from "./selectors";
import type {
  AnimalType,
  GameAction,
  GameState,
  PlayerId,
  QuantumToken
} from "./types";

export type NpcStrength = "weak" | "medium" | "strong";

type ScoredAction = {
  action: GameAction;
  score: number;
};

const WIN_SCORE = 100_000;

const ANIMAL_VALUES: Record<AnimalType, number> = {
  king: 100,
  wolf: 12,
  owl: 12,
  deer: 7,
  fox: 7,
  frog: 5,
  snake: 5,
  rabbit: 3
};

export function getLegalActions(state: GameState): GameAction[] {
  if (state.winner) {
    return [];
  }

  const actions: GameAction[] = [];
  for (const token of state.tokens) {
    if (token.currentOwner !== state.turn) {
      continue;
    }

    if (token.location === "hand") {
      for (const to of getLegalDropsForToken(state, token.id)) {
        actions.push({ type: "drop", tokenId: token.id, to });
      }
      continue;
    }

    if (token.position !== null) {
      for (const to of getLegalMovesForToken(state, token.id)) {
        actions.push({ type: "move", tokenId: token.id, to });
      }
    }
  }

  return actions;
}

export function chooseNpcAction(
  state: GameState,
  strength: NpcStrength,
  random: () => number = Math.random
): GameAction | null {
  const actions = getLegalActions(state);
  if (actions.length === 0) {
    return null;
  }

  const player = state.turn;
  const scored = actions.map((action) => ({
    action,
    score: scoreActionByStrength(state, action, player, strength)
  }));

  if (strength === "weak") {
    return chooseWeightedTopAction(scored, random);
  }

  return chooseHighestScored(scored).action;
}


function scoreActionByStrength(
  state: GameState,
  action: GameAction,
  player: PlayerId,
  strength: NpcStrength
): number {
  if (strength === "weak") {
    return scoreMediumAction(state, action, player);
  }

  if (strength === "medium") {
    return scoreStrongAction(state, action, player);
  }

  return scoreVeryStrongAction(state, action, player);
}

function scoreMediumAction(
  state: GameState,
  action: GameAction,
  player: PlayerId
): number {
  const result = applyAction(state, action);
  if (!result.ok) {
    return -WIN_SCORE;
  }

  if (result.state.winner === player) {
    return WIN_SCORE;
  }

  if (result.state.winner) {
    return -WIN_SCORE;
  }

  return (
    evaluateState(result.state, player) +
    getCapturePressure(state, action) * 2 +
    getDestinationPressure(state, action) * 0.25
  );
}

function scoreStrongAction(
  state: GameState,
  action: GameAction,
  player: PlayerId
): number {
  const result = applyAction(state, action);
  if (!result.ok) {
    return -WIN_SCORE;
  }

  if (result.state.winner === player) {
    return WIN_SCORE;
  }

  if (result.state.winner) {
    return -WIN_SCORE;
  }

  const replies = getLegalActions(result.state);
  if (replies.length === 0) {
    return evaluateState(result.state, player);
  }

  const worstReplyScore = Math.min(
    ...replies.map((reply) => {
      const replyResult = applyAction(result.state, reply);
      return replyResult.ok
        ? evaluateState(replyResult.state, player)
        : evaluateState(result.state, player);
    })
  );

  return worstReplyScore + scoreMediumAction(state, action, player) * 0.05;
}


function scoreVeryStrongAction(
  state: GameState,
  action: GameAction,
  player: PlayerId
): number {
  const result = applyAction(state, action);
  if (!result.ok) {
    return -WIN_SCORE;
  }

  if (result.state.winner === player) {
    return WIN_SCORE;
  }

  if (result.state.winner) {
    return -WIN_SCORE;
  }

  const replies = getLegalActions(result.state);
  if (replies.length === 0) {
    return evaluateState(result.state, player);
  }

  const worstReplyScore = Math.min(
    ...replies.map((reply) => {
      const replyResult = applyAction(result.state, reply);
      if (!replyResult.ok) {
        return evaluateState(result.state, player);
      }

      if (replyResult.state.winner && replyResult.state.winner !== player) {
        return -WIN_SCORE;
      }

      const followUps = getLegalActions(replyResult.state);
      if (followUps.length === 0) {
        return evaluateState(replyResult.state, player);
      }

      const bestFollowUp = Math.max(
        ...followUps.map((followUp) => scoreStrongAction(replyResult.state, followUp, player))
      );

      return bestFollowUp;
    })
  );

  return worstReplyScore + scoreStrongAction(state, action, player) * 0.03;
}

function chooseWeightedTopAction(
  scored: ScoredAction[],
  random: () => number
): GameAction {
  const sorted = [...scored].sort((left, right) => right.score - left.score);
  const topN = Math.min(3, sorted.length);
  const top = sorted.slice(0, topN);
  const weights = top.map((_, index) => topN - index);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const target = random() * total;

  let cumulative = 0;
  for (let index = 0; index < top.length; index += 1) {
    cumulative += weights[index];
    if (target <= cumulative) {
      return top[index].action;
    }
  }

  return top[top.length - 1].action;
}

function chooseHighestScored(scored: ScoredAction[]): ScoredAction {
  return [...scored].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return actionKey(left.action).localeCompare(actionKey(right.action));
  })[0];
}

function evaluateState(state: GameState, perspective: PlayerId): number {
  if (state.winner === perspective) {
    return WIN_SCORE;
  }

  if (state.winner) {
    return -WIN_SCORE;
  }

  return state.tokens.reduce((score, token) => {
    const direction = token.currentOwner === perspective ? 1 : -1;
    return score + direction * getTokenScore(token, state);
  }, 0);
}

function getTokenScore(token: QuantumToken, state: GameState): number {
  const expectedValue = getExpectedValue(token);
  if (token.location === "hand" || token.position === null) {
    return expectedValue * 0.85;
  }

  return expectedValue + getAdvancementScore(token, state);
}

function getExpectedValue(token: QuantumToken): number {
  const total = token.candidates.reduce(
    (sum, candidate) => sum + ANIMAL_VALUES[candidate],
    0
  );
  return total / Math.max(token.candidates.length, 1);
}

function getAdvancementScore(token: QuantumToken, state: GameState): number {
  if (token.position === null || state.definition.board.height <= 1) {
    return 0;
  }

  const player = state.definition.players.find(
    (definition) => definition.id === token.currentOwner
  );
  if (!player) {
    return 0;
  }

  const maxY = state.definition.board.height - 1;
  const progress =
    player.forwardY === 1
      ? token.position.y / maxY
      : (maxY - token.position.y) / maxY;

  return progress * 0.6;
}

function getCapturePressure(state: GameState, action: GameAction): number {
  if (action.type !== "move") {
    return 0;
  }

  const captured = getTokenAt(state, action.to);
  if (!captured || captured.currentOwner === state.turn) {
    return 0;
  }

  const kingPressure = captured.candidates.includes("king") ? 16 : 0;
  return getExpectedValue(captured) + kingPressure;
}

function getDestinationPressure(state: GameState, action: GameAction): number {
  const centerX = (state.definition.board.width - 1) / 2;
  const centerY = (state.definition.board.height - 1) / 2;
  const distance = Math.abs(action.to.x - centerX) + Math.abs(action.to.y - centerY);
  return state.definition.board.width + state.definition.board.height - distance;
}

function actionKey(action: GameAction): string {
  return `${action.type}:${action.tokenId}:${action.to.x},${action.to.y}`;
}
