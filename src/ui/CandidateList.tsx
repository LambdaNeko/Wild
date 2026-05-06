import { useState, type MouseEvent } from "react";
import type { AnimalDefinition, AnimalType, QuantumToken } from "../domain/types";
import { AnimalIcon } from "./AnimalIcon";

export type CandidateMovePattern = {
  cells: {
    x: number;
    y: number;
    arrow: string;
  }[];
};

type CandidateListProps = {
  token: QuantumToken | null;
  animals: AnimalDefinition[];
  activeCandidate: AnimalType | null;
  movePattern: CandidateMovePattern | null;
  onCandidateSelect: (candidate: AnimalType) => void;
};

export function CandidateList({
  token,
  animals,
  activeCandidate,
  movePattern,
  onCandidateSelect
}: CandidateListProps) {
  const [bubblePlacement, setBubblePlacement] = useState(
    "above center" as "above center" | "above left" | "above right" | "below center" | "below left" | "below right"
  );

  if (!token) {
    return (
      <section className="panel candidate-panel">
        <div className="candidate-header">
          <h2>候補</h2>
          <p className="muted">駒を選択してください。</p>
        </div>
      </section>
    );
  }

  function selectCandidate(
    event: MouseEvent<HTMLButtonElement>,
    candidate: AnimalType
  ) {
    const rect = event.currentTarget.getBoundingClientRect();
    const horizontal =
      rect.left < 76
        ? "left"
        : window.innerWidth - rect.right < 76
          ? "right"
          : "center";
    const vertical = rect.top < 150 ? "below" : "above";

    setBubblePlacement(`${vertical} ${horizontal}` as typeof bubblePlacement);
    onCandidateSelect(candidate);
  }

  return (
    <section className="panel candidate-panel">
      <div className="candidate-header">
        <h2>候補</h2>
        <div className="selected-meta">
          <span>{token.id}</span>
          <span>所:{token.currentOwner}</span>
          <span>初:{token.originalSide}</span>
        </div>
      </div>
      <div className="candidate-grid">
        {token.candidates.map((candidate) => {
          const animal = animals.find((item) => item.id === candidate);
          return (
            <button
              className={`candidate ${activeCandidate === candidate ? "active" : ""}`}
              key={candidate}
              type="button"
              title={animal?.displayName ?? candidate}
              onClick={(event) => selectCandidate(event, candidate)}
            >
              {animal && (
                <AnimalIcon
                  animalId={animal.id}
                  className="candidate-icon"
                  label={animal.displayName}
                />
              )}
              {activeCandidate === candidate && movePattern && animal && (
                <span className={`candidate-direction-bubble ${bubblePlacement}`}>
                  <span className="move-pattern-grid" aria-label={`${animal.displayName}の動き`}>
                    {Array.from({ length: 25 }, (_, index) => {
                      const x = index % 5;
                      const y = Math.floor(index / 5);
                      const moveCell = movePattern.cells.find(
                        (cell) => cell.x === x && cell.y === y
                      );
                      const isCenter = x === 2 && y === 2;

                      return (
                        <span
                          className={`move-pattern-cell ${
                            isCenter ? "center" : moveCell ? "target" : ""
                          }`}
                          key={`${x}-${y}`}
                        >
                          {isCenter ? (
                            <AnimalIcon
                              animalId={animal.id}
                              className="move-pattern-icon"
                              label={animal.displayName}
                            />
                          ) : (
                            (moveCell?.arrow ?? "")
                          )}
                        </span>
                      );
                    })}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
