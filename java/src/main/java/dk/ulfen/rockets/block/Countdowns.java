package dk.ulfen.rockets.block;

import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import dk.ulfen.rockets.rocket.RocketEntity;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.chat.Component;
import net.minecraft.network.protocol.game.ClientboundSetSubtitleTextPacket;
import net.minecraft.network.protocol.game.ClientboundSetTitleTextPacket;
import net.minecraft.network.protocol.game.ClientboundSetTitlesAnimationPacket;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.phys.AABB;
import org.jspecify.annotations.Nullable;

/**
 * Mission Control countdowns: everyone within 64 blocks sees the seconds, at zero every
 * fuelled rocket on a launch pad within 16 blocks lifts off. Same rules as scripts/mission.js.
 */
public final class Countdowns {
	public static final int SECONDS = 10;
	public static final int RANGE = 16;
	public static final int AUDIENCE = 64;

	private record Key(ServerLevel level, BlockPos pos) {}

	private static final Map<Key, int[]> RUNNING = new LinkedHashMap<>();

	private Countdowns() {}

	public static List<RocketEntity> rocketsOnPads(ServerLevel level, BlockPos pos) {
		return level.getEntitiesOfClass(RocketEntity.class, new AABB(pos).inflate(RANGE), r -> r.onPad() && r.isReady() && r.distanceToSqr(net.minecraft.world.phys.Vec3.atCenterOf(pos)) <= RANGE * RANGE);
	}

	public static boolean running(ServerLevel level, BlockPos pos) {
		return RUNNING.containsKey(new Key(level, pos));
	}

	/** Starts a countdown at a console, or aborts the one running there. Returns true when one starts. */
	public static boolean toggle(ServerLevel level, BlockPos pos, @Nullable Player player, int seconds) {
		Key key = new Key(level, pos.immutable());
		if (RUNNING.remove(key) != null) {
			title(level, pos, Component.translatable("rockets.abort"), null);
			level.playSound(null, pos, SoundEvents.NOTE_BLOCK_BASS.value(), SoundSource.BLOCKS, 1F, 0.5F);
			return false;
		}
		if (rocketsOnPads(level, pos).isEmpty()) {
			if (player != null) player.sendOverlayMessage(Component.translatable("rockets.no_rockets"));
			level.playSound(null, pos, SoundEvents.NOTE_BLOCK_BASS.value(), SoundSource.BLOCKS, 0.8F, 0.7F);
			return false;
		}
		RUNNING.put(key, new int[] {seconds * 20});
		return true;
	}

	private static void title(ServerLevel level, BlockPos pos, Component text, @Nullable Component subtitle) {
		for (ServerPlayer p : level.getPlayers(p -> p.distanceToSqr(net.minecraft.world.phys.Vec3.atCenterOf(pos)) <= AUDIENCE * AUDIENCE)) {
			p.connection.send(new ClientboundSetTitlesAnimationPacket(0, 20, 4));
			p.connection.send(new ClientboundSetSubtitleTextPacket(subtitle != null ? subtitle : Component.empty()));
			p.connection.send(new ClientboundSetTitleTextPacket(text));
		}
	}

	private static void tick() {
		Iterator<Map.Entry<Key, int[]>> it = RUNNING.entrySet().iterator();
		while (it.hasNext()) {
			var e = it.next();
			ServerLevel level = e.getKey().level();
			BlockPos pos = e.getKey().pos();
			int t = e.getValue()[0];
			if (t % 20 == 0) {
				if (t == 0) {
					it.remove();
					for (RocketEntity r : rocketsOnPads(level, pos)) {
						r.launch(0, true);
						level.sendParticles(ParticleTypes.CAMPFIRE_COSY_SMOKE, r.getX(), r.getY(), r.getZ(), 12, 1.2, 0.2, 1.2, 0.02);
					}
					title(level, pos, Component.literal("§6").append(Component.translatable("rockets.liftoff")), null);
					level.playSound(null, pos, SoundEvents.NOTE_BLOCK_BELL.value(), SoundSource.BLOCKS, 1F, 1F);
					continue;
				}
				int seconds = t / 20;
				int count = rocketsOnPads(level, pos).size();
				title(level, pos, Component.literal("§e" + seconds), Component.translatable("rockets.countdown.sub", count));
				level.playSound(null, pos, SoundEvents.NOTE_BLOCK_PLING.value(), SoundSource.BLOCKS, 1F, seconds <= 3 ? 1.3F + (3 - seconds) * 0.2F : 1F);
			}
			e.getValue()[0] = t - 1;
		}
	}

	public static void register() {
		ServerTickEvents.END_SERVER_TICK.register(server -> tick());
	}
}
