package dk.ulfen.rockets.rocket;

import com.geckolib.animatable.GeoEntity;
import com.geckolib.animatable.instance.AnimatableInstanceCache;
import com.geckolib.animatable.manager.AnimatableManager;
import com.geckolib.animation.AnimationController;
import com.geckolib.animation.RawAnimation;
import com.geckolib.util.GeckoLibUtil;
import dk.ulfen.rockets.ModRegistry;
import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.Component;
import net.minecraft.network.protocol.game.ClientboundSetSubtitleTextPacket;
import net.minecraft.network.protocol.game.ClientboundSetTitleTextPacket;
import net.minecraft.network.protocol.game.ClientboundSetTitlesAnimationPacket;
import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.network.syncher.EntityDataSerializers;
import net.minecraft.network.syncher.SynchedEntityData;
import net.minecraft.resources.Identifier;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.tags.DamageTypeTags;
import net.minecraft.util.Mth;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.damagesource.DamageTypes;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityDimensions;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.MoverType;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.storage.ValueInput;
import net.minecraft.world.level.storage.ValueOutput;
import net.minecraft.world.phys.Vec3;
import org.jspecify.annotations.Nullable;

/**
 * A rocket. Toy rockets are filled, pumped or lit by using things on them; rides take
 * riders who launch it with Jump. The server flies it with {@link Flight}; at the top the
 * riders get out under a {@link ParachuteEntity}. Breaks like a boat when players hit it.
 */
public class RocketEntity extends Mob implements GeoEntity {
	private static final EntityDataAccessor<Integer> PHASE = SynchedEntityData.defineId(RocketEntity.class, EntityDataSerializers.INT);
	private static final EntityDataAccessor<Integer> FUEL = SynchedEntityData.defineId(RocketEntity.class, EntityDataSerializers.INT);
	private static final EntityDataAccessor<Integer> PRESSURE = SynchedEntityData.defineId(RocketEntity.class, EntityDataSerializers.INT);
	private static final EntityDataAccessor<Boolean> WATER = SynchedEntityData.defineId(RocketEntity.class, EntityDataSerializers.BOOLEAN);

	public final RocketSpec spec;
	private final AnimatableInstanceCache geoCache = GeckoLibUtil.createInstanceCache(this);

	// Flight (server side)
	private Flight.@Nullable State flight;
	private double y0;
	private double lastY;
	private boolean jumpWasDown;

	private float damage;
	private int hurtTicks;

	public RocketEntity(EntityType<? extends RocketEntity> type, Level level) {
		super(type, level);
		this.spec = ModRegistry.spec(type);
		this.setPersistenceRequired();
	}

	public static AttributeSupplier.Builder createAttributes(RocketSpec s) {
		return Mob.createMobAttributes()
			.add(Attributes.MAX_HEALTH, s.health)
			.add(Attributes.MOVEMENT_SPEED, 0)
			.add(Attributes.KNOCKBACK_RESISTANCE, 1.0)
			.add(Attributes.CAMERA_DISTANCE, s.camera);
	}

	@Override
	protected void defineSynchedData(SynchedEntityData.Builder builder) {
		super.defineSynchedData(builder);
		builder.define(PHASE, Flight.IDLE);
		builder.define(FUEL, 0);
		builder.define(PRESSURE, 0);
		builder.define(WATER, false);
	}

	// ------------------------------------------------------------ state

	public int phase() {
		return this.entityData.get(PHASE);
	}

	public int fuel() {
		return this.entityData.get(FUEL);
	}

	public int pressure() {
		return this.entityData.get(PRESSURE);
	}

	public boolean water() {
		return this.entityData.get(WATER);
	}

	public void setFuel(int n) {
		this.entityData.set(FUEL, Mth.clamp(n, 0, spec.fuel.amount));
		if ("water".equals(spec.fuel.kind)) this.entityData.set(WATER, n > 0);
	}

	public void setPressure(int n) {
		this.entityData.set(PRESSURE, Mth.clamp(n, 0, 8));
	}

	public Flight.@Nullable State flight() {
		return flight;
	}

	public double launchHeight() {
		return y0;
	}

	public boolean onPad() {
		return this.level().getBlockState(BlockPos.containing(this.getX(), this.getY() - 0.1, this.getZ())).is(ModRegistry.LAUNCH_PAD);
	}

	/** Has everything it needs to fly (bottle rockets: water or pressure). */
	public boolean isReady() {
		if (phase() != Flight.IDLE || flight != null) return false;
		if (spec.flight.pressure != null) return fuel() >= 1 || pressure() > 0;
		return fuel() >= spec.fuel.amount;
	}

