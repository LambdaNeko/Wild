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

type SearchLimits = {
  root: number;
  replies: number;
  followUps: number;
};

const WIN_SCORE = 100_000;
const SEARCH_LIMITS: Record<Exclude<NpcStrength, "weak">, SearchLimits> = {
  medium: {
    root: 18,
    replies: 6,
    followUps: 0
  },
  strong: {
    root: 12,
    replies: 6,
    followUps: 4
  }
};

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
  if (strength !== "weak") {
    const winningAction = findWinningAction(state, actions, player);
    if (winningAction) {
      return winningAction;
    }
  }

  const scored = scoreActionsByStrength(state, actions, player, strength);

  if (strength === "weak") {
    return chooseWeightedTopAction(scored, random);
  }

  return chooseHighestScored(scored).action;
}

function findWinningAction(
  state: GameState,
  actions: GameAction[],
  player: PlayerId
): GameAction | null {
  for (const action of actions) {
    if (action.type !== "move") {
      continue;
    }

    const captured = getTokenAt(state, action.to);
    if (
      !captured ||
      captured.currentOwner === player ||
      !captured.candidates.includes("king")
    ) {
      continue;
    }

    const result = applyAction(state, action);
    if (result.ok && result.state.winner === player) {
      return action;
    }
  }

  return null;
}

function scoreActionsByStrength(
  state: GameState,
  actions: GameAction[],
  player: PlayerId,
  strength: NpcStrength
): ScoredAction[] {
  if (strength === "weak") {
    return actions.map((action) => ({
      action,
      score: scoreTacticalAction(state, action, player)
    }));
  }

  const limits = SEARCH_LIMITS[strength];
  return selectLikelyActions(state, actions, limits.root).map((action) =>
    scoreSearchAction(state, action, player, limits)
  );
}

function scoreSearchAction(
  state: GameState,
  action: GameAction,
  player: PlayerId,
  limits: SearchLimits
): ScoredAction {
  const result = applyAction(state, action);
  if (!result.ok) {
    return { action, score: -WIN_SCORE };
  }

  if (result.state.winner === player) {
    return { action, score: WIN_SCORE };
  }

  if (result.state.winner) {
    return { action, score: -WIN_SCORE };
  }

  const tacticalScore = scoreTacticalResult(state, action, result.state, player);
  const replies = getLikelyActions(result.state, limits.replies);
  if (replies.length === 0) {
    return { action, score: evaluateState(result.state, player) };
  }

  const worstReplyScore = Math.min(
    ...replies.map(({ action: reply }) => {
      const replyResult = applyAction(result.state, reply);
      if (!replyResult.ok) {
        return evaluateState(result.state, player);
      }

      if (replyResult.state.winner === player) {
        return WIN_SCORE;
      }

      if (replyResult.state.winner) {
        return -WIN_SCORE;
      }

      return scoreBestFollowUp(replyResult.state, player, limits.followUps);
    })
  );

  return {
    action,
    score: worstReplyScore + tacticalScore * 0.08
  };
}

function scoreBestFollowUp(
  state: GameState,
  player: PlayerId,
  limit: number
): number {
  const followUps = getLikelyActions(state, limit);
  if (followUps.length === 0) {
    return evaluateState(state, player);
  }

  return Math.max(
    ...followUps.map(({ action }) => scoreTacticalAction(state, action, player))
  );
}

function getLikelyActions(state: GameState, limit: number): ScoredAction[] {
  if (limit <= 0) {
    return [];
  }

  const player = state.turn;
  return sortScoredActions(
    selectLikelyActions(state, getLegalActions(state), limit).map((action) => ({
      action,
      score: scoreTacticalAction(state, action, player)
    }))
  );
}

function selectLikelyActions(
  state: GameState,
  actions: GameAction[],
  limit: number
): GameAction[] {
  return sortScoredActions(
    actions.map((action) => ({
      action,
      score: scoreStaticAction(state, action, state.turn)
    }))
  )
    .slice(0, limit)
    .map((scored) => scored.action);
}

function scoreTacticalAction(
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

  return scoreTacticalResult(state, action, result.state, player);
}

function scoreTacticalResult(
  previousState: GameState,
  action: GameAction,
  nextState: GameState,
  player: PlayerId
): number {
  return (
    evaluateState(nextState, player) +
    getCapturePressure(previousState, action) * 2 +
    getDestinationPressure(previousState, action) * 0.25
  );
}

function scoreStaticAction(
  state: GameState,
  action: GameAction,
  player: PlayerId
): number {
  const token = state.tokens.find((item) => item.id === action.tokenId);
  const tokenValue = token ? getExpectedValue(token) : 0;
  const capturePressure = getCapturePressure(state, action);
  const destinationPressure = getDestinationPressure(state, action);
  const advancementPressure = getActionAdvancementPressure(state, action, player);

  return (
    tokenValue * 0.15 +
    capturePressure * 3 +
    destinationPressure * 0.2 +
    advancementPressure * 0.8 +
    (action.type === "drop" ? 0.4 : 0)
  );
}

function getActionAdvancementPressure(
  state: GameState,
  action: GameAction,
  playerId: PlayerId
): number {
  if (state.definition.board.height <= 1) {
    return 0;
  }

  const player = state.definition.players.find(
    (definition) => definition.id === playerId
  );
  if (!player) {
    return 0;
  }

  const maxY = state.definition.board.height - 1;
  return player.forwardY === 1 ? action.to.y / maxY : (maxY - action.to.y) / maxY;
}

function chooseWeightedTopAction(
  scored: ScoredAction[],
  random: () => number
): GameAction {
  const sorted = sortScoredActions(scored);
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
  return sortScoredActions(scored)[0];
}

function sortScoredActions(scored: ScoredAction[]): ScoredAction[] {
  return [...scored].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return actionKey(left.action).localeCompare(actionKey(right.action));
  });
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
