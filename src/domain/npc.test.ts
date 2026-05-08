import { describe, expect, it } from "vitest";
import { defaultGameDefinition } from "../game-definitions/grass5x5";
import { createInitialState } from "./setup";
import type { AnimalType, GameState } from "./types";
import { chooseNpcAction, getLegalActions } from "./npc";

function emptyBoardState(): GameState {
  const state = createInitialState(defaultGameDefinition);
  return {
    ...state,
    tokens: state.tokens.map((token) => ({
      ...token,
      location: "hand",
      position: null
    }))
  };
}

describe("NPC actions", () => {
  it("現在手番の合法手だけを列挙する", () => {
    const state = createInitialState(defaultGameDefinition);
    const actions = getLegalActions(state);

    expect(actions.length).toBeGreaterThan(0);
    expect(actions.every((action) => action.tokenId.startsWith("A-"))).toBe(true);
  });

  it("弱NPCは上位候補から重み付きランダムで選ぶ", () => {
    const state = createInitialState(defaultGameDefinition);
    const actions = getLegalActions(state);

    const firstPick = chooseNpcAction(state, "weak", () => 0);
    const lastWeightedPick = chooseNpcAction(state, "weak", () => 0.999);

    expect(firstPick).not.toBeNull();
    expect(lastWeightedPick).not.toBeNull();
    if (!firstPick || !lastWeightedPick) return;

    expect(actions).toContainEqual(firstPick);
    expect(actions).toContainEqual(lastWeightedPick);
  });

  it("中NPCは即勝利できる手を優先する", () => {
    const state = emptyBoardState();
    const prepared: GameState = {
      ...state,
      turn: "B",
      tokens: state.tokens.map((token) => {
        if (token.id === "B-1") {
          return {
            ...token,
            location: "board",
            position: { x: 0, y: 0 },
            candidates: ["king"] satisfies AnimalType[]
          };
        }
        if (token.id === "A-9") {
          return {
            ...token,
            location: "board",
            position: { x: 0, y: 1 },
            candidates: ["king"] satisfies AnimalType[]
          };
        }
        return token;
      })
    };

    const action = chooseNpcAction(prepared, "medium");

    expect(action).toEqual({
      type: "move",
      tokenId: "B-1",
      to: { x: 0, y: 1 }
    });
  });

  it("強NPCは勝てる局面で即勝利手を選ぶ", () => {
    const state = emptyBoardState();
    const prepared: GameState = {
      ...state,
      turn: "B",
      tokens: state.tokens.map((token) => {
        if (token.id === "B-1") {
          return {
            ...token,
            location: "board",
            position: { x: 1, y: 0 },
            candidates: ["king"] satisfies AnimalType[]
          };
        }
        if (token.id === "A-9") {
          return {
            ...token,
            location: "board",
            position: { x: 1, y: 1 },
            candidates: ["king"] satisfies AnimalType[]
          };
        }
        return token;
      })
    };

    const action = chooseNpcAction(prepared, "strong");

    expect(action).toEqual({
      type: "move",
      tokenId: "B-1",
      to: { x: 1, y: 1 }
    });
  });

  it("強NPCは持ち駒が多い局面でも合法手を返す", () => {
    const state = emptyBoardState();
    const prepared: GameState = {
      ...state,
      turn: "B",
      tokens: state.tokens.map((token) => {
        if (token.id === "B-1") {
          return {
            ...token,
            location: "board",
            position: { x: 2, y: 0 },
            candidates: ["king"] satisfies AnimalType[]
          };
        }
        if (token.id === "A-9") {
          return {
            ...token,
            location: "board",
            position: { x: 2, y: 4 },
            candidates: ["king"] satisfies AnimalType[]
          };
        }
        return token;
      })
    };
    const legalActions = getLegalActions(prepared);

    const action = chooseNpcAction(prepared, "strong");

    expect(action).not.toBeNull();
    expect(legalActions).toContainEqual(action);
  });

});
