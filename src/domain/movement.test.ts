import { describe, expect, it } from "vitest";
import { defaultGameDefinition } from "../game-definitions/grass5x5";
import { createInitialState } from "./setup";
import { canMoveAs } from "./movement";
import type { GameState, Position } from "./types";

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

function stateWithBlocker(position: Position): GameState {
  const state = emptyBoardState();
  return {
    ...state,
    tokens: state.tokens.map((token, index) =>
      index === 0
        ? {
            ...token,
            location: "board",
            position
          }
        : token
    )
  };
}

describe("canMoveAs", () => {
  it("ライオンは1マス動ける", () => {
    const state = emptyBoardState();
    expect(canMoveAs("king", { x: 2, y: 2 }, { x: 3, y: 3 }, "A", state)).toBe(
      true
    );
  });

  it("オオカミは縦横に動ける", () => {
    const state = emptyBoardState();
    expect(canMoveAs("wolf", { x: 0, y: 2 }, { x: 4, y: 2 }, "A", state)).toBe(
      true
    );
  });

  it("フクロウは斜めに動ける", () => {
    const state = emptyBoardState();
    expect(canMoveAs("owl", { x: 0, y: 2 }, { x: 2, y: 4 }, "A", state)).toBe(
      true
    );
  });

  it("カエルは桂馬移動できる", () => {
    const state = emptyBoardState();
    expect(canMoveAs("frog", { x: 2, y: 4 }, { x: 1, y: 2 }, "A", state)).toBe(
      true
    );
    expect(canMoveAs("frog", { x: 2, y: 0 }, { x: 3, y: 2 }, "B", state)).toBe(
      true
    );
  });

  it("ヘビは前方直線に動ける", () => {
    const state = emptyBoardState();
    expect(canMoveAs("snake", { x: 4, y: 4 }, { x: 4, y: 1 }, "A", state)).toBe(
      true
    );
  });

  it("ウサギは前方1マスだけ動ける", () => {
    const state = emptyBoardState();
    expect(canMoveAs("rabbit", { x: 2, y: 4 }, { x: 2, y: 3 }, "A", state)).toBe(
      true
    );
    expect(canMoveAs("rabbit", { x: 2, y: 4 }, { x: 2, y: 2 }, "A", state)).toBe(
      false
    );
  });

  it("味方駒のいるマスには移動できない", () => {
    const state = createInitialState(defaultGameDefinition);
    expect(canMoveAs("king", { x: 2, y: 4 }, { x: 2, y: 3 }, "A", state)).toBe(
      false
    );
  });

  it("飛び道具は途中の駒を越えられない", () => {
    const state = stateWithBlocker({ x: 2, y: 2 });
    expect(canMoveAs("wolf", { x: 2, y: 4 }, { x: 2, y: 0 }, "A", state)).toBe(
      false
    );
  });
});
