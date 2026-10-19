package dk.ulfen.rockets.gear;

import dk.ulfen.rockets.ModRegistry;
import net.minecraft.core.component.DataComponents;
import net.minecraft.resources.ResourceKey;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.equipment.Equippable;
import net.minecraft.world.item.equipment.EquipmentAssets;

/** Worn in the chest slot. Its durability is the fuel: Rocket Fuel tops it up (see FuelItem). */
public class JetpackItem extends Item {
	public static final int CAPACITY = 400;
	public static final int REFILL = 100;

	public JetpackItem(Item.Properties props) {
		super(props);
	}

	public static Item.Properties properties() {
		return new Item.Properties().durability(CAPACITY).component(DataComponents.EQUIPPABLE,
			Equippable.builder(EquipmentSlot.CHEST)
				.setAsset(ResourceKey.create(EquipmentAssets.ROOT_ID, ModRegistry.id("jetpack")))
				.setEquipSound(SoundEvents.ARMOR_EQUIP_LEATHER)
				.build());
	}
}
