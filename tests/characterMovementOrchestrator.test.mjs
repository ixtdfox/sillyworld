import test from 'node:test';
import assert from 'node:assert/strict';
import { Character, CharacterRelations, PlayerController, AIController } from '../src/world/character/index.ts';
import { CharacterMovementOrchestrator } from '../src/world/movement/characterMovementOrchestrator.ts';

function createVector3Class() {
  return class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    subtract(other) { return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z); }
    length() { return Math.hypot(this.x, this.y, this.z); }
    normalize() { const len = this.length() || 1; return new Vector3(this.x / len, this.y / len, this.z / len); }
    scale(multiplier) { return new Vector3(this.x * multiplier, this.y * multiplier, this.z * multiplier); }
    addInPlace(other) { this.x += other.x; this.y += other.y; this.z += other.z; return this; }
  };
}

function createRuntime() {
  let beforeRender = null;
  return {
    BABYLON: { Vector3: createVector3Class() },
    engine: { getDeltaTime: () => 250 },
    scene: {
      onBeforeRenderObservable: {
        add: (callback) => { beforeRender = callback; return callback; },
        remove: () => { beforeRender = null; }
      }
    },
    renderFrames: (count = 1) => { for (let i = 0; i < count; i += 1) beforeRender?.(); }
  };
}

function createCharacter(controller) {
  return new Character({
    identity: { id: 'char:1', name: 'Char', kind: 'npc' },
    controller,
    relations: new CharacterRelations('char:1'),
    runtimeState: { cell: { x: 0, z: 0 }, currentNodeId: null, homeNodeId: null, hpCurrent: 10 }
  });
}

test('orchestrator executes movement while controller only supplies intent', () => {
  const runtime = createRuntime();
  const rootNode = {
    position: {
      x: 0.5,
      y: 0,
      z: 0.5,
      copyFrom(other) { this.x = other.x; this.y = other.y; this.z = other.z; }
    },
    gridCell: { x: 0, z: 0 }
  };
  const controller = new PlayerController(() => ({ x: 2, z: 0 }));
  const character = createCharacter(controller);

  const orchestrator = new CharacterMovementOrchestrator(runtime, {
    character,
    rootNode,
    gridMapper: {
      worldToGridCell: ({ x, z }) => ({ x: Math.floor(x), z: Math.floor(z) }),
      gridCellToWorld: ({ x, z }, transform = {}) => ({
        x: x + 0.5,
        y: typeof transform.resolveY === 'function' ? transform.resolveY({ x: x + 0.5, z: z + 0.5 }) : 0,
        z: z + 0.5
      })
    },
    grid: {
      findPath: () => [{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 2, z: 0 }],
      isCellWalkable: () => true
    },
    resolveGroundY: ({ fallbackY = 0 }) => fallbackY,
    BABYLON: runtime.BABYLON
  });

  orchestrator.attach();
  runtime.renderFrames(6);

  assert.deepEqual({ x: character.getCell().x, z: character.getCell().z }, { x: 2, z: 0 });
  assert.equal(rootNode.position.x, 2.5);
});

test('AIController does not mutate transforms and only emits intents', () => {
  const rootNode = Object.freeze({ position: Object.freeze({ x: 5, y: 1, z: 9 }) });
  const destination = { x: 3, z: 4 };
  const aiController = new AIController(() => destination);
  const character = createCharacter(aiController);

  const intent = aiController.issueIntent(character);

  assert.deepEqual(intent, {
    kind: 'move',
    command: { destinationCell: destination, source: 'ai' }
  });
  assert.deepEqual(rootNode.position, { x: 5, y: 1, z: 9 });
});