	/**
	 * Starts a launch: countdown -1 uses the rocket's own, 0 lifts off at once (Mission
	 * Control). Returns null on success, or the lang key of what is missing.
	 */
	public @Nullable String launch(int countdown, boolean fullPressure) {
		if (flight != null) return null;
		if (!isReady()) return "rockets.hud.need_fuel";
		if (spec.launch.pad && !onPad()) return "rockets.hud.need_pad";
		boolean water = fuel() >= 1;
		int p = fullPressure ? 8 : Math.max(1, pressure());
		double ceiling = this.level().getMaxY() - this.getY() - spec.top - spec.flight.maxSpeed - 2;
		return launchTo(Flight.targetHeight(spec.flight, p, water, ceiling), countdown < 0 ? spec.flight.countdown : countdown);
	}

	/** Launches to a given height (tests use short flights). */
	public @Nullable String launchTo(double target, int countdown) {
		flight = Flight.launch(spec.flight, target, countdown);
		y0 = this.getY();
		lastY = y0;
		boolean water = fuel() >= 1;
		this.entityData.set(FUEL, 0);
		this.entityData.set(PRESSURE, 0);
		this.entityData.set(WATER, spec.flight.pressure != null && water);
		this.entityData.set(PHASE, flight.phase);
		if (flight.phase == Flight.COUNTDOWN && spec.launch.fuse != null) this.playSound(SoundEvents.TNT_PRIMED, 1F, 1F);
		if ("liftoff".equals(flight.event) && this.level() instanceof ServerLevel level) liftoff(level);
		return null;
	}

	// ------------------------------------------------------------ ticking

	@Override
	public void tick() {
		if (this.level() instanceof ServerLevel level) serverTick(level);
		super.tick();
		this.yBodyRot = this.yHeadRot = this.getYRot();
		if (hurtTicks > 0) hurtTicks--;
		else if (damage > 0) damage = Math.max(0, damage - 1.0F);
	}

	private void serverTick(ServerLevel level) {
		// Riders launch with Jump.
		if (spec.launch.jump && flight == null) {
			boolean down = this.getPassengers().stream().anyMatch(p -> p instanceof ServerPlayer sp && sp.getLastClientInput().jump());
			if (down && !jumpWasDown) {
				String missing = launch(-1, false);
				if (missing != null) for (Entity p : this.getPassengers()) if (p instanceof Player pl) pl.sendOverlayMessage(Component.translatable(missing, fuelName()));
			}
			jumpWasDown = down;
		}
		if (flight == null) return;
		Flight.State s = flight;
		s.y = this.getY() - y0;
		boolean blocked = false;
		Boolean grounded = null;
		if (s.phase == Flight.BURN || s.phase == Flight.COAST) {
			BlockPos head = BlockPos.containing(this.getX(), this.getY() + spec.top + 0.3, this.getZ());
			boolean stuck = s.vy > 0.3 && this.getY() - lastY < s.vy * 0.25 && s.t > 3;
			blocked = !level.getBlockState(head).getCollisionShape(level, head).isEmpty() || stuck;
		}
		if (s.phase == Flight.CHUTE || s.phase == Flight.FALL) {
			BlockPos below = BlockPos.containing(this.getX(), this.getY() - 0.05, this.getZ());
			grounded = !level.getBlockState(below).isAir() || this.onGround() || this.getY() <= level.getMinY();
		}
		lastY = this.getY();
		int before = s.phase;
		flight = Flight.step(s, spec.flight, grounded, blocked);

		// Riders who get out on the way, and everyone at the top, get a parachute (removePassenger).
		if ("liftoff".equals(flight.event)) liftoff(level);
		if ("apex".equals(flight.event)) apex(level);
		if ("landed".equals(flight.event)) {
			landed(level);
			return;
		}
		if (flight.phase != before) this.entityData.set(PHASE, flight.phase);
		this.setNoGravity(Flight.isFlying(flight.phase));
		if (flight.phase == Flight.COUNTDOWN) countdownTick(level);
		if (flight.phase == Flight.BURN) exhaust(level);
	}

	@Override
	public void travel(Vec3 input) {
		if (flight != null && Flight.isFlying(flight.phase)) {
			this.setDeltaMovement(0, flight.vy, 0);
			this.move(MoverType.SELF, this.getDeltaMovement());
			return;
		}
		super.travel(input);
	}

