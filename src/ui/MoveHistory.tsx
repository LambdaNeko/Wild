import { useState } from "react";
import type { AnimalDefinition, MoveRecord, Position } from "../domain/types";
import { AnimalIcon } from "./AnimalIcon";

type MoveHistoryProps = {
  records: MoveRecord[];
  animals: AnimalDefinition[];
};

export function MoveHistory({ records, animals }: MoveHistoryProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="panel history-panel">
      <button
        className="history-toggle"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span>手順</span>
        <strong>{records.length}</strong>
      </button>
      {open && records.length === 0 && <p className="muted">まだ手はありません。</p>}
      {open && records.length > 0 && (
        <ol className="move-history">
          {records.map((record, index) => (
            <li key={`${index}-${record.action.tokenId}`}>
              <span className="move-number">{index + 1}</span>
              <div className="move-detail">
                <strong>{record.action.tokenId}</strong>
                <span>
                  {formatPosition(record.from)} →{" "}
                  {record.action.type === "move"
                    ? formatPosition(record.action.to)
                    : `${formatPosition(record.action.to)} 打`}
                </span>
                {record.capturedTokenId && (
                  <span className="move-capture">捕獲 {record.capturedTokenId}</span>
                )}
                {record.narrowedTo && (
                  <span className="move-candidates">
                    {record.narrowedTo.length === 0
                      ? "候補なし"
                      : record.narrowedTo.map((candidate) => {
                          const animal = animals.find((item) => item.id === candidate);
                          return (
                            <AnimalIcon
                              animalId={candidate}
                              className="history-animal-icon"
                              decorative
                              key={candidate}
                              label={animal?.displayName ?? candidate}
                            />
                          );
                        })}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function formatPosition(position: Position | null): string {
  return position ? `${position.x + 1},${position.y + 1}` : "持ち駒";
}
