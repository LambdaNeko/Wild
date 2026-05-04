import type {
  AnimalType,
  GameDefinition,
  GameState,
  InitialTokenDefinition,
  PlayerId,
  QuantumToken
} from "./types";

export function validateGameDefinition(definition: GameDefinition): void {
  const playerIds = new Set(definition.players.map((player) => player.id));
  if (playerIds.size !== definition.players.length) {
    throw new Error("プレイヤーIDが重複しています。");
  }

  const animalIds = new Set(definition.animals.map((animal) => animal.id));
  if (animalIds.size !== definition.animals.length) {
    throw new Error("動物IDが重複しています。");
  }

  const totalAnimalCount = definition.animals.reduce(
    (sum, animal) => sum + animal.count,
    0
  );

  for (const player of definition.players) {
    const setupCount = definition.initialSetup.filter(
      (token) => token.owner === player.id
    ).length;
    if (setupCount !== totalAnimalCount) {
      throw new Error(
        `${player.id} の初期配置数 ${setupCount} が動物枚数合計 ${totalAnimalCount} と一致しません。`
      );
    }
  }

  const occupied = new Set<string>();
  for (const token of definition.initialSetup) {
    assertValidInitialToken(definition, playerIds, token);
    const key = `${token.x},${token.y}`;
    if (occupied.has(key)) {
      throw new Error(`初期配置が重複しています: ${key}`);
    }
    occupied.add(key);
  }
}

function assertValidInitialToken(
  definition: GameDefinition,
  playerIds: Set<PlayerId>,
  token: InitialTokenDefinition
): void {
  if (!playerIds.has(token.owner)) {
    throw new Error(`未定義の所有者です: ${token.owner}`);
  }

  const inBounds =
    token.x >= 0 &&
    token.y >= 0 &&
    token.x < definition.board.width &&
    token.y < definition.board.height;

  if (!inBounds) {
    throw new Error(`初期配置が盤外です: ${token.x},${token.y}`);
  }
}

export function createInitialState(definition: GameDefinition): GameState {
  validateGameDefinition(definition);
  const candidates = definition.animals.map((animal) => animal.id);
  const tokens = definition.initialSetup.map((token, index) =>
    createToken(token, index, candidates)
  );

  return {
    definition,
    turn: definition.players[0].id,
    tokens,
    winner: null,
    moveHistory: []
  };
}

function createToken(
  token: InitialTokenDefinition,
  index: number,
  candidates: AnimalType[]
): QuantumToken {
  return {
    id: `${token.owner}-${index + 1}`,
    originalSide: token.owner,
    currentOwner: token.owner,
    position: { x: token.x, y: token.y },
    location: "board",
    candidates: [...candidates],
    promoted: false
  };
}
