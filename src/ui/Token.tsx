import type { AnimalDefinition, QuantumToken } from "../domain/types";

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

  const candidateText = token.candidates
    .map((candidate) => animals.find((animal) => animal.id === candidate)?.icon ?? candidate)
    .join("");

  return (
    <button
      className={`token owner-${token.currentOwner.toLowerCase()} ${
        selected ? "selected" : ""
      } ${fixedAnimal ? "fixed" : ""}`}
      type="button"
      onClick={onSelect}
      title={`${token.currentOwner} ${token.candidates.join("/")}`}
    >
      <span className="token-main">{fixedAnimal?.icon ?? "🌿"}</span>
      <span className="token-candidates">{fixedAnimal?.displayName ?? candidateText}</span>
    </button>
  );
}
