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
import { getAnimalDefinition, getPlayerDefinition } from "./domain/selectors";
import type {
  AnimalType,
  Direction,
  GameDefinition,
  GameState,
  Position,
  QuantumToken
} from "./domain/types";
import { gameDefinitions } from "./game-definitions/grass5x5";
import { Board } from "./ui/Board";
import { CandidateList, type CandidateMovePattern } from "./ui/CandidateList";
import { Hand } from "./ui/Hand";
import { MoveHistory } from "./ui/MoveHistory";

const createGame = (definition: GameDefinition) => createInitialState(definition);
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

const vectorArrowLabels: Record<string, string> = {
  "0,-1": "↑",
  "1,-1": "↗",
  "1,0": "→",
  "1,1": "↘",
  "0,1": "↓",
  "-1,1": "↙",
  "-1,0": "←",
  "-1,-1": "↖"
};

function getStageDisplayName(definition: GameDefinition) {
  return definition.name
    .replace(/^ステージ \d+ /, "")
    .replace(/\s+\d+x\d+$/, "");
}

export default function App() {
  const [screen, setScreen] = useState<"stageSelect" | "game">("stageSelect");
  const [selectedStageId, setSelectedStageId] = useState(gameDefinitions[0].id);
  const [state, setState] = useState<GameState>(() => createGame(gameDefinitions[0]));
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [activeCandidate, setActiveCandidate] = useState<AnimalType | null>(null);
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
  const selectedStage = state.definition;

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
    setActiveCandidate(null);
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
  const selectedCandidateMovePattern = useMemo(() => {
    if (!selectedToken || !activeCandidate) {
      return null;
    }

    return createMovePattern(state, selectedToken, activeCandidate);
  }, [activeCandidate, selectedToken, state]);

  function selectToken(tokenId: string) {
    if (isNpcTurn) {
      return;
    }

    const token = state.tokens.find((item) => item.id === tokenId);
    if (!token || token.currentOwner !== state.turn || state.winner) {
      setSelectedTokenId(tokenId);
      setActiveCandidate(null);
      setMessage("");
      return;
    }
    setSelectedTokenId(tokenId);
    setActiveCandidate(null);
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
    setActiveCandidate(null);
    setMessage("");
  }

  function reset() {
    setState(createGame(selectedStage));
    setSelectedTokenId(null);
    setActiveCandidate(null);
    setMessage("");
    setAnimationCue(null);
  }

  function selectStage(definition: GameDefinition) {
    setSelectedStageId(definition.id);
    setState(createGame(definition));
    setSelectedTokenId(null);
    setActiveCandidate(null);
    setMessage("");
    setAnimationCue(null);
    setScreen("game");
  }

  function returnToStageSelect() {
    setSelectedTokenId(null);
    setActiveCandidate(null);
    setMessage("");
    setAnimationCue(null);
    setScreen("stageSelect");
  }

  if (screen === "stageSelect") {
    return (
      <main className="app-shell stage-screen-shell">
        <section className="stage-select stage-select-screen" aria-label="ステージ選択">
          <div className="stage-select-header">
            <h1>ステージ選択</h1>
          </div>
          <div className="stage-settings">
            <h2>NPC強さ</h2>
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
          </div>
          <div className="stage-list">
            {gameDefinitions.map((definition, index) => (
              <button
                className={`stage-button ${
                  definition.id === selectedStageId ? "active" : ""
                }`}
                key={definition.id}
                type="button"
                onClick={() => selectStage(definition)}
              >
                <span className="stage-number">{index + 1}</span>
                <span className="stage-name">
                  {getStageDisplayName(definition)}
                </span>
                <span className="stage-meta">
                  {definition.board.width}x{definition.board.height} / 駒
                  {definition.animals.length}
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="game-header">
        <div className="game-title-line">
          <h1>{getStageDisplayName(selectedStage)}</h1>
          <span className="stage-current">
            {selectedStage.board.width}x{selectedStage.board.height} / 駒
            {selectedStage.animals.length}
          </span>
        </div>
      </header>
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
          <CandidateList
            token={selectedToken}
            animals={state.definition.animals}
            activeCandidate={activeCandidate}
            movePattern={selectedCandidateMovePattern}
            onCandidateSelect={(candidate) =>
              setActiveCandidate((current) =>
                current === candidate ? null : candidate
              )
            }
          />
          <MoveHistory
            records={state.moveHistory}
            animals={state.definition.animals}
          />
        </aside>
      </section>

      <div className="bottom-actions">
        <button className="stage-return-button" type="button" onClick={returnToStageSelect}>
          ステージ選択
        </button>
        <button className="reset-button" type="button" onClick={reset}>
          ↻ リセット
        </button>
      </div>
    </main>
  );
}

function createMovePattern(
  state: GameState,
  token: QuantumToken,
  candidate: AnimalType
): CandidateMovePattern {
  const animal = getAnimalDefinition(state, candidate);
  const forwardY = getPlayerDefinition(state, token.currentOwner).forwardY;
  const movement = animal.movement;
  const cells: CandidateMovePattern["cells"] = [];

  if (movement.type === "jump") {
    movement.offsets.forEach((offset) => {
      addPatternCell(cells, offset.dx, offset.dy * forwardY);
    });
    return { cells };
  }

  movement.directions.forEach((direction) => {
    const vector = directionToVector(direction, forwardY);
    const maxDistance =
      movement.type === "slide"
        ? 2
        : Math.min(movement.maxDistance, 2);

    for (let distance = 1; distance <= maxDistance; distance += 1) {
      addPatternCell(cells, vector.dx * distance, vector.dy * distance);
    }
  });

  return { cells };
}

function addPatternCell(
  cells: CandidateMovePattern["cells"],
  dx: number,
  dy: number
) {
  const x = 2 + dx;
  const y = 2 + dy;

  if (x < 0 || y < 0 || x > 4 || y > 4) {
    return;
  }

  const arrow = vectorArrowLabels[`${Math.sign(dx)},${Math.sign(dy)}`] ?? "";
  if (!cells.some((cell) => cell.x === x && cell.y === y)) {
    cells.push({ x, y, arrow });
  }
}

function directionToVector(direction: Direction, forwardY: 1 | -1) {
  const backwardY = (forwardY * -1) as 1 | -1;
  switch (direction) {
    case "forward":
      return { dx: 0, dy: forwardY };
    case "backward":
      return { dx: 0, dy: backwardY };
    case "left":
      return { dx: -1, dy: 0 };
    case "right":
      return { dx: 1, dy: 0 };
    case "forwardLeft":
      return { dx: -1, dy: forwardY };
    case "forwardRight":
      return { dx: 1, dy: forwardY };
    case "backwardLeft":
      return { dx: -1, dy: backwardY };
    case "backwardRight":
      return { dx: 1, dy: backwardY };
  }
}
