import type { CSSProperties } from "react";
import { getTokenAt } from "../domain/selectors";
import type { AnimalType, GameState, Position, QuantumToken } from "../domain/types";
import { Cell } from "./Cell";
import { Token } from "./Token";

type LegalMoveHint = {
  position: Position;
  animals: AnimalType[];
};

type AnimationCue = {
  id: number;
  movedTokenId: string;
  from: Position | null;
  to: Position;
  actionType: "move" | "drop";
  movingToken: QuantumToken | null;
  fixedTokenIds: string[];
};

type MovingTokenStyle = CSSProperties & {
  "--move-dx": number;
  "--move-dy": number;
  gridColumn: number;
  gridRow: number;
};

type BoardStyle = CSSProperties & {
  "--meadow-cell-texture": string;
};

type BoardProps = {
  state: GameState;
  selectedTokenId: string | null;
  legalMoves: Position[];
  legalMoveHints: LegalMoveHint[];
  animationCue: AnimationCue | null;
  openingRevealTokens: Record<string, AnimalType>;
  onCellClick: (position: Position) => void;
  onTokenSelect: (tokenId: string) => void;
};

export function Board({
  state,
  selectedTokenId,
  legalMoves,
  legalMoveHints,
  animationCue,
  openingRevealTokens,
  onCellClick,
  onTokenSelect
}: BoardProps) {
  const boardWidth = state.definition.board.width;
  const boardHeight = state.definition.board.height;
  const cells: Position[] = [];
  for (let y = 0; y < boardHeight; y += 1) {
    for (let x = 0; x < boardWidth; x += 1) {
      cells.push({ x, y });
    }
  }
  const movingTokenStyle =
    animationCue?.from && animationCue.movingToken
      ? createMovingTokenStyle(animationCue.from, animationCue.to)
      : null;
  const boardStyle: BoardStyle = {
    "--meadow-cell-texture": `url("${import.meta.env.BASE_URL}assets/ui/meadow-cell-texture.png")`,
    aspectRatio: `${boardWidth} / ${boardHeight}`,
    gridTemplateColumns: `repeat(${state.definition.board.width}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${state.definition.board.height}, minmax(0, 1fr))`
  };

  return (
    <div
      className="board"
      style={boardStyle}
    >
      {movingTokenStyle && animationCue?.movingToken && (
        <div
          className="moving-token-layer"
          style={{
            gridTemplateColumns: `repeat(${boardWidth}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${boardHeight}, minmax(0, 1fr))`
          }}
        >
          <div
            className="moving-token-shell"
            key={`moving-${animationCue.id}`}
            style={movingTokenStyle}
          >
            <Token
              token={animationCue.movingToken}
              animals={state.definition.animals}
              selected={false}
              moved={false}
              movingAway={false}
              fixedNow={animationCue.fixedTokenIds.includes(animationCue.movedTokenId)}
              animationCueId={animationCue.id}
              onSelect={() => undefined}
            />
          </div>
        </div>
      )}
      {cells.map((position) => {
        const token = getTokenAt(state, position);
        const legal = legalMoves.some(
          (move) => move.x === position.x && move.y === position.y
        );
        const hint = legalMoveHints.find(
          (move) => move.position.x === position.x && move.position.y === position.y
        );
        const isCueTarget =
          animationCue?.to.x === position.x && animationCue.to.y === position.y;
        return (
          <Cell
            key={`${position.x}-${position.y}`}
            position={position}
            token={token}
            animals={state.definition.animals}
            selected={token?.id === selectedTokenId}
            legal={legal}
            moveAnimals={hint?.animals ?? []}
            animationCueId={animationCue?.id ?? null}
            animated={isCueTarget}
            actionType={isCueTarget ? animationCue.actionType : null}
            tokenMoved={Boolean(
              token &&
                token.id === animationCue?.movedTokenId &&
                animationCue.actionType === "drop"
            )}
            tokenMovingAway={Boolean(
              token &&
                token.id === animationCue?.movedTokenId &&
                animationCue.actionType === "move"
            )}
            tokenFixed={Boolean(
              token && animationCue?.fixedTokenIds.includes(token.id)
            )}
            openingRevealAnimalId={token ? openingRevealTokens[token.id] : undefined}
            onCellClick={() => onCellClick(position)}
            onTokenSelect={() => token && onTokenSelect(token.id)}
          />
        );
      })}
    </div>
  );
}

function createMovingTokenStyle(
  from: Position,
  to: Position
): MovingTokenStyle {
  return {
    "--move-dx": to.x - from.x,
    "--move-dy": to.y - from.y,
    gridColumn: from.x + 1,
    gridRow: from.y + 1
  };
}
