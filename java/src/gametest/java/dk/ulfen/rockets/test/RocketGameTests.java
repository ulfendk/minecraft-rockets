package dk.ulfen.rockets.test;

import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import com.google.gson.JsonElement;
import com.google.gson.JsonParser;
import dk.ulfen.rockets.ModRegistry;
import dk.ulfen.rockets.block.Countdowns;
import dk.ulfen.rockets.gear.Jetpack;
import dk.ulfen.rockets.gear.RocketBoostItem;
import dk.ulfen.rockets.rocket.Flight;
import dk.ulfen.rockets.rocket.ParachuteEntity;
import dk.ulfen.rockets.rocket.RocketEntity;
import dk.ulfen.rockets.rocket.RocketSpec;
import net.fabricmc.fabric.api.gametest.v1.GameTest;
import net.minecraft.core.BlockPos;
import net.minecraft.gametest.framework.GameTestHelper;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.EntityTypes;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.animal.pig.Pig;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;

/** Server-side checks run by `./gradlew runGameTest` (and in CI). */
public class RocketGameTests {
	private static RocketEntity spawn(GameTestHelper helper, String id, BlockPos pos) {
		return helper.spawn(ModRegistry.type(id), pos);
	}

	/** Every rocket can be placed and is still there two seconds later. */
	@GameTest(maxTicks = 100, structure = "rockets-test:empty_large")
	public void everyRocketSpawns(GameTestHelper helper) {
		List<RocketEntity> rockets = new ArrayList<>();
		int i = 0;
		for (RocketSpec s : ModRegistry.SPECS) rockets.add(spawn(helper, s.id, new BlockPos(4 + i++ * 8, 1, 8)));
		helper.runAfterDelay(40, () -> {
			for (RocketEntity r : rockets) if (!r.isAlive()) helper.fail("Rocket vanished: " + r.spec.id);
			helper.succeed();
		});
	}

	/** The Java flight model flies exactly like the JavaScript one (flight_fixtures.json). */
	@GameTest
	public void flightMatches(GameTestHelper helper) {
		try (var in = RocketGameTests.class.getResourceAsStream("/rockets/flight_fixtures.json")) {
			for (JsonElement el : JsonParser.parseReader(new InputStreamReader(in, StandardCharsets.UTF_8)).getAsJsonArray()) {
				var f = el.getAsJsonObject();
				RocketSpec s = ModRegistry.spec(f.get("id").getAsString());
				Flight.State st = Flight.launch(s.flight, f.get("target").getAsDouble(), s.flight.countdown);
				int tick = 0;
				for (JsonElement sample : f.getAsJsonArray("samples")) {
					var a = sample.getAsJsonArray();
					int at = a.get(0).getAsInt();
					while (tick < at) {
						st = Flight.step(st, s.flight, null, false);
						tick++;
					}
					if (st.phase != a.get(1).getAsInt() || Math.abs(st.y - a.get(2).getAsDouble()) > 1e-6 || Math.abs(st.vy - a.get(3).getAsDouble()) > 1e-6) {
						helper.fail(s.id + " tick " + at + ": phase " + st.phase + " y " + st.y + " vy " + st.vy + " but JavaScript says " + a);
					}
				}
			}
		} catch (java.io.IOException ex) {
			helper.fail(ex.toString());
		}
		helper.succeed();
	}

	/** Water and pressure: a full bottle rocket climbs well clear of the ground. */
	@GameTest(maxTicks = 200, structure = "rockets-test:empty_large")
	public void bottleRocketFlies(GameTestHelper helper) {
		RocketEntity r = spawn(helper, "bottle_rocket", new BlockPos(8, 1, 8));
		double start = r.getY();
		r.setFuel(1);
		r.setPressure(8);
		String missing = r.launch(-1, false);
		if (missing != null) helper.fail("Bottle rocket did not launch: " + missing);
		double[] top = {start};
		helper.onEachTick(() -> top[0] = Math.max(top[0], r.getY()));
		helper.runAfterDelay(150, () -> {
			if (top[0] - start < 15) helper.fail("Bottle rocket only climbed " + (top[0] - start));
			if (r.phase() != Flight.IDLE) helper.fail("Bottle rocket still flying (phase " + r.phase() + ")");
			if (Flight.targetHeight(r.spec.flight, 8, false, 999) >= Flight.targetHeight(r.spec.flight, 8, true, 999)) helper.fail("Dry is not lower than wet");
			helper.succeed();
		});
	}

	/** At the top the riders get out under a parachute and come down unhurt. */
	@GameTest(maxTicks = 600, structure = "rockets-test:empty_large")
	public void skyRocketParachutesRiders(GameTestHelper helper) {
		RocketEntity r = spawn(helper, "sky_rocket", new BlockPos(8, 1, 8));
		Pig pig = helper.spawn(EntityTypes.PIG, new BlockPos(10, 1, 8));
		pig.startRiding(r, true, false);
		r.setFuel(1);
		if (!pig.isPassenger()) helper.fail("The pig did not board");
		r.launchTo(20, 0);
		boolean[] chute = {false};
		helper.onEachTick(() -> {
			if (!helper.getLevel().getEntitiesOfClass(ParachuteEntity.class, new AABB(r.blockPosition()).inflate(40), c -> pig.getUUID().equals(c.owner())).isEmpty()) chute[0] = true;
		});
		helper.runAfterDelay(500, () -> {
			if (!chute[0]) helper.fail("No parachute opened over the rider");
			if (pig.isPassenger()) helper.fail("The rider is still aboard");
			if (!pig.isAlive() || pig.getHealth() < pig.getMaxHealth()) helper.fail("The rider got hurt: " + pig.getHealth());
			if (!pig.onGround()) helper.fail("The rider has not landed (y " + pig.getY() + ")");
			if (r.phase() != Flight.IDLE) helper.fail("The rocket has not landed (phase " + r.phase() + ")");
			helper.succeed();
		});
	}

