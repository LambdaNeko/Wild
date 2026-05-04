import type {
  AnimalDefinition,
  AnimalType,
  GameState,
  PlayerDefinition,
  Position,
  QuantumToken
} from "./types";

export function getAnimalDefinition(
  state: GameState,
  animalId: AnimalType
): AnimalDefinition {
  const animal = state.definition.animals.find((item) => item.id === animalId);
  if (!animal) {
    throw new Error(`未定義の動物です: ${animalId}`);
  }
  return animal;
}

export function getPlayerDefinition(
  state: GameState,
  playerId: string
): PlayerDefinition {
  const player = state.definition.players.find((item) => item.id === playerId);
  if (!player) {
    throw new Error(`未定義のプレイヤーです: ${playerId}`);
  }
  return player;
}

export function isInBounds(state: GameState, position: Position): boolean {
  return (
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < state.definition.board.width &&
    position.y < state.definition.board.height
  );
}

export function positionsEqual(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

export function getTokenAt(
  state: GameState,
  position: Position
): QuantumToken | undefined {
  return state.tokens.find(
    (token) =>
      token.location === "board" &&
      token.position !== null &&
      positionsEqual(token.position, position)
  );
}

export function getBoardTokenById(
  state: GameState,
  tokenId: string
): QuantumToken | undefined {
  return state.tokens.find(
    (token) => token.id === tokenId && token.location === "board"
  );
}

export function getNextPlayer(state: GameState): "A" | "B" {
  const index = state.definition.players.findIndex(
    (player) => player.id === state.turn
  );
  const next = state.definition.players[(index + 1) % state.definition.players.length];
  return next.id;
}
