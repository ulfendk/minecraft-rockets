package dk.ulfen.rockets;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import dk.ulfen.rockets.block.LaunchPadBlock;
import dk.ulfen.rockets.block.MissionControlBlock;
import dk.ulfen.rockets.gear.FuelItem;
import dk.ulfen.rockets.gear.JetpackItem;
import dk.ulfen.rockets.gear.RocketBoostItem;
import dk.ulfen.rockets.rocket.ManualItem;
import dk.ulfen.rockets.rocket.ParachuteEntity;
import dk.ulfen.rockets.rocket.RocketEntity;
import dk.ulfen.rockets.rocket.RocketItem;
import dk.ulfen.rockets.rocket.RocketSpec;
import net.fabricmc.fabric.api.creativetab.v1.FabricCreativeModeTab;
import net.fabricmc.fabric.api.object.builder.v1.entity.FabricDefaultAttributeRegistry;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.Identifier;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.SoundType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.material.MapColor;

/** Everything the mod adds to the game registries. */
public final class ModRegistry {
	public static List<RocketSpec> SPECS = List.of();
	public static final Map<String, EntityType<RocketEntity>> TYPES = new LinkedHashMap<>();
	private static final Map<EntityType<?>, RocketSpec> BY_TYPE = new HashMap<>();
	private static final Map<String, Item> PLACERS = new LinkedHashMap<>();

	public static EntityType<ParachuteEntity> PARACHUTE;
	public static Block LAUNCH_PAD;
	public static Block MISSION_CONTROL;
	public static Item ROCKET_FUEL;
	public static Item JETPACK;
	public static Item ROCKET_BOOST;
	public static Item MANUAL;

	private ModRegistry() {}

	public static Identifier id(String path) {
		return Identifier.fromNamespaceAndPath(Rockets.MOD_ID, path);
	}

	public static RocketSpec spec(EntityType<?> type) {
		RocketSpec s = BY_TYPE.get(type);
		if (s == null) throw new IllegalStateException("no rocket spec for " + type);
		return s;
	}

	public static RocketSpec spec(String id) {
		return BY_TYPE.get(TYPES.get(id));
	}

	public static EntityType<RocketEntity> type(String id) {
		return TYPES.get(id);
	}

	/** The item that places a rocket. */
	public static Item placer(String id) {
		return PLACERS.get(id);
	}

	static void register() {
		SPECS = RocketSpec.load();

		LAUNCH_PAD = block("launch_pad", LaunchPadBlock::new, BlockBehaviour.Properties.of().mapColor(MapColor.COLOR_YELLOW)
			.strength(2.0F, 30.0F).sound(SoundType.METAL).noOcclusion());
		MISSION_CONTROL = block("mission_control", MissionControlBlock::new, BlockBehaviour.Properties.of().mapColor(MapColor.COLOR_GRAY)
			.strength(2.0F, 6.0F).sound(SoundType.METAL).lightLevel(state -> 6));

		for (RocketSpec s : SPECS) {
			ResourceKey<EntityType<?>> key = ResourceKey.create(Registries.ENTITY_TYPE, id(s.id));
			EntityType<RocketEntity> type = EntityType.Builder.<RocketEntity>of(RocketEntity::new, MobCategory.MISC)
				.sized(s.width, s.height)
				.fireImmune()
				.clientTrackingRange(s.ride() ? 16 : 10)
				.build(key);
			BY_TYPE.put(type, s);
			Registry.register(BuiltInRegistries.ENTITY_TYPE, key, type);
			TYPES.put(s.id, type);
			FabricDefaultAttributeRegistry.register(type, RocketEntity.createAttributes(s));
			PLACERS.put(s.id, item(s.id, p -> new RocketItem(p, s.id), new Item.Properties().stacksTo(s.ride() ? 1 : 16)));
		}

		ResourceKey<EntityType<?>> chuteKey = ResourceKey.create(Registries.ENTITY_TYPE, id("parachute"));
		PARACHUTE = Registry.register(BuiltInRegistries.ENTITY_TYPE, chuteKey,
			EntityType.Builder.<ParachuteEntity>of(ParachuteEntity::new, MobCategory.MISC).sized(0.4F, 0.4F).fireImmune().noSave().clientTrackingRange(10).build(chuteKey));
		FabricDefaultAttributeRegistry.register(PARACHUTE, ParachuteEntity.createAttributes());

		ROCKET_FUEL = item("rocket_fuel", FuelItem::new, new Item.Properties().stacksTo(16));
		JETPACK = item("jetpack", JetpackItem::new, JetpackItem.properties());
		ROCKET_BOOST = item("rocket_boost", RocketBoostItem::new, new Item.Properties().stacksTo(16));
		MANUAL = item("rocket_manual", ManualItem::new, new Item.Properties().stacksTo(1));

		CreativeModeTab tab = FabricCreativeModeTab.builder()
			.title(Component.translatable("itemGroup.rockets"))
			.icon(() -> new ItemStack(PLACERS.get("sky_rocket")))
			.displayItems((params, out) -> {
				PLACERS.values().forEach(out::accept);
				out.accept(ROCKET_FUEL);
				out.accept(JETPACK);
				out.accept(ROCKET_BOOST);
				out.accept(LAUNCH_PAD);
				out.accept(MISSION_CONTROL);
				out.accept(MANUAL);
			})
			.build();
		Registry.register(BuiltInRegistries.CREATIVE_MODE_TAB, ResourceKey.create(Registries.CREATIVE_MODE_TAB, id("rockets")), tab);
	}

	private static Block block(String name, Function<BlockBehaviour.Properties, Block> factory, BlockBehaviour.Properties props) {
		ResourceKey<Block> key = ResourceKey.create(Registries.BLOCK, id(name));
		Block block = Registry.register(BuiltInRegistries.BLOCK, key, factory.apply(props.setId(key)));
		item(name, p -> new BlockItem(block, p), new Item.Properties().useBlockDescriptionPrefix());
		return block;
	}

	private static <T extends Item> T item(String name, Function<Item.Properties, T> factory, Item.Properties props) {
		ResourceKey<Item> key = ResourceKey.create(Registries.ITEM, id(name));
		return Registry.register(BuiltInRegistries.ITEM, key, factory.apply(props.setId(key)));
	}
}
