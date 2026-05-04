import { propagateGlobalConstraints } from "./constraints";
import { canMoveAs } from "./movement";
import {
  getBoardTokenById,
  getNextPlayer,
  getTokenAt
} from "./selectors";
import type {
  AnimalType,
  DropAction,
  GameAction,
  GameState,
  MoveAction,
  MoveResult,
  PlayerId,
  Position,
  QuantumToken
} from "./types";

export function getLegalMovesForToken(
  state: GameState,
  tokenId: string
): Position[] {
  const token = getBoardTokenById(state, tokenId);
  if (!token || token.currentOwner !== state.turn || token.position === null) {
    return [];
  }

  const moves: Position[] = [];
  for (let y = 0; y < state.definition.board.height; y += 1) {
    for (let x = 0; x < state.definition.board.width; x += 1) {
      const to = { x, y };
      if (applyMove(state, { type: "move", tokenId, to }).ok) {
        moves.push(to);
      }
    }
  }
  return moves;
}

export function getLegalDropsForToken(
  state: GameState,
  tokenId: string
): Position[] {
  const token = state.tokens.find((item) => item.id === tokenId);
  if (!token || token.location !== "hand" || token.currentOwner !== state.turn) {
    return [];
  }

  const drops: Position[] = [];
  for (let y = 0; y < state.definition.board.height; y += 1) {
    for (let x = 0; x < state.definition.board.width; x += 1) {
      const to = { x, y };
      if (applyDrop(state, { type: "drop", tokenId, to }).ok) {
        drops.push(to);
      }
    }
  }
  return drops;
}

export function applyAction(state: GameState, action: GameAction): MoveResult {
  if (action.type === "drop") {
    return applyDrop(state, action);
  }
  return applyMove(state, action);
}

export function applyDrop(state: GameState, action: DropAction): MoveResult {
  if (state.winner) {
    return { ok: false, reason: "すでに勝敗が決まっています。" };
  }

  const droppingToken = state.tokens.find((token) => token.id === action.tokenId);
  if (!droppingToken || droppingToken.location !== "hand") {
    return { ok: false, reason: "持ち駒ではありません。" };
  }

  if (droppingToken.currentOwner !== state.turn) {
    return { ok: false, reason: "現在の手番の持ち駒ではありません。" };
  }

  const occupiedToken = getTokenAt(state, action.to);
  const inBounds =
    action.to.x >= 0 &&
    action.to.y >= 0 &&
    action.to.x < state.definition.board.width &&
    action.to.y < state.definition.board.height;
  if (!inBounds) {
    return { ok: false, reason: "盤外には打てません。" };
  }
  if (occupiedToken) {
    return { ok: false, reason: "駒のあるマスには打てません。" };
  }

  const droppedState: GameState = {
    ...state,
    turn: getNextPlayer(state),
    tokens: state.tokens.map((token) =>
      token.id === droppingToken.id
        ? {
            ...token,
            location: "board" as const,
            position: { ...action.to }
          }
        : token
    ),
    moveHistory: [
      ...state.moveHistory,
      {
        action,
        from: null
      }
    ]
  };

  const constrainedState = propagateGlobalConstraints(droppedState);
  const resolvedState = resolveWinnerByKingCandidates(constrainedState);
  const violation = getConstraintViolation(resolvedState);
  if (violation) {
    return { ok: false, reason: violation };
  }

  return { ok: true, state: resolvedState };
}

export function applyMove(state: GameState, action: MoveAction): MoveResult {
  if (state.winner) {
    return { ok: false, reason: "すでに勝敗が決まっています。" };
  }

  const movingToken = getBoardTokenById(state, action.tokenId);
  if (!movingToken || movingToken.position === null) {
    return { ok: false, reason: "盤上の駒ではありません。" };
  }

  if (movingToken.currentOwner !== state.turn) {
    return { ok: false, reason: "現在の手番の駒ではありません。" };
  }

  const from = movingToken.position;
  const narrowed = narrowCandidatesByMove(movingToken, from, action.to, state);
  if (narrowed.length === 0) {
    return { ok: false, reason: "その移動はできません。" };
  }

  const capturedToken = getTokenAt(state, action.to);
  let winner: PlayerId | null = state.winner;
  const nextTokens = state.tokens.map((token) => {
    if (token.id === movingToken.id) {
      return {
        ...token,
        position: { ...action.to },
        candidates: narrowed
      };
    }

    if (capturedToken && token.id === capturedToken.id) {
      if (
        capturedToken.candidates.length === 1 &&
        capturedToken.candidates[0] === "king"
      ) {
        winner = movingToken.currentOwner;
      }

      return {
        ...token,
        currentOwner: movingToken.currentOwner,
        location: "hand" as const,
        position: null,
        candidates: capturedToken.candidates.filter((candidate) => candidate !== "king")
      };
    }

    return token;
  });

  const movedState: GameState = {
    ...state,
    winner,
    turn: winner ? state.turn : getNextPlayer(state),
    tokens: nextTokens,
    moveHistory: [
      ...state.moveHistory,
      {
        action,
        from: { ...from },
        capturedTokenId: capturedToken?.id,
        narrowedTo: narrowed
      }
    ]
  };

  const constrainedState = propagateGlobalConstraints(movedState);
  const resolvedState = resolveWinnerByKingCandidates(constrainedState);
  if (resolvedState.winner) {
    return { ok: true, state: resolvedState };
  }

  const violation = getConstraintViolation(resolvedState);
  if (violation) {
    return { ok: false, reason: violation };
  }

  return { ok: true, state: resolvedState };
}

export function narrowCandidatesByMove(
  token: QuantumToken,
  from: Position,
  to: Position,
  state: GameState
): AnimalType[] {
  return token.candidates.filter((animal) =>
    canMoveAs(animal, from, to, token.currentOwner, state)
  );
}

export function resolveWinnerByKingCandidates(state: GameState): GameState {
  if (state.winner) {
    return state;
  }

  const eliminatedPlayer = state.definition.players.find(
    (player) =>
      !state.tokens.some(
        (token) =>
          token.originalSide === player.id && token.candidates.includes("king")
      )
  );

  if (!eliminatedPlayer) {
    return state;
  }

  const winner = state.definition.players.find(
    (player) => player.id !== eliminatedPlayer.id
  )?.id;

  return winner ? { ...state, winner, turn: state.turn } : state;
}

function getConstraintViolation(state: GameState): string | null {
  for (const token of state.tokens) {
    if (token.candidates.length === 0) {
      return "候補がゼロになる手は指せません。";
    }
  }

  for (const player of state.definition.players) {
    const originalTokens = state.tokens.filter(
      (token) => token.originalSide === player.id
    );

    for (const animal of state.definition.animals) {
      const fixedCount = originalTokens.filter(
        (token) => token.candidates.length === 1 && token.candidates[0] === animal.id
      ).length;
      if (fixedCount > animal.count) {
        return `${player.id} の ${animal.displayName} が枚数上限を超えます。`;
      }

      const possibleCount = originalTokens.filter((token) =>
        token.candidates.includes(animal.id)
      ).length;
      if (possibleCount < animal.count) {
        return `${player.id} の ${animal.displayName} 候補が不足します。`;
      }
    }
  }

  return null;
}
