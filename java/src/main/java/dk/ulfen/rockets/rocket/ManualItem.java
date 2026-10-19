package dk.ulfen.rockets.rocket;

import java.util.ArrayList;
import java.util.List;

import dk.ulfen.rockets.ModRegistry;
import net.minecraft.ChatFormatting;
import net.minecraft.core.component.DataComponents;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.server.network.Filterable;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.component.WrittenBookContent;
import net.minecraft.world.level.Level;

/** The Rocket Manual: a book with how to fly, a page per rocket and a page per piece of gear. */
public class ManualItem extends Item {
	private static final String GIVEN = "rockets.manual_given";
	private static final String[][] GEAR = {
		{"item", "rocket_fuel"}, {"item", "jetpack"}, {"item", "rocket_boost"}, {"block", "launch_pad"}, {"block", "mission_control"},
	};

	public ManualItem(Item.Properties props) {
		super(props.component(DataComponents.WRITTEN_BOOK_CONTENT, content()));
	}

	private static WrittenBookContent content() {
		List<Filterable<Component>> pages = new ArrayList<>();
		pages.add(Filterable.passThrough(Component.empty()
			.append(Component.translatable("rockets.manual.title").withStyle(ChatFormatting.BOLD))
			.append("\n\n").append(Component.translatable("rockets.manual.intro"))));
		pages.add(Filterable.passThrough(Component.empty()
			.append(Component.translatable("rockets.manual.controls").withStyle(ChatFormatting.BOLD))
			.append("\n\n").append(Component.translatable("rockets.manual.controls_text"))));
		for (RocketSpec s : ModRegistry.SPECS) {
			var page = Component.empty()
				.append(Component.translatable("entity.rockets." + s.id).withStyle(ChatFormatting.BOLD))
				.append("\n\n").append(Component.translatable("rockets.info." + s.id)).append("\n\n");
			if (s.flight.pressure != null) page.append(Component.translatable("rockets.manual.pressure"));
			else if (s.flight.apex < 0) page.append(Component.translatable("rockets.manual.limit"));
			else page.append(Component.translatable("rockets.manual.apex", (int) s.flight.apex));
			if (!s.seats.isEmpty()) page.append("\n").append(Component.translatable("rockets.manual.seats", s.seats.size()));
			pages.add(Filterable.passThrough(page));
		}
		for (String[] g : GEAR) {
			pages.add(Filterable.passThrough(Component.empty()
				.append(Component.translatable(g[0] + ".rockets." + g[1]).withStyle(ChatFormatting.BOLD))
				.append("\n\n").append(Component.translatable("rockets.info." + g[1]))));
		}
		return new WrittenBookContent(Filterable.passThrough("Rocket Manual"), "Rockets", 0, pages, true);
	}

	@Override
	public InteractionResult use(Level level, Player player, InteractionHand hand) {
		if (player instanceof ServerPlayer sp) sp.openItemGui(player.getItemInHand(hand), hand);
		return InteractionResult.SUCCESS;
	}

	/** Gives a player the manual the first time they join a world with the mod. */
	public static void giveOnce(ServerPlayer player) {
		if (player.entityTags().contains(GIVEN)) return;
		player.addTag(GIVEN);
		player.getInventory().add(new ItemStack(ModRegistry.MANUAL));
		player.sendSystemMessage(Component.translatable("rockets.manual.welcome"));
	}
}
