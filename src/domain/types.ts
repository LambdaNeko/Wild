export type PlayerId = "A" | "B";

export type AnimalType =
  | "king"
  | "wolf"
  | "owl"
  | "deer"
  | "fox"
  | "frog"
  | "snake"
  | "rabbit";

export type Direction =
  | "forward"
  | "backward"
  | "left"
  | "right"
  | "forwardLeft"
  | "forwardRight"
  | "backwardLeft"
  | "backwardRight";

export type Offset = {
  dx: number;
  dy: number;
};

export type MovementDefinition =
  | {
      type: "step";
      directions: Direction[];
      maxDistance: number;
    }
  | {
      type: "slide";
      directions: Direction[];
    }
  | {
      type: "jump";
      offsets: Offset[];
    };

export type PlayerDefinition = {
  id: PlayerId;
  forwardY: 1 | -1;
};

export type AnimalDefinition = {
  id: AnimalType;
  displayName: string;
  icon: string;
  count: number;
  movement: MovementDefinition;
  canPromote?: boolean;
  promotedMovement?: MovementDefinition;
};

export type InitialTokenDefinition = {
  owner: PlayerId;
  x: number;
  y: number;
};

export type PromotionDefinition = {
  zoneRows: number;
};

export type GameDefinition = {
  id: string;
  name: string;
  board: {
    width: number;
    height: number;
  };
  players: PlayerDefinition[];
  animals: AnimalDefinition[];
  initialSetup: InitialTokenDefinition[];
  promotion?: PromotionDefinition;
};

export type Position = {
  x: number;
  y: number;
};

export type TokenLocation = "board" | "hand";

export type QuantumToken = {
  id: string;
  originalSide: PlayerId;
  currentOwner: PlayerId;
  position: Position | null;
  location: TokenLocation;
  candidates: AnimalType[];
  promoted: boolean;
};

export type MoveAction = {
  type: "move";
  tokenId: string;
  to: Position;
  promote?: boolean;
};

export type DropAction = {
  type: "drop";
  tokenId: string;
  to: Position;
};

export type GameAction = MoveAction | DropAction;

export type MoveRecord = {
  action: GameAction;
  from: Position | null;
  capturedTokenId?: string;
  narrowedTo?: AnimalType[];
};

export type GameState = {
  definition: GameDefinition;
  turn: PlayerId;
  tokens: QuantumToken[];
  winner: PlayerId | null;
  moveHistory: MoveRecord[];
};

export type MoveResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: string };
