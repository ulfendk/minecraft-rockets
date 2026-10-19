package dk.ulfen.rockets.client;

import dk.ulfen.rockets.ModRegistry;
import dk.ulfen.rockets.gear.Jetpack;
import dk.ulfen.rockets.rocket.Flight;
import dk.ulfen.rockets.rocket.RocketEntity;
import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElementRegistry;
import net.fabricmc.fabric.api.client.rendering.v1.hud.VanillaHudElements;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.network.chat.Component;

/** A small panel in the corner: fuel and launch state aboard a rocket, the jetpack's fuel gauge. */
public final class RocketHud {
	private RocketHud() {}

	public static void register() {
		HudElementRegistry.attachElementAfter(VanillaHudElements.HOTBAR, ModRegistry.id("rocket"), (g, delta) -> draw(g));
		// Rockets are not animals: no hearts for them above the hotbar.
		HudElementRegistry.replaceElement(VanillaHudElements.MOUNT_HEALTH, vanilla -> (g, delta) -> {
			if (!(Minecraft.getInstance().player != null && Minecraft.getInstance().player.getVehicle() instanceof RocketEntity)) vanilla.extractRenderState(g, delta);
		});
	}

	private static void draw(GuiGraphicsExtractor g) {
		Minecraft mc = Minecraft.getInstance();
		if (mc.player == null || mc.gui.hud.isHidden()) return;
		Font font = mc.font;
		int x = 6, y = 6, line = 11;
		if (mc.player.getVehicle() instanceof RocketEntity r) {
			Component state;
			if (Flight.isFlying(r.phase())) state = Component.translatable("rockets.hud.altitude", (int) Math.round(r.getY()));
			else if (r.phase() == Flight.COUNTDOWN) state = Component.translatable("rockets.hud.flying");
			else if (r.fuel() < r.spec.fuel.amount) state = Component.translatable("rockets.hud.need_fuel", r.fuelName());
			else if (r.spec.launch.pad && !r.onPad()) state = Component.translatable("rockets.hud.need_pad");
			else state = Component.translatable("rockets.hud.ready");
			Component fuel = Component.translatable("rockets.hud.fuel", r.fuel(), r.spec.fuel.amount);
			int w = Math.max(font.width(state), font.width(fuel)) + 4;
			g.fill(x - 3, y - 3, x + Math.max(w, 120) + 4, y + 3 * line + 1, 0x88000000);
			g.text(font, Component.translatable("entity.rockets." + r.spec.id), x, y, 0xFFF2C230, true);
			g.text(font, fuel, x, y + line, 0xFFDDDDDD, true);
			g.text(font, state, x, y + 2 * line, 0xFFFFFFFF, true);
			return;
		}
		var jet = Jetpack.worn(mc.player);
		if (!jet.isEmpty() && !mc.player.onGround()) {
			int w = 100;
			Component label = Component.translatable("rockets.hud.jetpack");
			int col = font.width(label) + 8;
			g.fill(x - 3, y - 3, x + col + w + 4, y + line, 0x88000000);
			g.text(font, label, x, y, 0xFFDDDDDD, true);
			g.fill(x + col, y + 1, x + col + w, y + 8, 0xFF333333);
			g.fill(x + col, y + 1, x + col + Math.round(w * Jetpack.fuelLeft(jet) / (float) jet.getMaxDamage()), y + 8, 0xFFE8771E);
		}
	}
}
