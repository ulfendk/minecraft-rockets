// Placing rockets from their items, and the block components (Mission Control).
import { system } from '@minecraft/server';
import { missionControlComponent } from './mission.js';
import { actionBar, blockAt, consume, isBlocking, NS, SPECS } from './util.js';

const FACES = { Up: [0, 1, 0], Down: [0, -1, 0], North: [0, 0, -1], South: [0, 0, 1], East: [1, 0, 0], West: [-1, 0, 0] };

/** Room for a rocket of `height` blocks standing at `at`? */
function hasRoom(dim, at, height) {
  for (let y = 0; y < Math.ceil(height); y++) if (isBlocking(blockAt(dim, at.x, at.y + y, at.z))) return false;
  return true;
}

export function spawnRocket(dim, id, at, yaw = 0) {
  const r = dim.spawnEntity(`${NS}:${id}`, at);
  r.setRotation({ x: 0, y: yaw });
  return r;
}

export function setupPlacing() {
  system.beforeEvents.startup.subscribe(({ itemComponentRegistry, blockComponentRegistry }) => {
    itemComponentRegistry.registerCustomComponent(`${NS}:placer`, {
      onUseOn(e) {
        const player = e.source;
        if (player?.typeId !== 'minecraft:player') return;
        const id = e.itemStack.typeId.split(':')[1];
        const spec = SPECS[`${NS}:${id}`];
        const onPadBlock = e.block.typeId === `${NS}:launch_pad` && e.blockFace === 'Up';
        const [dx, dy, dz] = FACES[e.blockFace] ?? [0, 1, 0];
        // On a launch pad the rocket stands on the pad itself (it is only 4 pixels high).
        const at = onPadBlock
          ? { x: e.block.location.x + 0.5, y: e.block.location.y + 0.25, z: e.block.location.z + 0.5 }
          : { x: e.block.location.x + dx + 0.5, y: e.block.location.y + dy, z: e.block.location.z + dz + 0.5 };
        const yaw = player.getRotation().y;
        system.run(() => {
          if (!hasRoom(player.dimension, { ...at, y: Math.floor(at.y) + (onPadBlock ? 1 : 0) }, spec.height - (onPadBlock ? 0.75 : 0))) {
            actionBar(player, { translate: `${NS}.no_room` });
            return;
          }
          spawnRocket(player.dimension, id, at, yaw);
          player.dimension.playSound('random.anvil_use', at, { volume: 0.4, pitch: 1.4 });
          consume(player);
        });
      },
    });
    blockComponentRegistry.registerCustomComponent(`${NS}:mission_control`, missionControlComponent);
  });
}
