import { useEffect, useMemo, useState } from "react";
import { createInitialState } from "./domain/setup";
import {
  applyAction,
  getLegalMovesForToken,
  narrowCandidatesByMove,
  resolveWinnerByKingCandidates
} from "./domain/rules";
import type { GameState, Position } from "./domain/types";
import { defaultGameDefinition } from "./game-definitions/grass5x5";
import { Board } from "./ui/Board";
import { CandidateList } from "./ui/CandidateList";
import { Hand } from "./ui/Hand";
import { MoveHistory } from "./ui/MoveHistory";

const createGame = () => createInitialState(defaultGameDefinition);

export default function App() {
  const [state, setState] = useState<GameState>(() => createGame());
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    setState((currentState) => {
      const resolvedState = resolveWinnerByKingCandidates(currentState);
      return resolvedState === currentState ? currentState : resolvedState;
    });
  }, []);

  const selectedToken =
    state.tokens.find((token) => token.id === selectedTokenId) ?? null;
  const legalMoves = useMemo(
    () => (selectedTokenId ? getLegalMovesForToken(state, selectedTokenId) : []),
    [state, selectedTokenId]
  );
  const legalMoveHints = useMemo(() => {
    if (!selectedToken || selectedToken.position === null) {
      return [];
    }

    return legalMoves.map((position) => ({
      position,
      animals: narrowCandidatesByMove(
        selectedToken,
        selectedToken.position!,
        position,
        state
      )
    }));
  }, [legalMoves, selectedToken, state]);

  function selectToken(tokenId: string) {
    const token = state.tokens.find((item) => item.id === tokenId);
    if (!token || token.currentOwner !== state.turn || state.winner) {
      setSelectedTokenId(tokenId);
      setMessage("");
      return;
    }
    setSelectedTokenId(tokenId);
    setMessage("");
  }

  function clickCell(position: Position) {
    if (!selectedTokenId || state.winner) {
      return;
    }

    const legal = legalMoves.some(
      (move) => move.x === position.x && move.y === position.y
    );
    if (!legal) {
      return;
    }

    const result = applyAction(state, {
      type: "move",
      tokenId: selectedTokenId,
      to: position
    });

    if (!result.ok) {
      setMessage(result.reason);
      return;
    }

    setState(result.state);
    setSelectedTokenId(null);
    setMessage("");
  }

  function reset() {
    setState(createGame());
    setSelectedTokenId(null);
    setMessage("");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>{state.definition.name}</h1>
          <p>
            {state.winner
              ? `勝者: ${state.winner}`
              : `手番: ${state.turn}`}
          </p>
        </div>
        <button className="icon-button" type="button" onClick={reset} title="リセット">
          ↻
        </button>
      </header>

      {state.winner && <div className="winner-banner">{state.winner} の勝利</div>}
      {message && <div className="message">{message}</div>}

      <section className="game-layout">
        <div className="board-column">
          <Hand owner="B" tokens={state.tokens} animals={state.definition.animals} />
          <Board
            state={state}
            selectedTokenId={selectedTokenId}
            legalMoves={legalMoves}
            legalMoveHints={legalMoveHints}
            onCellClick={clickCell}
            onTokenSelect={selectToken}
          />
          <Hand owner="A" tokens={state.tokens} animals={state.definition.animals} />
        </div>

        <aside className="side-panel">
          <CandidateList token={selectedToken} animals={state.definition.animals} />
          <MoveHistory
            records={state.moveHistory}
            animals={state.definition.animals}
          />
        </aside>
      </section>
    </main>
  );
}
