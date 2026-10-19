package dk.ulfen.rockets.rocket;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Rocket data generated from the shared specs by tools/build.mjs (resource /rockets/rockets.json).
 * Positions are in blocks, entity space (+z forward).
 */
public final class RocketSpec {
	public String id;
	/** toy (launched from the ground) or ride (players fly along) */
	public String group;
	public float scale;
	public float width;
	public float height;
	public float health;
	public float camera;
	public List<double[]> seats;
	public Fuel fuel;
	public Launch launch;
	public Flight.Spec flight;
	/** where the exhaust comes out, in blocks above the rocket's feet */
	public double exhaust;
	/** room the rocket needs above its feet */
	public double top;

	public static final class Fuel {
		/** item id, e.g. minecraft:water_bucket or rockets:rocket_fuel */
		public String item;
		public int amount;
		/** water, gunpowder or fuel */
		public String kind;
	}

	public static final class Launch {
		/** pumped up by hand (the bottle rocket) */
		public boolean pump;
		/** lit with this item (the model rocket) */
		public String fuse;
		/** a rider presses Jump */
		public boolean jump;
		/** only from a launch pad */
		public boolean pad;
	}

	public boolean ride() {
		return "ride".equals(group);
	}

	public static List<RocketSpec> load() {
		try (var in = RocketSpec.class.getResourceAsStream("/rockets/rockets.json")) {
			if (in == null) throw new IllegalStateException("missing /rockets/rockets.json - run `npm run build` first");
			return new Gson().fromJson(new InputStreamReader(in, StandardCharsets.UTF_8), new TypeToken<List<RocketSpec>>() {}.getType());
		} catch (java.io.IOException e) {
			throw new RuntimeException(e);
		}
	}
}
