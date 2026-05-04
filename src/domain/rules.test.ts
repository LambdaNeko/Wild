import { describe, expect, it } from "vitest";
import { defaultGameDefinition } from "../game-definitions/grass5x5";
import { propagateGlobalConstraints } from "./constraints";
import {
  applyAction,
  getLegalDropsForToken,
  getLegalMovesForToken,
  narrowCandidatesByMove
} from "./rules";
import { createInitialState } from "./setup";
import type { GameState } from "./types";

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

describe("candidate narrowing", () => {
  it("ウサギ的に動くとウサギ候補が残る", () => {
    const state = emptyBoardState();
    const token = state.tokens.find((item) => item.id === "A-14")!;
    const boardToken = { ...token, location: "board" as const, position: { x: 2, y: 4 } };
    const boardState = {
      ...state,
      tokens: state.tokens.map((item) => (item.id === token.id ? boardToken : item))
    };

    const candidates = narrowCandidatesByMove(
      boardToken,
      boardToken.position!,
      { x: 2, y: 3 },
      boardState
    );

    expect(candidates).toContain("rabbit");
  });

  it("斜め長距離移動でフクロウ候補だけ残る", () => {
    const state = emptyBoardState();
    const token = state.tokens.find((item) => item.id === "A-12")!;
    const boardToken = { ...token, location: "board" as const, position: { x: 0, y: 4 } };
    const boardState = {
      ...state,
      tokens: state.tokens.map((item) => (item.id === token.id ? boardToken : item))
    };

    const candidates = narrowCandidatesByMove(
      boardToken,
      boardToken.position!,
      { x: 2, y: 2 },
      boardState
    );

    expect(candidates).toEqual(["owl"]);
  });

  it("候補が0になる手は拒否される", () => {
    const state = emptyBoardState();
    const result = applyAction(state, {
      type: "move",
      tokenId: "A-14",
      to: { x: 4, y: 0 }
    });

    expect(result.ok).toBe(false);
  });
});

describe("global constraints", () => {
  it("確定上限に達した動物は同じoriginalSideの他駒から消える", () => {
    const state = createInitialState(defaultGameDefinition);
    const constrained: GameState = {
      ...state,
      tokens: state.tokens.map((token) =>
        token.id === "A-9" ? { ...token, candidates: ["wolf"] } : token
      )
    };

    const next = propagateGlobalConstraints(constrained);

    expect(next.tokens.find((token) => token.id === "A-10")!.candidates).not.toContain(
      "wolf"
    );
    expect(next.tokens.find((token) => token.id === "B-1")!.candidates).toContain(
      "wolf"
    );
  });

  it("捕獲後もoriginalSide基準で制約が働く", () => {
    const state = createInitialState(defaultGameDefinition);
    const constrained: GameState = {
      ...state,
      tokens: state.tokens.map((token) => {
        if (token.id === "A-9") {
          return {
            ...token,
            currentOwner: "B",
            location: "hand",
            position: null,
            candidates: ["owl"]
          };
        }
        return token;
      })
    };

    const next = propagateGlobalConstraints(constrained);

    expect(next.tokens.find((token) => token.id === "A-10")!.candidates).not.toContain(
      "owl"
    );
    expect(next.tokens.find((token) => token.id === "B-1")!.candidates).toContain(
      "owl"
    );
  });

  it("ある動物候補が必要枚数分の駒にしか残っていなければ確定する", () => {
    const state = createInitialState(defaultGameDefinition);
    const constrained: GameState = {
      ...state,
      tokens: state.tokens.map((token) => {
        if (token.id === "A-9") {
          return { ...token, candidates: ["king", "rabbit"] };
        }
        if (token.originalSide === "A") {
          return {
            ...token,
            candidates: token.candidates.filter((candidate) => candidate !== "king")
          };
        }
        return token;
      })
    };

    const next = propagateGlobalConstraints(constrained);

    expect(next.tokens.find((token) => token.id === "A-9")!.candidates).toEqual([
      "king"
    ]);
  });

  it("候補集合が枚数を使い切る場合は他駒からその集合を消す", () => {
    const state = createInitialState(defaultGameDefinition);
    const constrained: GameState = {
      ...state,
      tokens: state.tokens.map((token) => {
        if (token.id === "A-9" || token.id === "A-10") {
          return { ...token, candidates: ["wolf", "snake"] };
        }
        return token;
      })
    };

    const next = propagateGlobalConstraints(constrained);
    const otherToken = next.tokens.find((token) => token.id === "A-11")!;

    expect(otherToken.candidates).not.toContain("wolf");
    expect(otherToken.candidates).not.toContain("snake");
    expect(next.tokens.find((token) => token.id === "A-9")!.candidates).toEqual([
      "wolf",
      "snake"
    ]);
  });
});

