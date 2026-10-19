import { system, world } from '@minecraft/server';
import { setupGear } from './gear.js';
import { setupManual } from './manual.js';
import { setupMissionControl } from './mission.js';
import { setupParachutes } from './parachute.js';
import { setupPlacing } from './place.js';
import { setupRockets } from './rockets.js';
import { selfTest } from './selftest.js';
import { NS } from './util.js';

setupPlacing(); // registers custom components at startup

world.afterEvents.worldLoad.subscribe(() => {
  setupRockets();
  setupParachutes();
  setupMissionControl();
  setupGear();
  setupManual();
  console.log('[Rockets] loaded');
});

system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id === `${NS}:selftest`) selfTest(event.message);
});
