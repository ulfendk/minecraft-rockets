package dk.ulfen.rockets.rocket;

import dk.ulfen.rockets.ModRegistry;
import net.minecraft.core.Direction;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.context.UseOnContext;

/** Places a rocket on the clicked block (on top of a launch pad, it stands on the pad). */
public class RocketItem extends Item {
	private final String id;

	public RocketItem(Item.Properties props, String id) {
		super(props);
		this.id = id;
	}

	@Override
	public InteractionResult useOn(UseOnContext ctx) {
		if (ctx.getClickedFace() == Direction.DOWN) return InteractionResult.FAIL;
		if (!(ctx.getLevel() instanceof ServerLevel level)) return InteractionResult.SUCCESS;
		var clicked = ctx.getClickedPos();
		boolean pad = ctx.getClickedFace() == Direction.UP && level.getBlockState(clicked).is(ModRegistry.LAUNCH_PAD);
		var pos = clicked.relative(ctx.getClickedFace());
		double y = pad ? clicked.getY() + 0.25 : pos.getY();
		RocketEntity r = ModRegistry.type(id).create(level, EntitySpawnReason.SPAWN_ITEM_USE);
		if (r == null) return InteractionResult.FAIL;
		float yaw = ctx.getPlayer() != null ? ctx.getPlayer().getYRot() : ctx.getRotation();
		r.snapTo(pos.getX() + 0.5, y, pos.getZ() + 0.5, yaw, 0);
		r.setYBodyRot(yaw);
		r.setYHeadRot(yaw);
		if (!level.noCollision(r, r.getBoundingBox().deflate(0.01))) {
			if (ctx.getPlayer() != null) ctx.getPlayer().sendOverlayMessage(Component.translatable("rockets.no_room"));
			return InteractionResult.FAIL;
		}
		level.addFreshEntity(r);
		level.playSound(null, pos, SoundEvents.IRON_GOLEM_REPAIR, r.getSoundSource(), 0.6F, 1.4F);
		ctx.getItemInHand().consume(1, ctx.getPlayer());
		return InteractionResult.SUCCESS_SERVER;
	}
}
