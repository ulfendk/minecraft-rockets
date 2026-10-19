package dk.ulfen.rockets.gear;

import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.protocol.game.ClientboundSetEntityMotionPacket;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;

/** A one-shot boost: thrown up and forward the way you look (harder while gliding), then a soft landing. */
public class RocketBoostItem extends Item {
	public RocketBoostItem(Item.Properties props) {
		super(props);
	}

	/** The velocity a boost gives, from where you look; the same numbers as on Bedrock. */
	public static Vec3 boost(Vec3 look, boolean gliding) {
		double h = gliding ? 2.2 : 1.3;
		double v = gliding ? 0.4 + Math.max(0, look.y) * 1.5 : 0.7 + Math.max(0, look.y) * 0.8;
		return new Vec3(look.x * h, v, look.z * h);
	}

	@Override
	public InteractionResult use(Level level, Player player, InteractionHand hand) {
		if (level instanceof ServerLevel server) {
			player.setDeltaMovement(boost(player.getLookAngle(), player.isFallFlying()));
			player.resetFallDistance();
			player.addEffect(new MobEffectInstance(MobEffects.SLOW_FALLING, 100, 0, false, false));
			if (player instanceof ServerPlayer sp) sp.connection.send(new ClientboundSetEntityMotionPacket(sp));
			server.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.FIREWORK_ROCKET_LAUNCH, SoundSource.PLAYERS, 1F, 1F);
			server.sendParticles(ParticleTypes.FLAME, player.getX(), player.getY() + 0.3, player.getZ(), 10, 0.2, 0.3, 0.2, 0.03);
			player.getItemInHand(hand).consume(1, player);
		}
		return InteractionResult.SUCCESS;
	}
}
