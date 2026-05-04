import { describe, expect, it } from "vitest";
import { defaultGameDefinition } from "../game-definitions/grass5x5";
import { createInitialState, validateGameDefinition } from "./setup";
import type { GameDefinition } from "./types";

describe("GameDefinition", () => {
  it("設定から初期状態を生成する", () => {
    const state = createInitialState(defaultGameDefinition);

    expect(state.definition.board).toEqual({ width: 5, height: 5 });
    expect(state.tokens).toHaveLength(16);
    expect(state.tokens[0].candidates).toEqual(
      defaultGameDefinition.animals.map((animal) => animal.id)
    );
  });

  it("盤面サイズを設定から変更できる", () => {
    const definition: GameDefinition = {
      ...defaultGameDefinition,
      board: { width: 6, height: 6 },
      initialSetup: defaultGameDefinition.initialSetup.map((token) =>
        token.y === 4 ? { ...token, y: 5 } : token
      )
    };

    const state = createInitialState(definition);

    expect(state.definition.board).toEqual({ width: 6, height: 6 });
  });

  it("配置数と動物枚数合計が一致しない場合はエラーにする", () => {
    const definition: GameDefinition = {
      ...defaultGameDefinition,
      animals: defaultGameDefinition.animals.map((animal) =>
        animal.id === "rabbit" ? { ...animal, count: 2 } : animal
      )
    };

    expect(() => validateGameDefinition(definition)).toThrow(/一致しません/);
  });
});
