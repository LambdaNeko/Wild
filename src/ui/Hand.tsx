import type { AnimalDefinition, PlayerId, QuantumToken } from "../domain/types";
import { Token } from "./Token";

type HandProps = {
  owner: PlayerId;
  tokens: QuantumToken[];
  animals: AnimalDefinition[];
};

export function Hand({ owner, tokens, animals }: HandProps) {
  const handTokens = tokens.filter(
    (token) => token.location === "hand" && token.currentOwner === owner
  );

  return (
    <section className="panel hand-panel">
      <h2>{owner} の持ち駒</h2>
      {handTokens.length === 0 ? (
        <p className="muted">なし</p>
      ) : (
        <div className="hand-list">
          {handTokens.map((token) => (
            <div className="hand-token" key={token.id}>
              <Token
                token={token}
                animals={animals}
                selected={false}
                onSelect={() => undefined}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
