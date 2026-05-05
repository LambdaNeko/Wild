import type { AnimalDefinition, QuantumToken } from "../domain/types";

type CandidateListProps = {
  token: QuantumToken | null;
  animals: AnimalDefinition[];
};

export function CandidateList({ token, animals }: CandidateListProps) {
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
            <div className="candidate" key={candidate}>
              <span>{animal?.icon}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
