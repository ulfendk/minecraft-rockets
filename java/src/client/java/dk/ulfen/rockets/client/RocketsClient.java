package dk.ulfen.rockets.client;

import dk.ulfen.rockets.ModRegistry;
import net.fabricmc.api.ClientModInitializer;
import net.minecraft.client.renderer.entity.EntityRenderers;

public class RocketsClient implements ClientModInitializer {
	@Override
	public void onInitializeClient() {
		RocketsMolang.register();
		for (var spec : ModRegistry.SPECS) {
			EntityRenderers.register(ModRegistry.type(spec.id), ctx -> new RocketRenderer<>(ctx, spec.id, spec.scale, spec.width * 0.45F));
		}
		EntityRenderers.register(ModRegistry.PARACHUTE, ctx -> new RocketRenderer<>(ctx, "parachute", 1F, 0F));
		JetpackInput.register();
		RocketHud.register();
	}
}
