package dk.ulfen.rockets.net;

import dk.ulfen.rockets.ModRegistry;
import dk.ulfen.rockets.gear.Jetpack;
import net.fabricmc.fabric.api.networking.v1.PayloadTypeRegistry;
import net.fabricmc.fabric.api.networking.v1.ServerPlayNetworking;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;

/** Sent by the client every tick it fires the jetpack. */
public record JetpackPayload() implements CustomPacketPayload {
	public static final Type<JetpackPayload> TYPE = new Type<>(ModRegistry.id("jetpack"));
	public static final StreamCodec<RegistryFriendlyByteBuf, JetpackPayload> CODEC = StreamCodec.unit(new JetpackPayload());

	@Override
	public Type<? extends CustomPacketPayload> type() {
		return TYPE;
	}

	public static void register() {
		PayloadTypeRegistry.serverboundPlay().register(TYPE, CODEC);
		ServerPlayNetworking.registerGlobalReceiver(TYPE, (payload, ctx) -> Jetpack.serverThrust(ctx.player()));
	}
}
