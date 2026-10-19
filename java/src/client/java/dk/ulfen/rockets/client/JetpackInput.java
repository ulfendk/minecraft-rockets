package dk.ulfen.rockets.client;

import dk.ulfen.rockets.gear.Jetpack;
import dk.ulfen.rockets.net.JetpackPayload;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking;
import net.minecraft.client.Minecraft;
import net.minecraft.core.particles.ParticleTypes;

/** Holding Jump in the air with a jetpack on pushes the player up (players move client-side). */
public final class JetpackInput {
	private JetpackInput() {}

	/** True on the ticks the local player is firing the jetpack. */
	public static boolean firing;

	public static void register() {
		ClientTickEvents.END_CLIENT_TICK.register(JetpackInput::tick);
	}

	private static void tick(Minecraft mc) {
		firing = false;
		var player = mc.player;
		if (player == null || mc.isPaused()) return;
		var jet = Jetpack.worn(player);
		if (Jetpack.fuelLeft(jet) <= 0 || !mc.options.keyJump.isDown() || player.onGround() || player.isPassenger() || player.getAbilities().flying) return;
		firing = true;
		player.setDeltaMovement(Jetpack.thrust(player.getDeltaMovement(), player.getLookAngle()));
		player.resetFallDistance();
		mc.level.addParticle(ParticleTypes.FLAME, player.getX(), player.getY() + 0.5, player.getZ(), 0, -0.2, 0);
		ClientPlayNetworking.send(new JetpackPayload());
	}
}
