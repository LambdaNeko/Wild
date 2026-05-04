import { getTokenAt } from "../domain/selectors";
import type { AnimalType, GameState, Position } from "../domain/types";
import { Cell } from "./Cell";

type LegalMoveHint = {
  position: Position;
  animals: AnimalType[];
};

type BoardProps = {
  state: GameState;
  selectedTokenId: string | null;
  legalMoves: Position[];
  legalMoveHints: LegalMoveHint[];
  onCellClick: (position: Position) => void;
  onTokenSelect: (tokenId: string) => void;
};

export function Board({
  state,
  selectedTokenId,
  legalMoves,
  legalMoveHints,
  onCellClick,
  onTokenSelect
}: BoardProps) {
  const cells: Position[] = [];
  for (let y = 0; y < state.definition.board.height; y += 1) {
    for (let x = 0; x < state.definition.board.width; x += 1) {
      cells.push({ x, y });
    }
  }

  return (
    <div
      className="board"
      style={{
        gridTemplateColumns: `repeat(${state.definition.board.width}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${state.definition.board.height}, minmax(0, 1fr))`
      }}
    >
      {cells.map((position) => {
        const token = getTokenAt(state, position);
        const legal = legalMoves.some(
          (move) => move.x === position.x && move.y === position.y
        );
        const hint = legalMoveHints.find(
          (move) => move.position.x === position.x && move.position.y === position.y
        );
        return (
          <Cell
            key={`${position.x}-${position.y}`}
            position={position}
            token={token}
            animals={state.definition.animals}
            selected={token?.id === selectedTokenId}
            legal={legal}
            moveAnimals={hint?.animals ?? []}
            onCellClick={() => onCellClick(position)}
            onTokenSelect={() => token && onTokenSelect(token.id)}
          />
        );
      })}
    </div>
  );
}
