package dk.ulfen.rockets.test;

import java.util.List;

import dk.ulfen.rockets.ModRegistry;
import dk.ulfen.rockets.rocket.Flight;
import dk.ulfen.rockets.rocket.RocketEntity;
import dk.ulfen.rockets.rocket.RocketSpec;
import net.fabricmc.fabric.api.client.gametest.v1.FabricClientGameTest;
import net.fabricmc.fabric.api.client.gametest.v1.context.ClientGameTestContext;
import net.fabricmc.fabric.api.client.gametest.v1.context.TestServerContext;
import net.fabricmc.fabric.api.client.gametest.v1.context.TestSingleplayerContext;
import net.minecraft.client.CameraType;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.phys.AABB;

/**
 * Starts a real client: screenshots every rocket on a launch pad and with its engine and
 * parachute out (images land in build/run/clientGameTest/screenshots), then boards the sky
 * rocket and presses Jump, which checks the key -> server -> countdown path, and flies the
 * jetpack by holding Jump. `-Procket.screenshot=sky_rocket` limits the screenshots.
 */
public class RocketClientGameTest implements FabricClientGameTest {
	@Override
	public void runTest(ClientGameTestContext context) {
		try (TestSingleplayerContext world = context.worldBuilder().create()) {
			TestServerContext server = world.getServer();
			server.runCommand("time set noon");
			server.runCommand("weather clear");
			server.runCommand("gamerule advance_time false");
			server.runCommand("gamerule spawn_mobs false");
			server.runCommand("gamemode creative @a");
			context.waitTicks(40);

			String filter = System.getProperty("rockets.screenshot");
			List<String> only = filter == null ? List.of() : List.of(filter.split(","));
			for (RocketSpec spec : ModRegistry.SPECS) {
				if (!only.isEmpty() && !only.contains(spec.id)) continue;
				server.runCommand("kill @e[type=!player]");
				server.runCommand("fill -10 -61 -10 10 -61 10 minecraft:grass_block");
				server.runCommand("fill -10 -60 -10 10 -40 10 minecraft:air");
				server.runCommand("setblock 0 -60 0 rockets:launch_pad");
				server.runCommand("summon rockets:" + spec.id + " 0.5 -59.75 0.5 {Rotation:[0f,0f]}");
				context.waitTicks(10);
				double d = 3 + spec.height * 0.9;
				look(context, server, d * 0.7, -60 + spec.height * 0.6, -d * 0.7, 45, 10);
				context.takeScreenshot("rocket_" + spec.id + "_pad");
				// The same rocket with its engine burning, then (after a short hop) under its parachute.
				server.runOnServer(s -> rocket(s.overworld(), spec.id).launchTo(40, 0));
				context.waitTicks(3);
				context.takeScreenshot("rocket_" + spec.id + "_burn");
				server.runCommand("kill @e[type=rockets:" + spec.id + "]");
				server.runCommand("summon rockets:" + spec.id + " 0.5 -59.75 0.5 {Rotation:[0f,0f]}");
				context.waitTicks(5);
				server.runOnServer(s -> rocket(s.overworld(), spec.id).launchTo(2, 0));
				context.waitTicks(25);
				context.takeScreenshot("rocket_" + spec.id + "_chute");
			}

			// Board the sky rocket and press Jump: the countdown starts.
			server.runCommand("kill @e[type=!player]");
			server.runCommand("gamemode survival @a");
			server.runCommand("summon rockets:sky_rocket 0.5 -60 0.5 {Rotation:[0f,0f]}");
			context.waitTicks(5);
			server.runOnServer(s -> rocket(s.overworld(), "sky_rocket").setFuel(1));
			server.runCommand("ride @p mount @e[type=rockets:sky_rocket,limit=1]");
			context.waitTicks(10);
			context.runOnClient(mc -> mc.options.setCameraType(CameraType.THIRD_PERSON_BACK));
			context.getInput().holdKey(o -> o.keyJump);
			context.waitTicks(5);
			context.getInput().releaseKey(o -> o.keyJump);
			context.waitTicks(5);
			int phase = server.computeOnServer(s -> rocket(s.overworld(), "sky_rocket").phase());
			System.out.println("[rockets-test] sky rocket phase after Jump: " + phase);
			if (phase == Flight.IDLE) throw new AssertionError("Jump did not start the countdown");
			context.waitTicks(90);
			context.takeScreenshot("ride_sky_rocket");
			context.waitTicks(200);
			context.takeScreenshot("ride_parachute");
			context.runOnClient(mc -> mc.options.setCameraType(CameraType.FIRST_PERSON));

			// The jetpack: hold Jump in the air and climb.
			server.runCommand("kill @e[type=!player]");
			server.runCommand("ride @p dismount");
			server.runCommand("tp @p 0 -60 0");
			context.waitTicks(40);
			server.runOnServer(s -> s.getPlayerList().getPlayers().getFirst().setItemSlot(EquipmentSlot.CHEST, new ItemStack(ModRegistry.JETPACK)));
			context.waitTicks(5);
			double before = server.computeOnServer(s -> s.getPlayerList().getPlayers().getFirst().getY());
			context.getInput().holdKey(o -> o.keyJump);
			context.waitTicks(40);
			context.getInput().releaseKey(o -> o.keyJump);
			double after = server.computeOnServer(s -> s.getPlayerList().getPlayers().getFirst().getY());
			System.out.printf("[rockets-test] jetpack climbed from %.1f to %.1f%n", before, after);
			context.runOnClient(mc -> mc.options.setCameraType(CameraType.THIRD_PERSON_BACK));
			context.takeScreenshot("jetpack");
			if (after - before < 4) throw new AssertionError("The jetpack did not lift the player (" + (after - before) + " blocks)");
		}
	}

	private static void look(ClientGameTestContext context, TestServerContext server, double x, double y, double z, float yaw, float pitch) {
		server.runCommand("tp @p " + x + " " + y + " " + z + " " + yaw + " " + pitch);
		context.waitTicks(5);
		context.runOnClient(mc -> {
			mc.player.setPos(x, y, z);
			mc.player.setYRot(yaw);
			mc.player.setXRot(pitch);
		});
		context.waitTicks(10);
	}

	private static RocketEntity rocket(net.minecraft.server.level.ServerLevel level, String id) {
		return level.getEntitiesOfClass(RocketEntity.class, new AABB(-200, -100, -200, 200, 400, 200), e -> e.spec.id.equals(id)).getFirst();
	}
}
