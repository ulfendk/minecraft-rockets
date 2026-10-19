package dk.ulfen.rockets.client;

import com.geckolib.loading.math.MolangQueries;
import dk.ulfen.rockets.rocket.RocketEntity;
import net.minecraft.world.entity.Entity;

/** The animation variables the generated animations read (see src/lib/anim.mjs). */
public final class RocketsMolang {
	private RocketsMolang() {}

	public static void register() {
		MolangQueries.<Object>setActorVariable("variable.r_phase", a -> a.animatable() instanceof RocketEntity r ? r.phase() : 0);
		MolangQueries.<Object>setActorVariable("variable.r_water", a -> a.animatable() instanceof RocketEntity r && r.water() ? 1 : 0);
		MolangQueries.<Object>setActorVariable("variable.r_pressure", a -> a.animatable() instanceof RocketEntity r ? r.pressure() : 0);
		MolangQueries.<Object>setActorVariable("variable.r_fuel", a -> a.animatable() instanceof RocketEntity r ? r.fuel() : 0);
		MolangQueries.<Object>setActorVariable("variable.r_time", a -> a.animatable() instanceof Entity e ? (e.tickCount + a.partialTick()) / 20.0 : 0);
	}
}
