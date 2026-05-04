import type { GameDefinition } from "../domain/types";

export const defaultGameDefinition: GameDefinition = {
  id: "grass-quantum-shogi-5x5",
  name: "草むら量子将棋 5x5",
  board: {
    width: 5,
    height: 5
  },
  players: [
    { id: "A", forwardY: -1 },
    { id: "B", forwardY: 1 }
  ],
  animals: [
    {
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
    {
      id: "wolf",
      displayName: "オオカミ",
      icon: "🐺",
      count: 1,
      movement: {
        type: "slide",
        directions: ["forward", "backward", "left", "right"]
      }
    },
    {
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
    {
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
    {
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
    {
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
    {
      id: "snake",
      displayName: "ヘビ",
      icon: "🐍",
      count: 1,
      movement: {
        type: "slide",
        directions: ["forward"]
      }
    },
    {
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
  ],
  initialSetup: [
    { owner: "B", x: 0, y: 0 },
    { owner: "B", x: 1, y: 0 },
    { owner: "B", x: 2, y: 0 },
    { owner: "B", x: 3, y: 0 },
    { owner: "B", x: 4, y: 0 },
    { owner: "B", x: 1, y: 1 },
    { owner: "B", x: 2, y: 1 },
    { owner: "B", x: 3, y: 1 },
    { owner: "A", x: 1, y: 3 },
    { owner: "A", x: 2, y: 3 },
    { owner: "A", x: 3, y: 3 },
    { owner: "A", x: 0, y: 4 },
    { owner: "A", x: 1, y: 4 },
    { owner: "A", x: 2, y: 4 },
    { owner: "A", x: 3, y: 4 },
    { owner: "A", x: 4, y: 4 }
  ]
};