describe("capture", () => {
  it("移動候補は制約伝播後に成立する手だけを返す", () => {
    const state = emptyBoardState();
    const prepared: GameState = {
      ...state,
      tokens: state.tokens.map((token) => {
        if (token.id === "A-9") {
          return {
            ...token,
            location: "board",
            position: { x: 0, y: 4 },
            candidates: ["snake"]
          };
        }
        if (token.id === "A-10") {
          return {
            ...token,
            location: "board",
            position: { x: 2, y: 4 },
            candidates: ["snake", "rabbit"]
          };
        }
        return token;
      })
    };

    expect(getLegalMovesForToken(prepared, "A-10")).toContainEqual({
      x: 2,
      y: 2
    });
  });

  it("ライオンは隣接した敵カエルを捕獲できる", () => {
    const state = emptyBoardState();
    const prepared: GameState = {
      ...state,
      turn: "B",
      tokens: state.tokens.map((token) => {
        if (token.id === "B-7") {
          return {
            ...token,
            location: "board",
            position: { x: 1, y: 1 },
            candidates: ["king"]
          };
        }
        if (token.id === "A-14") {
          return {
            ...token,
            location: "board",
            position: { x: 1, y: 2 },
            candidates: ["frog"]
          };
        }
        return token;
      })
    };

    const result = applyAction(prepared, {
      type: "move",
      tokenId: "B-7",
      to: { x: 1, y: 2 }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.tokens.find((token) => token.id === "B-7")!.position).toEqual({
      x: 1,
      y: 2
    });
    expect(result.state.tokens.find((token) => token.id === "A-14")!.location).toBe(
      "hand"
    );
  });

  it("敵駒を捕獲し、king候補を消して持ち駒にする", () => {
    const state = emptyBoardState();
    const prepared: GameState = {
      ...state,
      tokens: state.tokens.map((token) => {
        if (token.id === "A-14") {
          return {
            ...token,
            location: "board",
            position: { x: 2, y: 2 },
            candidates: ["wolf"]
          };
        }
        if (token.id === "B-7") {
          return {
            ...token,
            location: "board",
            position: { x: 2, y: 0 },
            candidates: ["king", "rabbit"]
          };
        }
        return token;
      })
    };

    const result = applyAction(prepared, {
      type: "move",
      tokenId: "A-14",
      to: { x: 2, y: 0 }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const captured = result.state.tokens.find((token) => token.id === "B-7")!;
    expect(captured.location).toBe("hand");
    expect(captured.currentOwner).toBe("A");
    expect(captured.originalSide).toBe("B");
    expect(captured.candidates).toEqual(["rabbit"]);
  });

  it("kingだけの駒を捕獲すると勝利する", () => {
    const state = emptyBoardState();
    const prepared: GameState = {
      ...state,
      tokens: state.tokens.map((token) => {
        if (token.id === "A-14") {
          return {
            ...token,
            location: "board",
            position: { x: 2, y: 2 },
            candidates: ["wolf"]
          };
        }
        if (token.id === "B-7") {
          return {
            ...token,
            location: "board",
            position: { x: 2, y: 0 },
            candidates: ["king"]
          };
        }
        return token;
      })
    };

    const result = applyAction(prepared, {
      type: "move",
      tokenId: "A-14",
      to: { x: 2, y: 0 }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.winner).toBe("A");
  });

  it("捕獲後に相手陣営のking候補がゼロになったら勝利する", () => {
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
            candidates: ["king"]
          };
        }
        if (token.id === "A-9") {
          return {
            ...token,
            location: "board",
            position: { x: 0, y: 1 },
            candidates: ["king", "rabbit"]
          };
        }
        if (token.originalSide === "A") {
          return {
            ...token,
            candidates: ["rabbit"]
          };
        }
        return token;
      })
    };

    const result = applyAction(prepared, {
      type: "move",
      tokenId: "B-1",
      to: { x: 0, y: 1 }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.winner).toBe("B");
  });
});

describe("drop", () => {
  it("自分の持ち駒を空きマスに打つ", () => {
    const state = createInitialState(defaultGameDefinition);
    const prepared: GameState = {
      ...state,
      tokens: state.tokens.map((token) =>
        token.id === "A-9"
          ? {
              ...token,
              location: "hand",
              position: null,
              currentOwner: "A",
              candidates: ["rabbit"]
            }
          : token
      )
    };

    const result = applyAction(prepared, {
      type: "drop",
      tokenId: "A-9",
      to: { x: 0, y: 2 }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const dropped = result.state.tokens.find((token) => token.id === "A-9")!;
    expect(dropped.location).toBe("board");
    expect(dropped.position).toEqual({ x: 0, y: 2 });
    expect(result.state.turn).toBe("B");
    expect(result.state.moveHistory.at(-1)?.from).toBeNull();
  });

  it("駒のあるマスには打てない", () => {
    const state = createInitialState(defaultGameDefinition);
    const prepared: GameState = {
      ...state,
      tokens: state.tokens.map((token) =>
        token.id === "A-9"
          ? {
              ...token,
              location: "hand",
              position: null,
              currentOwner: "A",
              candidates: ["rabbit"]
            }
          : token
      )
    };

    const result = applyAction(prepared, {
      type: "drop",
      tokenId: "A-9",
      to: { x: 2, y: 3 }
    });

    expect(result.ok).toBe(false);
  });

  it("相手の持ち駒は打てない", () => {
    const state = createInitialState(defaultGameDefinition);
    const prepared: GameState = {
      ...state,
      tokens: state.tokens.map((token) =>
        token.id === "B-1"
          ? {
              ...token,
              location: "hand",
              position: null,
              currentOwner: "B",
              candidates: ["rabbit"]
            }
          : token
      )
    };

    const result = applyAction(prepared, {
      type: "drop",
      tokenId: "B-1",
      to: { x: 0, y: 2 }
    });

    expect(result.ok).toBe(false);
  });

  it("合法な打ち先は空きマスだけを返す", () => {
    const state = createInitialState(defaultGameDefinition);
    const prepared: GameState = {
      ...state,
      tokens: state.tokens.map((token) =>
        token.id === "A-9"
          ? {
              ...token,
              location: "hand",
              position: null,
              currentOwner: "A",
              candidates: ["rabbit"]
            }
          : token
      )
    };

    const drops = getLegalDropsForToken(prepared, "A-9");

    expect(drops).toContainEqual({ x: 0, y: 2 });
    expect(drops).not.toContainEqual({ x: 2, y: 3 });
  });
});
