import type { AnimalDefinition, QuantumToken } from "../domain/types";

type CandidateListProps = {
  token: QuantumToken | null;
  animals: AnimalDefinition[];
};

export function CandidateList({ token, animals }: CandidateListProps) {
  if (!token) {
    return (
      <section className="panel">
        <h2>候補</h2>
        <p className="muted">駒を選択してください。</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>候補</h2>
      <div className="selected-meta">
        <span>{token.id}</span>
        <span>所有 {token.currentOwner}</span>
        <span>初期陣営 {token.originalSide}</span>
      </div>
      <div className="candidate-grid">
        {token.candidates.map((candidate) => {
          const animal = animals.find((item) => item.id === candidate);
          return (
            <div className="candidate" key={candidate}>
              <span>{animal?.icon}</span>
              <strong>{animal?.displayName ?? candidate}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}
