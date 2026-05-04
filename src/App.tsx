import { useEffect, useMemo, useState } from "react";
import { createInitialState } from "./domain/setup";
import {
  applyAction,
  getLegalDropsForToken,
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
  const legalDrops = useMemo(
    () => (selectedTokenId ? getLegalDropsForToken(state, selectedTokenId) : []),
    [state, selectedTokenId]
  );
  const legalTargets =
    selectedToken?.location === "hand" ? legalDrops : legalMoves;
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

    const legal = legalTargets.some(
      (move) => move.x === position.x && move.y === position.y
    );
    if (!legal) {
      return;
    }

    const result =
      selectedToken?.location === "hand"
        ? applyAction(state, {
            type: "drop",
            tokenId: selectedTokenId,
            to: position
          })
        : applyAction(state, {
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
      {state.winner && <div className="winner-banner">{state.winner} の勝利</div>}
      {message && <div className="message">{message}</div>}

      <section className="game-layout">
        <div className="board-column">
          <Hand
            owner="B"
            tokens={state.tokens}
            animals={state.definition.animals}
            active={state.turn === "B" && !state.winner}
            selectedTokenId={selectedTokenId}
            onTokenSelect={selectToken}
          />
          <Board
            state={state}
            selectedTokenId={selectedTokenId}
            legalMoves={legalTargets}
            legalMoveHints={legalMoveHints}
            onCellClick={clickCell}
            onTokenSelect={selectToken}
          />
          <Hand
            owner="A"
            tokens={state.tokens}
            animals={state.definition.animals}
            active={state.turn === "A" && !state.winner}
            selectedTokenId={selectedTokenId}
            onTokenSelect={selectToken}
          />
        </div>

        <aside className="side-panel">
          <CandidateList token={selectedToken} animals={state.definition.animals} />
          <MoveHistory
            records={state.moveHistory}
            animals={state.definition.animals}
          />
        </aside>
      </section>

      <div className="bottom-actions">
        <button className="reset-button" type="button" onClick={reset}>
          ↻ リセット
        </button>
      </div>
    </main>
  );
}
