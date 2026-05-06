import type {
  AnimalDefinition,
  AnimalType,
  Position,
  QuantumToken
} from "../domain/types";
import { AnimalIcon } from "./AnimalIcon";
import { Token } from "./Token";

type CellProps = {
  position: Position;
  token?: QuantumToken;
  animals: AnimalDefinition[];
  selected: boolean;
  legal: boolean;
  moveAnimals: AnimalType[];
  animationCueId: number | null;
  animated: boolean;
  actionType: "move" | "drop" | null;
  tokenMoved: boolean;
  tokenMovingAway: boolean;
  tokenFixed: boolean;
  openingRevealAnimalId?: AnimalType;
  onCellClick: () => void;
  onTokenSelect: () => void;
};

export function Cell({
  position,
  token,
  animals,
  selected,
  legal,
  moveAnimals,
  animationCueId,
  animated,
  actionType,
  tokenMoved,
  tokenMovingAway,
  tokenFixed,
  openingRevealAnimalId,
  onCellClick,
  onTokenSelect
}: CellProps) {
  function activateCell() {
    onCellClick();
  }

  return (
    <div
      className={`cell ${legal ? "legal" : ""} ${animated ? "cell-action" : ""} ${
        actionType ? `cell-action-${actionType}` : ""
      }`}
      role="button"
      tabIndex={0}
      onClick={activateCell}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activateCell();
        }
      }}
      aria-label={`${position.x + 1},${position.y + 1}`}
    >
      {animated && <span className="action-burst" key={animationCueId ?? "burst"} />}
      {legal && <span className="legal-dot" />}
      {legal && moveAnimals.length > 0 && (
        <span className="move-animals">
          {moveAnimals.map((animalId) => {
            const animal = animals.find((item) => item.id === animalId);
            return (
              <AnimalIcon
                animalId={animalId}
                className="move-animal-icon"
                decorative
                key={animalId}
                label={animal?.displayName ?? animalId}
              />
            );
          })}
        </span>
      )}
      {token && (
        <Token
          token={token}
          animals={animals}
          selected={selected}
          moved={tokenMoved}
          movingAway={tokenMovingAway}
          fixedNow={tokenFixed}
          openingRevealAnimalId={openingRevealAnimalId}
          animationCueId={animationCueId}
          onSelect={onTokenSelect}
        />
      )}
    </div>
  );
}