	private void liftoff(ServerLevel level) {
		this.setNoGravity(true);
		boolean bottle = spec.flight.pressure != null;
		level.playSound(null, this.getX(), this.getY(), this.getZ(), bottle ? SoundEvents.BUCKET_EMPTY : SoundEvents.FIREWORK_ROCKET_LAUNCH, SoundSource.NEUTRAL, 1.2F, spec.ride() ? 0.6F : 1F);
		if (spec.ride()) level.playSound(null, this.getX(), this.getY(), this.getZ(), SoundEvents.GENERIC_EXPLODE, SoundSource.NEUTRAL, 0.6F, 0.5F);
		level.sendParticles(bottle ? ParticleTypes.SPLASH : ParticleTypes.CAMPFIRE_COSY_SMOKE, this.getX(), this.getY() + 0.3, this.getZ(), spec.ride() ? 30 : 8, spec.width, 0.2, spec.width, 0.02);
	}

	private void exhaust(ServerLevel level) {
		double y = this.getY() + spec.exhaust - 0.3;
		if (spec.flight.pressure != null) {
			level.sendParticles(ParticleTypes.SPLASH, this.getX(), y, this.getZ(), 4, 0.1, 0.1, 0.1, 0.1);
			return;
		}
		level.sendParticles(ParticleTypes.FLAME, this.getX(), y, this.getZ(), spec.ride() ? 6 : 2, spec.width * 0.2, 0.2, spec.width * 0.2, 0.02);
		if (this.tickCount % 2 == 0) {
			level.sendParticles(spec.ride() ? ParticleTypes.CAMPFIRE_COSY_SMOKE : ParticleTypes.SMOKE, this.getX(), y - 0.8, this.getZ(), spec.ride() ? 2 : 1, 0.1, 0.1, 0.1, 0.01);
		}
		if (spec.ride() && this.tickCount % 10 == 0) level.playSound(null, this.getX(), this.getY(), this.getZ(), SoundEvents.BLAZE_SHOOT, SoundSource.NEUTRAL, 0.6F, 0.5F);
	}

	private void countdownTick(ServerLevel level) {
		if (flight.t % 20 != 0) {
			if (spec.launch.fuse != null && this.tickCount % 4 == 0) level.sendParticles(ParticleTypes.SMOKE, this.getX(), this.getY() + 0.2, this.getZ(), 1, 0.05, 0.05, 0.05, 0);
			return;
		}
		int seconds = flight.t / 20;
		for (Entity p : this.getPassengers()) {
			if (p instanceof ServerPlayer sp) {
				sp.connection.send(new ClientboundSetTitlesAnimationPacket(0, 18, 2));
				sp.connection.send(new ClientboundSetTitleTextPacket(Component.literal("§e" + seconds)));
			}
		}
		level.playSound(null, this.getX(), this.getY(), this.getZ(), SoundEvents.NOTE_BLOCK_PLING, SoundSource.NEUTRAL, 0.8F, 1F + (3 - Math.min(3, seconds)) * 0.15F);
	}

	/** At the top: everyone out, each under a parachute (see removePassenger). */
	private void apex(ServerLevel level) {
		for (Entity p : this.getPassengers()) {
			if (spec.flight.apex < 0 && p instanceof ServerPlayer sp) {
				sp.connection.send(new ClientboundSetTitlesAnimationPacket(5, 50, 10));
				sp.connection.send(new ClientboundSetSubtitleTextPacket(Component.translatable("rockets.space.sub")));
				sp.connection.send(new ClientboundSetTitleTextPacket(Component.translatable("rockets.space")));
			}
		}
		this.ejectPassengers();
		level.playSound(null, this.getX(), this.getY(), this.getZ(), SoundEvents.CHICKEN_EGG, SoundSource.NEUTRAL, 1F, 0.7F);
	}

	private void landed(ServerLevel level) {
		flight = null;
		this.setNoGravity(false);
		this.setDeltaMovement(Vec3.ZERO);
		this.entityData.set(PHASE, Flight.IDLE);
		if (spec.flight.pressure != null) this.entityData.set(WATER, false);
		level.playSound(null, this.getX(), this.getY(), this.getZ(), SoundEvents.CHICKEN_EGG, SoundSource.NEUTRAL, 0.6F, 1.2F);
	}

	@Override
	protected void removePassenger(Entity passenger) {
		super.removePassenger(passenger);
		if (this.level() instanceof ServerLevel level && flight != null && Flight.isFlying(flight.phase)) {
			ParachuteEntity.deploy(level, passenger, y0);
		}
	}

	// ------------------------------------------------------------ fuelling, pumping, lighting, boarding

	public Component fuelName() {
		return Component.translatable("rockets.fuel." + spec.fuel.kind);
	}

