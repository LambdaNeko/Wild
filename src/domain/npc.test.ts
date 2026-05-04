import { describe, expect, it } from "vitest";
import { defaultGameDefinition } from "../game-definitions/grass5x5";
import { applyAction } from "./rules";
import { createInitialState } from "./setup";
import type { AnimalType, GameState } from "./types";
import { chooseNpcAction, getLegalActions } from "./npc";

const allCandidates = defaultGameDefinition.animals.map((animal) => animal.id);

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

  it("弱NPCは乱数で合法手を選ぶ", () => {
    const state = createInitialState(defaultGameDefinition);
    const actions = getLegalActions(state);

    expect(chooseNpcAction(state, "weak", () => 0)).toEqual(actions[0]);
    expect(chooseNpcAction(state, "weak", () => 0.999)).toEqual(
      actions[actions.length - 1]
    );
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

  it("強NPCは相手の即勝利を避ける", () => {
    const state = emptyBoardState();
    const prepared: GameState = {
      ...state,
      turn: "B",
      tokens: state.tokens.map((token) => {
        if (token.id === "B-1") {
          return {
            ...token,
            location: "board",
            position: { x: 2, y: 2 },
            candidates: ["king"] satisfies AnimalType[]
          };
        }
        if (token.id === "B-2") {
          return {
            ...token,
            location: "board",
            position: { x: 4, y: 3 },
            candidates: ["rabbit"] satisfies AnimalType[]
          };
        }
        if (token.originalSide === "B") {
          return {
            ...token,
            currentOwner: "A"
          };
        }
        if (token.id === "A-9") {
          return {
            ...token,
            location: "board",
            position: { x: 2, y: 0 },
            candidates: ["wolf"] satisfies AnimalType[]
          };
        }
        if (token.id === "A-10") {
          return {
            ...token,
            candidates: ["king"] satisfies AnimalType[]
          };
        }
        return {
          ...token,
          candidates: allCandidates.filter((candidate) => candidate !== "king")
        };
      })
    };

    const action = chooseNpcAction(prepared, "strong");

    expect(action?.tokenId).toBe("B-1");
    expect(action).not.toEqual({
      type: "move",
      tokenId: "B-1",
      to: { x: 2, y: 1 }
    });
    if (!action) return;
    const result = applyAction(prepared, action);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const opponentWin = getLegalActions(result.state).some((reply) => {
      const replyResult = applyAction(result.state, reply);
      return replyResult.ok && replyResult.state.winner === "A";
    });
    expect(opponentWin).toBe(false);
  });
});
