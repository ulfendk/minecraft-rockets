package dk.ulfen.rockets;

import dk.ulfen.rockets.block.Countdowns;
import dk.ulfen.rockets.gear.Jetpack;
import dk.ulfen.rockets.net.JetpackPayload;
import dk.ulfen.rockets.rocket.ManualItem;
import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.networking.v1.ServerPlayConnectionEvents;

public class Rockets implements ModInitializer {
	public static final String MOD_ID = "rockets";

	@Override
	public void onInitialize() {
		ModRegistry.register();
		JetpackPayload.register();
		Countdowns.register();
		Jetpack.register();
		// Everyone gets a Rocket Manual the first time they join.
		ServerPlayConnectionEvents.JOIN.register((handler, sender, server) -> ManualItem.giveOnce(handler.getPlayer()));
	}
}
