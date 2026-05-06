import type { AnimalDefinition, QuantumToken } from "../domain/types";
import { AnimalIcon, tokenAssetUrl } from "./AnimalIcon";

type TokenProps = {
  token: QuantumToken;
  animals: AnimalDefinition[];
  selected: boolean;
  onSelect: () => void;
};

export function Token({ token, animals, selected, onSelect }: TokenProps) {
  const fixedAnimal =
    token.candidates.length === 1
      ? animals.find((animal) => animal.id === token.candidates[0])
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
      } ${fixedAnimal ? "fixed" : "mystery-token"}`}
      type="button"
      onClick={onSelect}
      title={`${token.currentOwner} ${titleAnimals}`}
    >
      <span className="token-main">
        {fixedAnimal ? (
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
      {!fixedAnimal && (
        <span className="token-candidates" aria-label={`候補 ${token.candidates.length} 種類`}>
          {token.candidates.length}
        </span>
      )}
    </button>
  );
}