	@Override
	public InteractionResult interact(Player player, InteractionHand hand, Vec3 location) {
		ItemStack held = player.getItemInHand(hand);
		if (flight != null) return InteractionResult.PASS;
		Identifier heldId = BuiltInRegistries.ITEM.getKey(held.getItem());
		if (!held.isEmpty() && heldId.toString().equals(spec.fuel.item)) {
			if (this.level().isClientSide()) return InteractionResult.SUCCESS;
			if (fuel() >= spec.fuel.amount) {
				player.sendOverlayMessage(Component.translatable("rockets.hud.full"));
				return InteractionResult.SUCCESS;
			}
			setFuel(fuel() + 1);
			boolean water = "water".equals(spec.fuel.kind);
			if (!player.getAbilities().instabuild) {
				if (water) player.setItemInHand(hand, new ItemStack(Items.BUCKET));
				else held.shrink(1);
			}
			this.playSound(water ? SoundEvents.BUCKET_EMPTY : SoundEvents.ITEM_PICKUP, 0.7F, 1.2F);
			player.sendOverlayMessage(Component.translatable(water ? "rockets.hud.filled" : "rockets.hud.fuelled").append("  " + fuel() + "/" + spec.fuel.amount));
			return InteractionResult.SUCCESS;
		}
		if (spec.launch.pump && held.isEmpty()) {
			if (this.level().isClientSide()) return InteractionResult.SUCCESS;
			if (pressure() >= 8) {
				launch(-1, false);
				return InteractionResult.SUCCESS;
			}
			setPressure(pressure() + 1);
			this.playSound(SoundEvents.UI_BUTTON_CLICK.value(), 0.8F, 0.7F + pressure() * 0.12F);
			Component gauge = Component.translatable("rockets.hud.pressure").append(" " + bar(pressure(), 8));
			if (fuel() < 1) gauge = gauge.copy().append("  §7").append(Component.translatable("rockets.hud.no_water"));
			player.sendOverlayMessage(gauge);
			return InteractionResult.SUCCESS;
		}
		if (spec.launch.fuse != null && heldId.toString().equals(spec.launch.fuse)) {
			if (this.level().isClientSide()) return InteractionResult.SUCCESS;
			String missing = launch(-1, false);
			player.sendOverlayMessage(missing != null ? Component.translatable(missing, fuelName()) : Component.translatable("rockets.hud.lit"));
			if (missing == null) held.hurtAndBreak(1, player, hand);
			return InteractionResult.SUCCESS;
		}
		if (spec.seats.isEmpty() || player.isSecondaryUseActive() || this.getPassengers().size() >= spec.seats.size()) return InteractionResult.PASS;
		if (!this.level().isClientSide()) {
			player.startRiding(this);
			if (player instanceof ServerPlayer sp && !sp.entityTags().contains("rockets.tutorial")) {
				sp.addTag("rockets.tutorial");
				sp.sendSystemMessage(Component.translatable("rockets.tutorial"));
			}
		}
		return InteractionResult.SUCCESS;
	}

	public static String bar(int value, int max) {
		int n = Math.round(Math.max(0, Math.min(max, value)) * 8F / max);
		return "§a" + "▮".repeat(n) + "§7" + "▯".repeat(8 - n) + "§r";
	}

	@Override
	protected boolean canAddPassenger(Entity passenger) {
		return this.getPassengers().size() < spec.seats.size();
	}

	@Override
	public @Nullable LivingEntity getControllingPassenger() {
		return null;
	}

	@Override
	protected Vec3 getPassengerAttachmentPoint(Entity passenger, EntityDimensions dimensions, float scale) {
		int i = Math.max(0, this.getPassengers().indexOf(passenger));
		double[] seat = spec.seats.get(Math.min(i, spec.seats.size() - 1));
		return new Vec3(seat[0], seat[1], seat[2]).yRot(-this.getYRot() * Mth.DEG_TO_RAD);
	}

	@Override
	protected void positionRider(Entity passenger, Entity.MoveFunction moveFunction) {
		super.positionRider(passenger, moveFunction);
		if (passenger instanceof LivingEntity living) living.setYBodyRot(this.getYRot());
	}

	@Override
	public Vec3 getDismountLocationForPassenger(LivingEntity passenger) {
		int i = Math.max(0, this.getPassengers().indexOf(passenger));
		double a = this.getYRot() * Mth.DEG_TO_RAD + i * Math.PI / 2;
		double r = this.getBbWidth() * 0.5 + 0.9;
		double y = flight != null && Flight.isFlying(flight.phase) ? passenger.getY() : this.getY();
		return new Vec3(this.getX() + Math.cos(a) * r, y, this.getZ() + Math.sin(a) * r);
	}

