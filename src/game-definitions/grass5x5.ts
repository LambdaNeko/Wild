import type {
  AnimalDefinition,
  AnimalType,
  GameDefinition,
  InitialTokenDefinition
} from "../domain/types";

const allAnimals: Record<AnimalType, AnimalDefinition> = {
  king: {
    id: "king",
    displayName: "ライオン",
    icon: "👑",
    count: 1,
    movement: {
      type: "step",
      directions: [
        "forward",
        "backward",
        "left",
        "right",
        "forwardLeft",
        "forwardRight",
        "backwardLeft",
        "backwardRight"
      ],
      maxDistance: 1
    }
  },
  wolf: {
    id: "wolf",
    displayName: "オオカミ",
    icon: "🐺",
    count: 1,
    movement: {
      type: "slide",
      directions: ["forward", "backward", "left", "right"]
    }
  },
  owl: {
    id: "owl",
    displayName: "フクロウ",
    icon: "🦉",
    count: 1,
    movement: {
      type: "slide",
      directions: [
        "forwardLeft",
        "forwardRight",
        "backwardLeft",
        "backwardRight"
      ]
    }
  },
  deer: {
    id: "deer",
    displayName: "シカ",
    icon: "🦌",
    count: 1,
    movement: {
      type: "step",
      directions: [
        "forward",
        "left",
        "right",
        "backward",
        "forwardLeft",
        "forwardRight"
      ],
      maxDistance: 1
    }
  },
  fox: {
    id: "fox",
    displayName: "キツネ",
    icon: "🦊",
    count: 1,
    movement: {
      type: "step",
      directions: [
        "forward",
        "forwardLeft",
        "forwardRight",
        "backwardLeft",
        "backwardRight"
      ],
      maxDistance: 1
    }
  },
  frog: {
    id: "frog",
    displayName: "カエル",
    icon: "🐸",
    count: 1,
    movement: {
      type: "jump",
      offsets: [
        { dx: -1, dy: 2 },
        { dx: 1, dy: 2 }
      ]
    }
  },
  snake: {
    id: "snake",
    displayName: "ヘビ",
    icon: "🐍",
    count: 1,
    movement: {
      type: "slide",
      directions: ["forward"]
    }
  },
  rabbit: {
    id: "rabbit",
    displayName: "ウサギ",
    icon: "🐰",
    count: 1,
    movement: {
      type: "step",
      directions: ["forward"],
      maxDistance: 1
    }
  }
};

type StageConfig = {
  id: string;
  name: string;
  width: number;
  height: number;
  animalIds: AnimalType[];
  rowsB: number[][];
  rowsA: number[][];
};

function createStage({
  id,
  name,
  width,
  height,
  animalIds,
  rowsB,
  rowsA
}: StageConfig): GameDefinition {
  return {
    id,
    name,
    board: { width, height },
    players: [
      { id: "A", forwardY: -1 },
      { id: "B", forwardY: 1 }
    ],
    animals: animalIds.map((animalId) => ({ ...allAnimals[animalId] })),
    initialSetup: [
      ...createSetupRows("B", rowsB, 0),
      ...createSetupRows("A", rowsA, height - rowsA.length)
    ]
  };
}

function createSetupRows(
  owner: "A" | "B",
  rows: number[][],
  startY: number
): InitialTokenDefinition[] {
  return rows.flatMap((row, rowIndex) =>
    row.map((x) => ({
      owner,
      x,
      y: startY + rowIndex
    }))
  );
}

export const gameDefinitions: GameDefinition[] = [
  createStage({
    id: "stage-01-sprout-3x4",
    name: "ステージ 1 こもれび 3x4",
    width: 3,
    height: 4,
    animalIds: ["king", "deer", "rabbit"],
    rowsB: [[0, 1], [1]],
    rowsA: [[1], [1, 2]]
  }),
  createStage({
    id: "stage-02-brook-4x4",
    name: "ステージ 2 小川 4x4",
    width: 4,
    height: 4,
    animalIds: ["king", "fox", "rabbit", "snake"],
    rowsB: [[0, 1, 2], [1]],
    rowsA: [[2], [1, 2, 3]]
  }),
  createStage({
    id: "stage-03-thicket-4x5",
    name: "ステージ 3 茂み 4x5",
    width: 4,
    height: 5,
    animalIds: ["king", "deer", "fox", "frog", "rabbit"],
    rowsB: [[0, 1, 2], [1, 2]],
    rowsA: [[1, 2], [1, 2, 3]]
  }),
  createStage({
    id: "stage-04-grass-5x5",
    name: "ステージ 4 草原 5x5",
    width: 5,
    height: 5,
    animalIds: ["king", "wolf", "owl", "deer", "fox", "frog", "snake", "rabbit"],
    rowsB: [[0, 1, 2, 3, 4], [1, 2, 3]],
    rowsA: [[1, 2, 3], [0, 1, 2, 3, 4]]
  }),
  createStage({
    id: "stage-05-ridge-5x6",
    name: "ステージ 5 丘陵 5x6",
    width: 5,
    height: 6,
    animalIds: ["king", "wolf", "deer", "fox", "frog", "snake"],
    rowsB: [[1, 2, 3], [0, 2, 4]],
    rowsA: [[0, 2, 4], [1, 2, 3]]
  }),
  createStage({
    id: "stage-06-grove-6x5",
    name: "ステージ 6 木立 6x5",
    width: 6,
    height: 5,
    animalIds: ["king", "wolf", "owl", "fox", "snake", "rabbit"],
    rowsB: [[1, 2, 3, 4], [1, 3]],
    rowsA: [[2, 4], [1, 2, 3, 4]]
  }),
  createStage({
    id: "stage-07-marsh-6x6",
    name: "ステージ 7 湿地 6x6",
    width: 6,
    height: 6,
    animalIds: ["king", "owl", "deer", "fox", "frog", "snake", "rabbit"],
    rowsB: [[1, 2, 3, 4], [0, 2, 5]],
    rowsA: [[0, 3, 5], [1, 2, 3, 4]]
  }),
  createStage({
    id: "stage-08-canyon-7x6",
    name: "ステージ 8 渓谷 7x6",
    width: 7,
    height: 6,
    animalIds: ["king", "wolf", "owl", "deer", "fox", "frog", "snake"],
    rowsB: [[1, 2, 3, 4], [0, 3, 6]],
    rowsA: [[0, 3, 6], [2, 3, 4, 5]]
  }),
  createStage({
    id: "stage-09-forest-7x7",
    name: "ステージ 9 深林 7x7",
    width: 7,
    height: 7,
    animalIds: ["king", "wolf", "owl", "deer", "fox", "frog", "snake", "rabbit"],
    rowsB: [[1, 2, 3, 4, 5], [1, 3, 5]],
    rowsA: [[1, 3, 5], [1, 2, 3, 4, 5]]
  }),
  createStage({
    id: "stage-10-wild-8x7",
    name: "ステージ 10 大草原 8x7",
    width: 8,
    height: 7,
    animalIds: ["king", "wolf", "owl", "deer", "fox", "frog", "snake", "rabbit"],
    rowsB: [[1, 2, 3, 4], [0, 2, 5], [6]],
    rowsA: [[1], [2, 5, 7], [3, 4, 5, 6]]
  })
];

export const defaultGameDefinition = gameDefinitions[3];
