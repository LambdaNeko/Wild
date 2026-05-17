import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { AnimalType, GameState, Position, QuantumToken } from "../domain/types";

type LegalMoveHint = {
  position: Position;
  animals: AnimalType[];
};

type AnimationCue = {
  id: number;
  movedTokenId: string;
  from: Position | null;
  to: Position;
  actionType: "move" | "drop";
  movingToken: QuantumToken | null;
  fixedTokenIds: string[];
};

type BoardProps = {
  state: GameState;
  selectedTokenId: string | null;
  legalMoves: Position[];
  legalMoveHints: LegalMoveHint[];
  animationCue: AnimationCue | null;
  openingRevealTokens: Record<string, AnimalType>;
  onCellClick: (position: Position) => void;
  onTokenSelect: (tokenId: string) => void;
};

type BoardObjectUserData =
  | { kind: "cell"; position: Position }
  | { kind: "token"; tokenId: string };

type BoardScene = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  boardGroup: THREE.Group;
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  clickableObjects: THREE.Object3D[];
  boardSize: { width: number; height: number };
  frameId: number | null;
  cleanupScene: () => void;
  resizeObserver: ResizeObserver;
};

const CELL_SIZE = 1;
const CELL_GAP = 0.1;
const CELL_HEIGHT = 0.09;
const TOKEN_SIZE = 0.78;
const TOKEN_Y = 0.13;
const TOKEN_IMAGE_LIFT = 0.04;
const LEGAL_Y = 0.17;
const BOARD_DEPTH = 0.18;
const TOKEN_TILT = -Math.PI / 2;
const ANIMATION_DURATION_MS = 560;

const textureCache = new Map<string, THREE.Texture>();
const tokenTextureOverrides: Partial<Record<AnimalType | "mystery", string>> = {
  deer: "deer-komorebi.png",
  fox: "fox-komorebi.png",
  frog: "frog-komorebi.png",
  king: "king-komorebi.png",
  mystery: "mystery-komorebi.png",
  owl: "owl-komorebi.png",
  rabbit: "rabbit-komorebi.png",
  snake: "snake-komorebi.png",
  wolf: "wolf-komorebi.png"
};

export function Board({
  state,
  selectedTokenId,
  legalMoves,
  legalMoveHints,
  animationCue,
  openingRevealTokens,
  onCellClick,
  onTokenSelect
}: BoardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<BoardScene | null>(null);
  const latestHandlers = useRef({ onCellClick, onTokenSelect });
  const latestInputState = useRef({ selectedTokenId, state });
  latestHandlers.current = { onCellClick, onTokenSelect };
  latestInputState.current = { selectedTokenId, state };

  const boardLabel = useMemo(
    () => `${state.definition.name} ${state.definition.board.width}x${state.definition.board.height} 3D盤面`,
    [state.definition]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = "board-canvas";
    renderer.domElement.setAttribute("aria-label", boardLabel);
    renderer.domElement.setAttribute("role", "img");
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    const boardGroup = new THREE.Group();
    scene.add(boardGroup);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8eb57b, 2.2));
    const keyLight = new THREE.DirectionalLight(0xfff8de, 2.4);
    keyLight.position.set(-3.5, 6, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x8bd6ff, 0.75);
    fillLight.position.set(4, 3, -4);
    scene.add(fillLight);

    const sceneState: BoardScene = {
      renderer,
      scene,
      camera,
      boardGroup,
      raycaster: new THREE.Raycaster(),
      pointer: new THREE.Vector2(),
      clickableObjects: [],
      boardSize: { width: 0, height: 0 },
      frameId: null,
      cleanupScene: () => undefined,
      resizeObserver: new ResizeObserver(() => resizeBoardScene(container, renderer, camera))
    };
    sceneRef.current = sceneState;

    function handlePointerDown(event: PointerEvent) {
      const current = sceneRef.current;
      if (!current) {
        return;
      }

      const rect = current.renderer.domElement.getBoundingClientRect();
      current.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      current.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      current.raycaster.setFromCamera(current.pointer, current.camera);
      const hits = current.raycaster.intersectObjects(current.clickableObjects, false);
      const tokenHit = hits.find((hit) => hit.object.userData.kind === "token");

      if (tokenHit?.object.userData.kind === "token") {
        const tokenId = tokenHit.object.userData.tokenId;
        const { selectedTokenId: currentSelectedTokenId, state: currentState } =
          latestInputState.current;
        const token = currentState.tokens.find((item) => item.id === tokenId);

        if (!currentSelectedTokenId || token?.currentOwner === currentState.turn) {
          latestHandlers.current.onTokenSelect(tokenId);
          return;
        }

        const position = token?.position ?? raycastBoardPosition(current);
        if (position) {
          latestHandlers.current.onCellClick(position);
        }
        return;
      }

      const position = raycastBoardPosition(current);
      if (position) {
        latestHandlers.current.onCellClick(position);
      }
    }

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    sceneState.resizeObserver.observe(container);
    resizeBoardScene(container, renderer, camera);

    return () => {
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      sceneState.resizeObserver.disconnect();
      if (sceneState.frameId !== null) {
        window.cancelAnimationFrame(sceneState.frameId);
      }
      sceneState.cleanupScene();
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
    };
  }, [boardLabel]);

  useEffect(() => {
    const current = sceneRef.current;
    if (!current) {
      return;
    }

    current.renderer.domElement.setAttribute("aria-label", boardLabel);
    current.cleanupScene();
    buildBoardScene(current, {
      state,
      selectedTokenId,
      legalMoves,
      legalMoveHints,
      animationCue,
      openingRevealTokens
    });
  }, [
    animationCue,
    boardLabel,
    legalMoveHints,
    legalMoves,
    openingRevealTokens,
    selectedTokenId,
    state
  ]);

  return (
    <div
      ref={containerRef}
      className="board board-3d"
      style={{ aspectRatio: `${state.definition.board.width} / ${state.definition.board.height}` }}
    />
  );
}

