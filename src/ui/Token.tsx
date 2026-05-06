import type { AnimalDefinition, AnimalType, QuantumToken } from "../domain/types";
import { AnimalIcon, tokenAssetUrl } from "./AnimalIcon";

type TokenProps = {
  token: QuantumToken;
  animals: AnimalDefinition[];
  selected: boolean;
  moved: boolean;
  movingAway: boolean;
  fixedNow: boolean;
  openingRevealAnimalId?: AnimalType;
  animationCueId: number | null;
  onSelect: () => void;
};

export function Token({
  token,
  animals,
  selected,
  moved,
  movingAway,
  fixedNow,
  openingRevealAnimalId,
  animationCueId,
  onSelect
}: TokenProps) {
  const fixedAnimal =
    token.candidates.length === 1
      ? animals.find((animal) => animal.id === token.candidates[0])
      : undefined;
  const openingAnimal = openingRevealAnimalId
    ? animals.find((animal) => animal.id === openingRevealAnimalId)
    : undefined;
  const titleAnimals = token.candidates
    .map(
      (candidate) =>
        animals.find((animal) => animal.id === candidate)?.displayName ?? candidate
    )
    .join("/");
  const facing =
    token.currentOwner === "A" && token.location === "board" ? "back" : "front";

  return (
    <button
      className={`token owner-${token.currentOwner.toLowerCase()} ${
        selected ? "selected" : ""
      } ${fixedAnimal ? "fixed" : "mystery-token"} ${moved ? "moved-now" : ""} ${
        movingAway ? "moving-away" : ""
      } ${fixedNow ? "fixed-now" : ""} ${
        openingAnimal && !fixedAnimal ? "opening-reveal" : ""
      }`}
      key={`${token.id}-${animationCueId ?? "idle"}-${
        openingAnimal?.id ?? "hidden"
      }-${fixedNow ? "fixed" : "plain"}`}
      type="button"
      onClick={onSelect}
      title={`${token.currentOwner} ${titleAnimals}`}
    >
      <span className="token-main">
        {openingAnimal && !fixedAnimal ? (
          <>
            <AnimalIcon
              animalId={openingAnimal.id}
              label={openingAnimal.displayName}
              className="token-art opening-animal-art"
              facing={facing}
            />
            <img
              className="token-art mystery-art opening-grass-art"
              src={tokenAssetUrl("mystery.png")}
              alt="未確定の草むら"
              draggable={false}
            />
          </>
        ) : fixedAnimal ? (
          <AnimalIcon
            animalId={fixedAnimal.id}
            label={fixedAnimal.displayName}
            className="token-art"
            facing={facing}
          />
        ) : (
          <img
            className="token-art mystery-art"
            src={tokenAssetUrl("mystery.png")}
            alt="未確定の草むら"
            draggable={false}
          />
        )}
      </span>
      {!fixedAnimal && !openingAnimal && (
        <span className="token-candidates" aria-label={`候補 ${token.candidates.length} 種類`}>
          {token.candidates.length}
        </span>
      )}
    </button>
  );
}
