package dk.ulfen.rockets.gear;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import dk.ulfen.rockets.ModRegistry;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.phys.Vec3;

/**
 * Jetpack logic. The client pushes its own player up while Jump is held in the air (players
 * move client-side) and tells the server each tick (JetpackPayload); the server burns the
 * fuel, shows the flames and runs the stabiliser that catches a fast fall.
 */
public final class Jetpack {
	/** Upward push per tick of thrust, the most it climbs per tick, and how much it drifts the way you look. */
	public static final double LIFT = 0.12, MAX_CLIMB = 0.5, DRIFT = 0.04;

	private static final Map<UUID, Long> caught = new HashMap<>();

	private Jetpack() {}

	public static ItemStack worn(Player player) {
		ItemStack chest = player.getItemBySlot(EquipmentSlot.CHEST);
		return chest.is(ModRegistry.JETPACK) ? chest : ItemStack.EMPTY;
	}

	public static int fuelLeft(ItemStack jetpack) {
		return jetpack.isEmpty() ? 0 : jetpack.getMaxDamage() - jetpack.getDamageValue();
	}

	/** The new velocity of a player thrusting for one tick. */
	public static Vec3 thrust(Vec3 v, Vec3 look) {
		return new Vec3(v.x + look.x * DRIFT, Math.min(MAX_CLIMB, Math.max(v.y, 0) + LIFT), v.z + look.z * DRIFT);
	}

	/** One tick of thrust reported by a client: spend fuel, show it. */
	public static void serverThrust(ServerPlayer player) {
		ItemStack jet = worn(player);
		if (fuelLeft(jet) <= 0 || player.onGround() || player.isPassenger()) return;
		jet.setDamageValue(Math.min(jet.getMaxDamage(), jet.getDamageValue() + 1));
		player.resetFallDistance();
		ServerLevel level = player.level();
		level.sendParticles(ParticleTypes.FLAME, player.getX(), player.getY() + 0.6, player.getZ(), 2, 0.15, 0.1, 0.15, 0.01);
		if (player.tickCount % 3 == 0) level.sendParticles(ParticleTypes.SMOKE, player.getX(), player.getY() + 0.2, player.getZ(), 1, 0.1, 0.1, 0.1, 0.01);
		if (player.tickCount % 8 == 0) level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.BLAZE_SHOOT, SoundSource.PLAYERS, 0.25F, 1.4F);
		if (fuelLeft(jet) == 0) player.sendOverlayMessage(Component.translatable("rockets.hud.jetpack_empty"));
	}

	/** The stabiliser: falling fast with fuel left, the jetpack catches you. */
	private static void stabilise(ServerPlayer player) {
		ItemStack jet = worn(player);
		if (fuelLeft(jet) <= 0 || player.onGround() || player.fallDistance < 6) return;
		long now = player.level().getGameTime();
		if (now - caught.getOrDefault(player.getUUID(), -100L) < 30) return;
		caught.put(player.getUUID(), now);
		player.addEffect(new MobEffectInstance(MobEffects.SLOW_FALLING, 60, 0, false, false));
		player.resetFallDistance();
		jet.setDamageValue(Math.min(jet.getMaxDamage(), jet.getDamageValue() + 10));
		player.level().sendParticles(ParticleTypes.FLAME, player.getX(), player.getY() + 0.6, player.getZ(), 6, 0.2, 0.1, 0.2, 0.02);
		player.level().playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.BLAZE_SHOOT, SoundSource.PLAYERS, 0.4F, 1.2F);
	}

	/** Rocket Fuel used while wearing a jetpack tops it up. Returns true if it did. */
	public static boolean refuel(Player player) {
		ItemStack jet = worn(player);
		if (jet.isEmpty() || jet.getDamageValue() == 0) return false;
		jet.setDamageValue(Math.max(0, jet.getDamageValue() - JetpackItem.REFILL));
		player.sendOverlayMessage(Component.translatable("rockets.hud.jetpack_refuelled"));
		return true;
	}

	public static void register() {
		ServerTickEvents.END_SERVER_TICK.register(server -> {
			for (ServerPlayer p : server.getPlayerList().getPlayers()) stabilise(p);
		});
	}
}
