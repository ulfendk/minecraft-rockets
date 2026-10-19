package dk.ulfen.rockets.rocket;

import java.util.UUID;

import com.geckolib.animatable.GeoEntity;
import com.geckolib.animatable.instance.AnimatableInstanceCache;
import com.geckolib.animatable.manager.AnimatableManager;
import com.geckolib.animation.AnimationController;
import com.geckolib.animation.RawAnimation;
import com.geckolib.util.GeckoLibUtil;
import dk.ulfen.rockets.ModRegistry;
import net.minecraft.network.protocol.game.ClientboundSetEntityMotionPacket;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;
import org.jspecify.annotations.Nullable;

/**
 * The canopy over someone who came out of a rocket in the air. It follows its owner and
 * holds their fall to parachute speed (fast high up, slow near the ground), so they never
 * take fall damage; they steer with the movement keys as usual. Gone once they land.
 */
public class ParachuteEntity extends Mob implements GeoEntity {
	private final AnimatableInstanceCache geoCache = GeckoLibUtil.createInstanceCache(this);
	private @Nullable UUID owner;
	private double y0;

	public ParachuteEntity(EntityType<? extends ParachuteEntity> type, Level level) {
		super(type, level);
		this.setNoGravity(true);
		this.noPhysics = true;
	}

	public static AttributeSupplier.Builder createAttributes() {
		return Mob.createMobAttributes().add(Attributes.MAX_HEALTH, 1).add(Attributes.MOVEMENT_SPEED, 0);
	}

	/** Opens a parachute over `entity`; y0 is the height it set off from. */
	public static @Nullable ParachuteEntity deploy(ServerLevel level, Entity entity, double y0) {
		ParachuteEntity chute = ModRegistry.PARACHUTE.create(level, EntitySpawnReason.EVENT);
		if (chute == null) return null;
		chute.owner = entity.getUUID();
		chute.y0 = y0;
		chute.snapTo(entity.getX(), entity.getY(), entity.getZ(), entity.getYRot(), 0);
		level.addFreshEntity(chute);
		level.playSound(null, entity.getX(), entity.getY(), entity.getZ(), SoundEvents.ARMOR_EQUIP_LEATHER, SoundSource.PLAYERS, 1F, 0.8F);
		return chute;
	}

	public @Nullable UUID owner() {
		return owner;
	}

	@Override
	public void tick() {
		super.tick();
		if (!(this.level() instanceof ServerLevel level)) return;
		Entity e = owner == null ? null : level.getEntity(owner);
		if (!(e instanceof LivingEntity who) || !who.isAlive() || who.isPassenger() || who.onGround() || who.isInWater() || this.tickCount > 20 * 300) {
			if (e != null) level.playSound(null, e.getX(), e.getY(), e.getZ(), SoundEvents.CHICKEN_EGG, SoundSource.PLAYERS, 0.8F, 0.9F);
			this.discard();
			return;
		}
		this.snapTo(who.getX(), who.getY(), who.getZ(), who.getYRot(), 0);
		this.yBodyRot = this.yHeadRot = who.getYRot();
		// Hold the fall to parachute speed; slow falling keeps the client's prediction close.
		who.resetFallDistance();
		who.addEffect(new MobEffectInstance(MobEffects.SLOW_FALLING, 40, 0, false, false));
		double speed = who.getY() - y0 > Flight.PARACHUTE_SLOW_BELOW ? Flight.PARACHUTE_FAST : Flight.PARACHUTE_SLOW;
		Vec3 v = who.getDeltaMovement();
		boolean sync = this.tickCount % 5 == 1;
		if (speed == Flight.PARACHUTE_FAST && (v.y > -speed + 0.1 || sync)) {
			who.setDeltaMovement(v.x, -speed, v.z);
			if (who instanceof ServerPlayer sp) sp.connection.send(new ClientboundSetEntityMotionPacket(sp));
		} else if (v.y < -speed) {
			who.setDeltaMovement(v.x, -speed, v.z);
			if (who instanceof ServerPlayer sp) sp.connection.send(new ClientboundSetEntityMotionPacket(sp));
		}
	}

	@Override
	public void travel(Vec3 input) {
	}

	@Override
	public boolean hurtServer(ServerLevel level, DamageSource source, float amount) {
		return false;
	}

	@Override
	public boolean isPickable() {
		return false;
	}

	@Override
	public boolean isPushable() {
		return false;
	}

	@Override
	public boolean canBeCollidedWith(@Nullable Entity other) {
		return false;
	}

	@Override
	protected void registerGoals() {
	}

	@Override
	public boolean causeFallDamage(double fallDistance, float damageModifier, DamageSource damageSource) {
		return false;
	}

	@Override
	protected boolean shouldDropLoot(ServerLevel level) {
		return false;
	}

	@Override
	public boolean canBeLeashed() {
		return false;
	}

	@Override
	public void registerControllers(AnimatableManager.ControllerRegistrar controllers) {
		RawAnimation move = RawAnimation.begin().thenLoop("animation.rockets.parachute.move");
		controllers.add(new AnimationController<>("move", 0, state -> state.setAndContinue(move)));
	}

	@Override
	public AnimatableInstanceCache getAnimatableInstanceCache() {
		return geoCache;
	}
}