function resizeBoardScene(
  container: HTMLDivElement,
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera
) {
  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function raycastBoardPosition(boardScene: BoardScene): Position | null {
  const intersection = new THREE.Vector3();
  const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  if (!boardScene.raycaster.ray.intersectPlane(boardPlane, intersection)) {
    return null;
  }

  const localPosition = boardScene.boardGroup.worldToLocal(intersection);
  const x = Math.round(localPosition.x / (CELL_SIZE + CELL_GAP));
  const y = Math.round(localPosition.z / (CELL_SIZE + CELL_GAP));

  if (
    x < 0 ||
    y < 0 ||
    x >= boardScene.boardSize.width ||
    y >= boardScene.boardSize.height
  ) {
    return null;
  }

  return { x, y };
}

function buildBoardScene(
  boardScene: BoardScene,
  props: Pick<
    BoardProps,
    | "state"
    | "selectedTokenId"
    | "legalMoves"
    | "legalMoveHints"
    | "animationCue"
    | "openingRevealTokens"
  >
) {
  const { state, selectedTokenId, legalMoves, legalMoveHints, animationCue, openingRevealTokens } = props;
  const boardWidth = state.definition.board.width;
  const boardHeight = state.definition.board.height;
  const renderItems: { dispose: () => void }[] = [];
  const animatedObjects: Array<{
    object: THREE.Object3D;
    from: THREE.Vector3;
    to: THREE.Vector3;
    start: number;
    duration: number;
  }> = [];

  boardScene.clickableObjects = [];
  boardScene.boardSize = { width: boardWidth, height: boardHeight };
  boardScene.boardGroup.clear();
  boardScene.boardGroup.position.set(
    -((boardWidth - 1) * (CELL_SIZE + CELL_GAP)) / 2,
    0,
    -((boardHeight - 1) * (CELL_SIZE + CELL_GAP)) / 2
  );
  positionCamera(boardScene.camera, boardWidth, boardHeight);

  const base = createDisposableMesh(
    new THREE.BoxGeometry(
      boardWidth * (CELL_SIZE + CELL_GAP) + 0.38,
      BOARD_DEPTH,
      boardHeight * (CELL_SIZE + CELL_GAP) + 0.38
    ),
    new THREE.MeshStandardMaterial({
      color: 0xd9ee99,
      roughness: 0.8,
      metalness: 0.02
    })
  );
  base.position.set(
    ((boardWidth - 1) * (CELL_SIZE + CELL_GAP)) / 2,
    -0.11,
    ((boardHeight - 1) * (CELL_SIZE + CELL_GAP)) / 2
  );
  base.receiveShadow = true;
  boardScene.boardGroup.add(base);
  renderItems.push(base);

  for (let y = 0; y < boardHeight; y += 1) {
    for (let x = 0; x < boardWidth; x += 1) {
      const position = { x, y };
      const isLegal = hasPosition(legalMoves, position);
      const cell = createCell(position, isLegal);
      boardScene.boardGroup.add(cell);
      boardScene.clickableObjects.push(cell);
      renderItems.push(cell);

      if (isLegal) {
        const hint = legalMoveHints.find((move) => samePosition(move.position, position));
        const marker = createLegalMarker(position, hint?.animals.length ?? 0);
        boardScene.boardGroup.add(marker);
        renderItems.push(marker);
      }
    }
  }

  state.tokens
    .filter((token) => token.location === "board" && token.position !== null)
    .filter(
      (token) =>
        !(
          animationCue?.actionType === "move" &&
          token.id === animationCue.movedTokenId
        )
    )
    .forEach((token) => {
      const tokenMesh = createTokenMesh(token, {
        selected: token.id === selectedTokenId,
        fixedNow: Boolean(animationCue?.fixedTokenIds.includes(token.id)),
        movingAway: false,
        openingRevealAnimalId: openingRevealTokens[token.id]
      });
      tokenMesh.position.copy(positionToVector(token.position!, TOKEN_Y));
      boardScene.boardGroup.add(tokenMesh);
      boardScene.clickableObjects.push(...getClickableTokenObjects(tokenMesh));
      renderItems.push(tokenMesh);

      if (
        animationCue?.actionType === "drop" &&
        token.id === animationCue.movedTokenId &&
        samePosition(token.position!, animationCue.to)
      ) {
        tokenMesh.scale.setScalar(0.2);
        animatedObjects.push({
          object: tokenMesh,
          from: positionToVector(animationCue.to, TOKEN_Y + 0.7),
          to: positionToVector(animationCue.to, TOKEN_Y),
          start: window.performance.now(),
          duration: ANIMATION_DURATION_MS
        });
      }
    });

  if (animationCue?.from && animationCue.movingToken) {
    const movingToken = createTokenMesh(animationCue.movingToken, {
      selected: false,
      fixedNow: animationCue.fixedTokenIds.includes(animationCue.movedTokenId),
      movingAway: false,
      openingRevealAnimalId: openingRevealTokens[animationCue.movedTokenId]
    });
    movingToken.position.copy(positionToVector(animationCue.from, TOKEN_Y + 0.22));
    movingToken.userData = {};
    boardScene.boardGroup.add(movingToken);
    renderItems.push(movingToken);
    animatedObjects.push({
      object: movingToken,
      from: positionToVector(animationCue.from, TOKEN_Y + 0.22),
      to: positionToVector(animationCue.to, TOKEN_Y + 0.22),
      start: window.performance.now(),
      duration: ANIMATION_DURATION_MS
    });
  }

  if (animationCue) {
    const burst = createActionBurst(animationCue.to, animationCue.actionType);
    boardScene.boardGroup.add(burst);
    renderItems.push(burst);
  }

  const tick = () => {
    const now = window.performance.now();
    animatedObjects.forEach((item) => {
      const progress = Math.min(1, (now - item.start) / item.duration);
      const eased = easeOutCubic(progress);
      item.object.position.lerpVectors(item.from, item.to, eased);
      if (progress < 1 && item.object.scale.x < 1) {
        const scale = 0.2 + eased * 0.8;
        item.object.scale.setScalar(scale);
      }
    });
    boardScene.renderer.render(boardScene.scene, boardScene.camera);
    boardScene.frameId = window.requestAnimationFrame(tick);
  };

  if (boardScene.frameId !== null) {
    window.cancelAnimationFrame(boardScene.frameId);
  }
  tick();

  boardScene.cleanupScene = () => {
    if (boardScene.frameId !== null) {
      window.cancelAnimationFrame(boardScene.frameId);
      boardScene.frameId = null;
    }
    renderItems.forEach((item) => item.dispose());
    boardScene.boardGroup.clear();
    boardScene.clickableObjects = [];
    boardScene.cleanupScene = () => undefined;
  };
}

function positionCamera(camera: THREE.PerspectiveCamera, width: number, height: number) {
  const maxDimension = Math.max(width, height);
  camera.fov = 28;
  camera.position.set(0, maxDimension * 1.82 + 1.75, maxDimension * 0.78 + 1.08);
  camera.lookAt(0, 0, 0.22);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
}

function createCell(position: Position, legal: boolean) {
  const material = new THREE.MeshStandardMaterial({
    color: legal ? 0xfff8dc : 0xfff8e8,
    roughness: 0.62,
    metalness: 0.02,
    emissive: legal ? 0xd4f5a2 : 0xfff0c8,
    emissiveIntensity: legal ? 0.16 : 0.04
  });
  const cell = createDisposableMesh(
    new THREE.BoxGeometry(CELL_SIZE, CELL_HEIGHT, CELL_SIZE),
    material
  );
  cell.position.copy(positionToVector(position, 0));
  cell.castShadow = true;
  cell.receiveShadow = true;
  cell.userData = { kind: "cell", position } satisfies BoardObjectUserData;
  return cell;
}

function createLegalMarker(position: Position, animalCount: number) {
  const marker = createDisposableMesh(
    new THREE.RingGeometry(0.25, animalCount > 0 ? 0.43 : 0.39, 44),
    new THREE.MeshBasicMaterial({
      color: animalCount > 0 ? 0x6aaed1 : 0x6aaed1,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide
    })
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.copy(positionToVector(position, LEGAL_Y));
  return marker;
}

function createActionBurst(position: Position, actionType: AnimationCue["actionType"]) {
  const burst = createDisposableMesh(
    new THREE.RingGeometry(0.32, 0.47, 44),
    new THREE.MeshBasicMaterial({
      color: actionType === "drop" ? 0x7aee6f : 0xffe66d,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide
    })
  );
  burst.rotation.x = -Math.PI / 2;
  burst.position.copy(positionToVector(position, LEGAL_Y + 0.04));
  return burst;
}

function createTokenMesh(
  token: QuantumToken,
  options: {
    selected: boolean;
    fixedNow: boolean;
    movingAway: boolean;
    openingRevealAnimalId?: AnimalType;
  }
) {
  const fixedAnimal = token.candidates.length === 1 ? token.candidates[0] : null;
  const animalId = options.openingRevealAnimalId ?? fixedAnimal;
  const texture = loadTokenTexture(animalId ? `${animalId}.png` : "mystery.png");
  const group = new THREE.Group();
  const tokenUserData = { kind: "token", tokenId: token.id } satisfies BoardObjectUserData;

  const tokenPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(TOKEN_SIZE, TOKEN_SIZE),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.08,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      opacity: options.movingAway ? 0.24 : 1
    })
  );
  tokenPlane.rotation.x = TOKEN_TILT;
  tokenPlane.position.y = TOKEN_IMAGE_LIFT;
  tokenPlane.renderOrder = 30 + token.position!.y;
  tokenPlane.userData = tokenUserData;
  group.add(tokenPlane);

  const ownerColor = token.currentOwner === "A" ? 0xde7467 : 0x4d8fc3;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(TOKEN_SIZE * 0.45, TOKEN_SIZE * 0.53, 36),
    new THREE.MeshBasicMaterial({
      color: options.selected ? 0xf5ae39 : ownerColor,
      transparent: true,
      depthWrite: false,
      opacity: options.selected ? 0.95 : 0.42,
      side: THREE.DoubleSide
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.03;
  group.add(ring);

  if (options.fixedNow || options.selected) {
    const glow = new THREE.Mesh(
      new THREE.RingGeometry(TOKEN_SIZE * 0.56, TOKEN_SIZE * 0.63, 40),
      new THREE.MeshBasicMaterial({
        color: options.fixedNow ? 0xffef6b : 0xf5ae39,
        transparent: true,
        depthWrite: false,
        opacity: options.fixedNow ? 0.72 : 0.6,
        side: THREE.DoubleSide
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -0.025;
    group.add(glow);
  }

  group.position.y += options.selected ? 0.08 : 0;

  return createDisposableGroup(group);
}

function positionToVector(position: Position, y: number) {
  return new THREE.Vector3(
    position.x * (CELL_SIZE + CELL_GAP),
    y,
    position.y * (CELL_SIZE + CELL_GAP)
  );
}

function loadTokenTexture(fileName: string) {
  const assetName = fileName.replace(/\.png$/, "") as AnimalType | "mystery";
  const resolvedFileName = tokenTextureOverrides[assetName] ?? fileName;
  const url = `${import.meta.env.BASE_URL}assets/tokens/${resolvedFileName}`;
  const cached = textureCache.get(url);
  if (cached) {
    return cached;
  }

  const texture = new THREE.TextureLoader().load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  textureCache.set(url, texture);
  return texture;
}

function createDisposableMesh<
  TGeometry extends THREE.BufferGeometry,
  TMaterial extends THREE.Material
>(geometry: TGeometry, material: TMaterial) {
  const mesh = new THREE.Mesh(geometry, material) as THREE.Mesh<TGeometry, TMaterial> & {
    dispose: () => void;
  };
  mesh.dispose = () => {
    geometry.dispose();
    material.dispose();
  };
  return mesh;
}

function createDisposableGroup(group: THREE.Group) {
  const disposableGroup = group as THREE.Group & { dispose: () => void };
  disposableGroup.dispose = () => {
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
  };
  return disposableGroup;
}

function getClickableTokenObjects(group: THREE.Group) {
  const objects: THREE.Object3D[] = [];
  group.traverse((object) => {
    if (object instanceof THREE.Mesh && object.userData.kind === "token") {
      objects.push(object);
    }
  });
  return objects;
}

function hasPosition(positions: Position[], position: Position) {
  return positions.some((item) => samePosition(item, position));
}

function samePosition(first: Position, second: Position) {
  return first.x === second.x && first.y === second.y;
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}
