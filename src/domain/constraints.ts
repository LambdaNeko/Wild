import type { AnimalType, GameState, QuantumToken } from "./types";

export function propagateGlobalConstraints(state: GameState): GameState {
  let next = state;
  let changed = true;

  while (changed) {
    changed = false;

    for (const player of next.definition.players) {
      for (const animal of next.definition.animals) {
        const originalTokens = next.tokens.filter(
          (token) => token.originalSide === player.id
        );
        const fixedCount = originalTokens.filter(
          (token) => token.candidates.length === 1 && token.candidates[0] === animal.id
        ).length;

        if (fixedCount === animal.count) {
          const withoutAnimal = removeCandidateFromUnfixed(
            next.tokens,
            player.id,
            animal.id
          );
          if (withoutAnimal.changed) {
            next = { ...next, tokens: withoutAnimal.tokens };
            changed = true;
          }
        }

        const possibleCount = originalTokens.filter((token) =>
          token.candidates.includes(animal.id)
        ).length;

        if (possibleCount === animal.count) {
          const fixedRequiredAnimal = keepOnlyCandidateForAnimal(
            next.tokens,
            player.id,
            animal.id
          );
          if (fixedRequiredAnimal.changed) {
            next = { ...next, tokens: fixedRequiredAnimal.tokens };
            changed = true;
          }
        }
      }

      const subsetConstrained = applyAnimalSubsetConstraints(
        next.tokens,
        player.id,
        next.definition.animals.map((animal) => ({
          id: animal.id,
          count: animal.count
        }))
      );
      if (subsetConstrained.changed) {
        next = { ...next, tokens: subsetConstrained.tokens };
        changed = true;
      }
    }
  }

  return next;
}

function removeCandidateFromUnfixed(
  tokens: QuantumToken[],
  originalSide: string,
  animal: AnimalType
): { tokens: QuantumToken[]; changed: boolean } {
  let changed = false;
  const next = tokens.map((token) => {
    if (
      token.originalSide !== originalSide ||
      token.candidates.length === 1 ||
      !token.candidates.includes(animal)
    ) {
      return token;
    }

    changed = true;
    return {
      ...token,
      candidates: token.candidates.filter((candidate) => candidate !== animal)
    };
  });

  return { tokens: next, changed };
}

function keepOnlyCandidateForAnimal(
  tokens: QuantumToken[],
  originalSide: string,
  animal: AnimalType
): { tokens: QuantumToken[]; changed: boolean } {
  let changed = false;
  const next = tokens.map((token) => {
    if (
      token.originalSide !== originalSide ||
      !token.candidates.includes(animal) ||
      (token.candidates.length === 1 && token.candidates[0] === animal)
    ) {
      return token;
    }

    changed = true;
    return {
      ...token,
      candidates: [animal]
    };
  });

  return { tokens: next, changed };
}

function applyAnimalSubsetConstraints(
  tokens: QuantumToken[],
  originalSide: string,
  animals: Array<{ id: AnimalType; count: number }>
): { tokens: QuantumToken[]; changed: boolean } {
  let next = tokens;
  let changed = false;

  for (const subset of getAnimalSubsets(animals.map((animal) => animal.id))) {
    if (subset.length === 0 || subset.length === animals.length) {
      continue;
    }

    const subsetSet = new Set(subset);
    const requiredCount = animals
      .filter((animal) => subsetSet.has(animal.id))
      .reduce((sum, animal) => sum + animal.count, 0);
    const constrainedTokens = next.filter(
      (token) =>
        token.originalSide === originalSide &&
        token.candidates.length > 0 &&
        token.candidates.every((candidate) => subsetSet.has(candidate))
    );

    if (constrainedTokens.length !== requiredCount) {
      continue;
    }

    const constrainedIds = new Set(constrainedTokens.map((token) => token.id));
    next = next.map((token) => {
      if (
        token.originalSide !== originalSide ||
        constrainedIds.has(token.id) ||
        !token.candidates.some((candidate) => subsetSet.has(candidate))
      ) {
        return token;
      }

      changed = true;
      return {
        ...token,
        candidates: token.candidates.filter((candidate) => !subsetSet.has(candidate))
      };
    });
  }

  return { tokens: next, changed };
}

function getAnimalSubsets(animals: AnimalType[]): AnimalType[][] {
  const subsets: AnimalType[][] = [];
  const subsetCount = 2 ** animals.length;

  for (let mask = 1; mask < subsetCount; mask += 1) {
    const subset = animals.filter((_, index) => (mask & (1 << index)) !== 0);
    subsets.push(subset);
  }

  return subsets;
}
