# Rockets

A Minecraft **Bedrock Edition** add-on and **Java Edition** (Fabric) mod with rockets, from a water bottle rocket you pump up by hand to a space rocket for four that flies to the edge of the sky. It also has a jetpack, rocket boosts, launch pads and a Mission Control that counts down from 10.

**Download and info: https://ulfendk.github.io/minecraft-rockets/** (på dansk: https://ulfendk.github.io/minecraft-rockets/da/)

![The rockets](https://ulfendk.github.io/minecraft-rockets/img/rockets/space_rocket.png)

## Features
- **Water Bottle Rocket.** Fill it with a water bucket and pump it up by hand. Pump once more at full pressure and it shoots up to 24 blocks in a spray of water. Without water it barely leaves the ground.
- **Model Rocket.** Load it with gunpowder and light it with flint and steel. It climbs 48 blocks, pops a parachute and floats back down, ready to fly again.
- **Sky Rocket.** A rocket for one with a glass cockpit. Load rocket fuel, climb in and press Jump. After a three-second countdown it flies you about 100 blocks up.
- **Space Rocket.** A two-stage rocket with a capsule for four. It only lifts off from a launch pad and flies to the build limit.
- **Parachutes.** At the top everyone gets out under a parachute, steers with the movement keys and lands without fall damage. Sneak out of a rocket in mid-air and a parachute opens too. Rockets parachute down as well, so you can use them again.
- **Mission Control.** Right-click it to count down from 10 on the screen of everyone nearby. Every fuelled rocket on a launch pad within 16 blocks lifts off at zero. Right-click again to abort.
- **Jetpack.** Wear it in the chest slot, jump, then hold Jump to fly. The durability bar is the fuel, and Rocket Fuel tops it up. If you fall fast, it catches you.
- **Rocket Boost.** Use it to be thrown up and forward. It pushes harder while gliding with an elytra.
- A Rocket Manual, given to every player, and recipes for everything.
- English and Danish.

## How to fly
| | Bedrock | Java Edition |
| --- | --- | --- |
| Fill, fuel, pump, light | Right-click the rocket with a water bucket, gunpowder, rocket fuel, flint and steel, or an empty hand | Same |
| Climb in / get out | Right-click / sneak | Right-click / sneak |
| Launch | Jump while aboard | Space while aboard |
| Steer the parachute | Movement keys or stick | W/A/S/D |
| Jetpack | Jump, then hold Jump | Space, then hold Space |

## Install
1. Download `Rockets.mcaddon` from the [latest release](https://github.com/ulfendk/minecraft-rockets/releases/latest).
2. Open it on Windows, Android or iOS. Minecraft imports both packs.
3. In your world settings, turn on **Rockets** under *Behavior Packs*.

Requires Minecraft Bedrock 1.21.90 or newer.

### Java Edition
1. Install [Fabric Loader](https://fabricmc.net/use/installer/) for Minecraft 26.3.
2. Download `rockets-fabric-<version>.jar` from the [latest release](https://github.com/ulfendk/minecraft-rockets/releases/latest), plus [Fabric API](https://modrinth.com/mod/fabric-api) and [GeckoLib](https://modrinth.com/mod/geckolib).
3. Put all three in your `mods` folder.

## Development
Everything is generated from code. The models, textures and animations come from the specs in `src/rockets/`, built in the same way as [Construction Machines](https://github.com/ulfendk/minecraft-machines).

```sh
npm ci
npm run build      # writes build/behavior_pack, build/resource_pack and java/src/generated/resources
npm run validate   # static checks of the packs and the Java resources
npm test           # unit tests (flight model, specs)
npm run preview    # renders every rocket to build/preview/*.png
npm run package    # dist/*.mcaddon and *.mcpack
npm run site       # the website, in build/site/
npm run test:server  # loads the packs in a Bedrock Dedicated Server and flies the rockets (needs Docker)

cd java                       # Java edition (needs JDK 25; run `npm run build` first)
./gradlew build               # the Fabric mod jar in java/build/libs
./gradlew runGameTest         # server-side game tests: flights, parachutes, Mission Control, jetpack, boost
./gradlew runClientGameTest   # starts a client, screenshots every rocket, launches one with Jump, flies the jetpack
./gradlew runClient           # play it
```

A flight is one pure step function: `src/lib/flight.mjs` goes from countdown to burn, coast, then parachute or free fall. The Bedrock scripts run that same file (`scripts/flight.js`). `dk.ulfen.rockets.rocket.Flight` does the same steps on Java, and a game test checks that both editions fly every rocket to the same height, tick for tick.

| Path | What it is |
| --- | --- |
| `src/rockets/*.mjs` | One file per rocket: model, materials, fuel, how it launches, flight numbers, recipe, icon |
| `src/lib/` | Generators: model + UV packing, textures, parts, flight model, animations, entity JSON |
| `src/gear.mjs`, `src/items.mjs`, `src/blocks.mjs` | Parachute and jetpack models, items, launch pad and Mission Control |
| `src/packs/` | Hand-written pack files, including the Script API code in `behavior_pack/scripts/` |
| `src/lang.mjs`, `src/i18n.mjs` | In-game texts and website texts, English and Danish |
| `tools/` | Build, validation, preview renderer, packaging, website, server test, Java resources |
| `java/` | The Fabric mod (Java edition) |

### Adding a rocket
Copy a similar spec in `src/rockets/`. Add its id to `ORDER` in `src/lib/rockets.mjs`, and its Danish name and description to `src/i18n.mjs`. Run `npm run preview <id>` and look at `build/preview/<id>.png`.

### Releases
Bump `version` in `package.json`, add a section to `CHANGELOG.md`, then push a tag such as `v0.2.0`. The release workflow builds and tests both editions, publishes a GitHub Release with the files and updates the website.

## License
MIT. Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.
