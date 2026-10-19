// Rocket spec -> Bedrock resource-pack client entity and render controller.
import { NS } from './constants.mjs';

export function buildClientEntity(spec) {
  return {
    format_version: '1.10.0',
    'minecraft:client_entity': {
      description: {
        identifier: `${NS}:${spec.id}`,
        materials: { default: 'entity_alphablend' },
        textures: { default: `textures/entity/${NS}/${spec.id}` },
        geometry: { default: `geometry.${NS}.${spec.id}` },
        animations: { move: `animation.${NS}.${spec.id}.move` },
        scripts: {
          animate: ['move'],
          ...(spec.scale !== 1 ? { scale: String(spec.scale) } : {}),
        },
        render_controllers: [`controller.render.${NS}.${spec.id}`],
        enable_attachables: false,
      },
    },
  };
}

export function buildRenderController(spec) {
  return {
    format_version: '1.8.0',
    render_controllers: {
      [`controller.render.${NS}.${spec.id}`]: {
        geometry: 'Geometry.default',
        materials: [{ '*': 'Material.default' }],
        textures: ['Texture.default'],
      },
    },
  };
}
