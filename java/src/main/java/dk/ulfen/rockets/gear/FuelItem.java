package dk.ulfen.rockets.gear;

import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.Level;

/** Rocket Fuel: loaded into rockets by using it on them, or used to top up a worn jetpack. */
public class FuelItem extends Item {
	public FuelItem(Item.Properties props) {
		super(props);
	}

	@Override
	public InteractionResult use(Level level, Player player, InteractionHand hand) {
		if (Jetpack.worn(player).isEmpty() || Jetpack.worn(player).getDamageValue() == 0) return InteractionResult.PASS;
		if (!level.isClientSide() && Jetpack.refuel(player)) {
			player.getItemInHand(hand).consume(1, player);
			player.playSound(SoundEvents.ITEM_PICKUP, 0.7F, 1.4F);
		}
		return InteractionResult.SUCCESS;
	}
}