	// ------------------------------------------------------------ no AI, no despawn, no fall damage

	@Override
	protected void registerGoals() {
	}

	@Override
	public boolean removeWhenFarAway(double distSqr) {
		return false;
	}

	@Override
	public boolean requiresCustomPersistence() {
		return true;
	}

	@Override
	public boolean causeFallDamage(double fallDistance, float damageModifier, DamageSource damageSource) {
		return false;
	}

	@Override
	protected void checkFallDamage(double ya, boolean onGround, BlockState onState, BlockPos pos) {
	}

	@Override
	public boolean canBreatheUnderwater() {
		return true;
	}

	@Override
	public boolean isAffectedByPotions() {
		return false;
	}

	@Override
	public boolean canBeLeashed() {
		return false;
	}

	@Override
	public boolean isPushable() {
		return false;
	}

	@Override
	public boolean canBeCollidedWith(@Nullable Entity other) {
		return other == null || !other.isPassengerOfSameVehicle(this);
	}

	@Override
	protected boolean shouldDropLoot(ServerLevel level) {
		return false;
	}

	@Override
	public boolean shouldRenderAtSqrDistance(double distance) {
		double d = 128 + spec.camera * 8;
		return distance < d * d;
	}

	// ------------------------------------------------------------ breaking (players only, like boats)

	@Override
	public boolean hurtServer(ServerLevel level, DamageSource source, float amount) {
		if (this.isRemoved()) return true;
		if (source.is(DamageTypes.GENERIC_KILL) || source.is(DamageTypeTags.BYPASSES_INVULNERABILITY)) {
			breakApart(level, false);
			return true;
		}
		if (!(source.getEntity() instanceof Player player)) return false;
		if (player.getAbilities().instabuild) {
			breakApart(level, false);
			return true;
		}
		this.hurtTicks = 10;
		this.damage += Math.max(1.0F, amount) * 10.0F;
		this.playSound(SoundEvents.IRON_GOLEM_HURT, 0.6F, 1.4F);
		if (this.damage > 20.0F + spec.health * 2) breakApart(level, true);
		return true;
	}

	public void breakApart(ServerLevel level, boolean dropItem) {
		this.ejectPassengers();
		if (dropItem) {
			this.spawnAtLocation(level, new ItemStack(ModRegistry.placer(spec.id)));
			this.playSound(SoundEvents.ITEM_BREAK.value(), 1.0F, 0.8F);
		}
		this.discard();
	}

	// ------------------------------------------------------------ saving

	@Override
	protected void addAdditionalSaveData(ValueOutput out) {
		super.addAdditionalSaveData(out);
		out.putInt("Fuel", fuel());
		out.putInt("Pressure", pressure());
		out.putBoolean("Water", water());
		if (flight != null) {
			out.putInt("FlightPhase", flight.phase);
			out.putInt("FlightT", flight.t);
			out.putDouble("FlightVy", flight.vy);
			out.putDouble("FlightTarget", flight.target);
			out.putDouble("LaunchY", y0);
		}
	}

	@Override
	protected void readAdditionalSaveData(ValueInput in) {
		super.readAdditionalSaveData(in);
		this.entityData.set(FUEL, in.getIntOr("Fuel", 0));
		this.entityData.set(PRESSURE, in.getIntOr("Pressure", 0));
		this.entityData.set(WATER, in.getBooleanOr("Water", false));
		int phase = in.getIntOr("FlightPhase", Flight.IDLE);
		if (phase != Flight.IDLE) {
			flight = new Flight.State();
			flight.phase = phase;
			flight.t = in.getIntOr("FlightT", 0);
			flight.vy = in.getDoubleOr("FlightVy", 0);
			flight.target = in.getDoubleOr("FlightTarget", 0);
			y0 = in.getDoubleOr("LaunchY", this.getY());
			lastY = this.getY();
			this.entityData.set(PHASE, phase);
		}
	}

	// ------------------------------------------------------------ GeckoLib

	@Override
	public void registerControllers(AnimatableManager.ControllerRegistrar controllers) {
		RawAnimation move = RawAnimation.begin().thenLoop("animation.rockets." + spec.id + ".move");
		controllers.add(new AnimationController<>("move", 0, state -> state.setAndContinue(move)));
	}

	@Override
	public AnimatableInstanceCache getAnimatableInstanceCache() {
		return geoCache;
	}
}