	/** Mission Control launches a fuelled rocket on a pad when the countdown reaches zero. */
	@GameTest(maxTicks = 100, structure = "rockets-test:empty_large")
	public void missionControlLaunches(GameTestHelper helper) {
		BlockPos pad = new BlockPos(8, 1, 8);
		helper.setBlock(pad, ModRegistry.LAUNCH_PAD);
		helper.setBlock(new BlockPos(10, 1, 8), ModRegistry.MISSION_CONTROL);
		RocketEntity r = helper.spawn(ModRegistry.type("model_rocket"), Vec3.atBottomCenterOf(helper.absolutePos(pad)).add(0, 0.25, 0).subtract(Vec3.atLowerCornerOf(helper.absolutePos(BlockPos.ZERO))));
		r.setFuel(1);
		helper.runAfterDelay(2, () -> {
			if (!r.onPad()) helper.fail("The rocket is not on the pad");
			if (!Countdowns.toggle(helper.getLevel(), helper.absolutePos(new BlockPos(10, 1, 8)), null, 1)) helper.fail("The countdown did not start");
		});
		helper.runAfterDelay(40, () -> {
			if (!Flight.isFlying(r.phase())) helper.fail("Mission Control did not launch the rocket (phase " + r.phase() + ")");
			helper.succeed();
		});
	}

	/** No fuel, no flight; the space rocket only lifts off from a pad. */
	@GameTest(structure = "rockets-test:empty_large")
	public void noFuelNoLaunch(GameTestHelper helper) {
		RocketEntity empty = spawn(helper, "sky_rocket", new BlockPos(6, 1, 8));
		RocketEntity space = spawn(helper, "space_rocket", new BlockPos(14, 1, 8));
		space.setFuel(4);
		if (!"rockets.hud.need_fuel".equals(empty.launch(-1, false))) helper.fail("An empty rocket launched");
		if (!"rockets.hud.need_pad".equals(space.launch(-1, false))) helper.fail("The space rocket launched without a pad");
		helper.succeed();
	}

	/** Firing the jetpack spends fuel; Rocket Fuel tops it up. */
	@GameTest(structure = "rockets-test:empty_large")
	@SuppressWarnings("removal")
	public void jetpackUsesFuel(GameTestHelper helper) {
		ServerPlayer player = helper.makeMockServerPlayerInLevel();
		player.setItemSlot(EquipmentSlot.CHEST, new ItemStack(ModRegistry.JETPACK));
		player.teleportTo(player.getX(), player.getY() + 5, player.getZ());
		player.setOnGround(false);
		int before = Jetpack.fuelLeft(Jetpack.worn(player));
		for (int i = 0; i < 10; i++) Jetpack.serverThrust(player);
		int after = Jetpack.fuelLeft(Jetpack.worn(player));
		if (after != before - 10) helper.fail("Fuel went from " + before + " to " + after);
		Jetpack.refuel(player);
		if (Jetpack.fuelLeft(Jetpack.worn(player)) != before) helper.fail("Refuelling did not fill it back up");
		Vec3 v = Jetpack.thrust(Vec3.ZERO, new Vec3(0, 0, 1));
		if (v.y <= 0 || v.z <= 0) helper.fail("Thrust does not push up and forward: " + v);
		helper.succeed();
	}

	/** A rocket boost throws you up and forward, harder when gliding, and you land softly. */
	@GameTest(structure = "rockets-test:empty_large")
	@SuppressWarnings("removal")
	public void boostPushesUp(GameTestHelper helper) {
		Vec3 look = new Vec3(0, 0, 1);
		Vec3 walking = RocketBoostItem.boost(look, false), gliding = RocketBoostItem.boost(look, true);
		if (walking.y <= 0.5 || walking.z <= 1) helper.fail("Boost too weak: " + walking);
		if (gliding.z <= walking.z) helper.fail("Gliding is not faster");
		ServerPlayer player = helper.makeMockServerPlayerInLevel();
		ItemStack boost = new ItemStack(ModRegistry.ROCKET_BOOST, 2);
		player.setItemInHand(net.minecraft.world.InteractionHand.MAIN_HAND, boost);
		ModRegistry.ROCKET_BOOST.use(helper.getLevel(), player, net.minecraft.world.InteractionHand.MAIN_HAND);
		if (!player.hasEffect(MobEffects.SLOW_FALLING)) helper.fail("No soft landing");
		if (player.getDeltaMovement().y <= 0.5) helper.fail("Not thrown up: " + player.getDeltaMovement());
		helper.succeed();
	}
}
