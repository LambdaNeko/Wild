import type {
  AnimalType,
  Direction,
  GameState,
  MovementDefinition,
  PlayerId,
  Position
} from "./types";
import {
  getAnimalDefinition,
  getPlayerDefinition,
  getTokenAt,
  isInBounds
} from "./selectors";

type Vector = {
  dx: number;
  dy: number;
};

export function canMoveAs(
  animal: AnimalType,
  from: Position,
  to: Position,
  owner: PlayerId,
  state: GameState
): boolean {
  if (!isInBounds(state, to) || (from.x === to.x && from.y === to.y)) {
    return false;
  }

  const occupant = getTokenAt(state, to);
  if (occupant?.currentOwner === owner) {
    return false;
  }

  const definition = getAnimalDefinition(state, animal);
  return canMovementReach(definition.movement, from, to, owner, state);
}

export function pathClear(
  from: Position,
  to: Position,
  state: GameState
): boolean {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  let cursor = { x: from.x + dx, y: from.y + dy };

  while (cursor.x !== to.x || cursor.y !== to.y) {
    if (getTokenAt(state, cursor)) {
      return false;
    }
    cursor = { x: cursor.x + dx, y: cursor.y + dy };
  }

  return true;
}

function canMovementReach(
  movement: MovementDefinition,
  from: Position,
  to: Position,
  owner: PlayerId,
  state: GameState
): boolean {
  const actual = { dx: to.x - from.x, dy: to.y - from.y };

  if (movement.type === "jump") {
    const forwardY = getPlayerDefinition(state, owner).forwardY;
    return movement.offsets.some(
      (offset) => offset.dx === actual.dx && offset.dy * forwardY === actual.dy
    );
  }

  const allowedVectors = movement.directions.map((direction) =>
    directionToVector(direction, getPlayerDefinition(state, owner).forwardY)
  );

  if (movement.type === "step") {
    return allowedVectors.some((vector) => {
      const distance = Math.max(Math.abs(actual.dx), Math.abs(actual.dy));
      return (
        distance > 0 &&
        distance <= movement.maxDistance &&
        actual.dx === vector.dx * distance &&
        actual.dy === vector.dy * distance
      );
    });
  }

  return allowedVectors.some((vector) => {
    const aligned =
      vector.dx === 0
        ? actual.dx === 0 && Math.sign(actual.dy) === vector.dy
        : vector.dy === 0
          ? actual.dy === 0 && Math.sign(actual.dx) === vector.dx
          : Math.abs(actual.dx) === Math.abs(actual.dy) &&
            Math.sign(actual.dx) === vector.dx &&
            Math.sign(actual.dy) === vector.dy;

    return aligned && pathClear(from, to, state);
  });
}

function directionToVector(direction: Direction, forwardY: 1 | -1): Vector {
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
