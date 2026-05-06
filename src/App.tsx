import { useEffect, useMemo, useState } from "react";
import { chooseNpcAction, type NpcStrength } from "./domain/npc";
import { createInitialState } from "./domain/setup";
import {
  applyAction,
  getLegalDropsForToken,
  getLegalMovesForToken,
  narrowCandidatesByMove,
  resolveWinnerByKingCandidates
} from "./domain/rules";
import type { GameState, Position, QuantumToken } from "./domain/types";
import { defaultGameDefinition } from "./game-definitions/grass5x5";
import { Board } from "./ui/Board";
import { CandidateList } from "./ui/CandidateList";
import { Hand } from "./ui/Hand";
import { MoveHistory } from "./ui/MoveHistory";

const createGame = () => createInitialState(defaultGameDefinition);
const NPC_PLAYER = "B";
const NPC_DELAY_MS = 450;
const ANIMATION_CUE_MS = 720;

type AnimationCue = {
  id: number;
  movedTokenId: string;
  from: Position | null;
  to: Position;
  actionType: "move" | "drop";
  movingToken: QuantumToken | null;
  fixedTokenIds: string[];
};

const npcStrengthLabels: Record<NpcStrength, string> = {
  weak: "弱",
  medium: "中",
  strong: "強"
};

export default function App() {
  const [state, setState] = useState<GameState>(() => createGame());
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [npcStrength, setNpcStrength] = useState<NpcStrength>("medium");
  const [message, setMessage] = useState<string>("");
  const [animationCue, setAnimationCue] = useState<AnimationCue | null>(null);

  useEffect(() => {
    setState((currentState) => {
      const resolvedState = resolveWinnerByKingCandidates(currentState);
      return resolvedState === currentState ? currentState : resolvedState;
    });
  }, []);

  const isNpcTurn = state.turn === NPC_PLAYER && !state.winner;

  function queueAnimationCue(
    previousState: GameState,
    nextState: GameState,
    movedTokenId: string,
    to: Position,
    actionType: AnimationCue["actionType"]
  ) {
    const previousToken = previousState.tokens.find(
      (token) => token.id === movedTokenId
    );
    const nextToken =
      nextState.tokens.find((token) => token.id === movedTokenId) ?? null;
    const fixedTokenIds = nextState.tokens
      .filter((token) => {
        const previousToken = previousState.tokens.find((item) => item.id === token.id);
        return (
          previousToken &&
          previousToken.candidates.length > 1 &&
          token.candidates.length === 1
        );
      })
      .map((token) => token.id);

    setAnimationCue({
      id: window.performance.now(),
      movedTokenId,
      from: actionType === "move" ? (previousToken?.position ?? null) : null,
      to,
      actionType,
      movingToken:
        actionType === "move" && nextToken
          ? {
              ...nextToken,
              location: "board",
              position: previousToken?.position ?? null
            }
          : null,
      fixedTokenIds
    });
  }

  useEffect(() => {
    if (!animationCue) {
      return;
    }

    const timer = window.setTimeout(() => setAnimationCue(null), ANIMATION_CUE_MS);
    return () => window.clearTimeout(timer);
  }, [animationCue]);

  useEffect(() => {
    if (!isNpcTurn) {
      return;
    }

    setSelectedTokenId(null);
    setMessage("NPC思考中");

    const timer = window.setTimeout(() => {
      const action = chooseNpcAction(state, npcStrength);
      if (!action) {
        setMessage("NPCが指せる手はありません。");
        return;
      }

      const result = applyAction(state, action);
      if (!result.ok) {
        setMessage(result.reason);
        return;
      }

      queueAnimationCue(state, result.state, action.tokenId, action.to, action.type);
      setState(result.state);
      setMessage("");
    }, NPC_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isNpcTurn, npcStrength, state]);

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
    if (isNpcTurn) {
      return;
    }

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
    if (!selectedTokenId || state.winner || isNpcTurn) {
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

    queueAnimationCue(
      state,
      result.state,
      selectedTokenId,
      position,
      selectedToken?.location === "hand" ? "drop" : "move"
    );
    setState(result.state);
    setSelectedTokenId(null);
    setMessage("");
  }

  function reset() {
    setState(createGame());
    setSelectedTokenId(null);
    setMessage("");
    setAnimationCue(null);
  }

  return (
    <main className="app-shell">
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
          <div className="board-stage">
            <Board
              state={state}
              selectedTokenId={selectedTokenId}
              legalMoves={legalTargets}
              legalMoveHints={legalMoveHints}
              animationCue={animationCue}
              onCellClick={clickCell}
              onTokenSelect={selectToken}
            />
            <div className="status-layer" aria-live="polite">
              {state.winner && (
                <div className="winner-announcement">{state.winner} の勝利</div>
              )}
              {message && <div className="message-toast">{message}</div>}
            </div>
          </div>
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
        <div className="segmented-control" aria-label="NPC強さ">
          {(Object.keys(npcStrengthLabels) as NpcStrength[]).map((strength) => (
            <button
              className={strength === npcStrength ? "active" : ""}
              key={strength}
              type="button"
              onClick={() => setNpcStrength(strength)}
            >
              {npcStrengthLabels[strength]}
            </button>
          ))}
        </div>
        <button className="reset-button" type="button" onClick={reset}>
          ↻ リセット
        </button>
      </div>
    </main>
  );
}
