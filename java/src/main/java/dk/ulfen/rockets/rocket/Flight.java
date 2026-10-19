package dk.ulfen.rockets.rocket;

/**
 * The flight of a rocket, one game tick at a time: the same steps as src/lib/flight.mjs,
 * which the Bedrock scripts run (RocketGameTests.flightMatches checks that both agree).
 * Heights are in blocks above the launch point, speeds in blocks per tick.
 */
public final class Flight {
	public static final int IDLE = 0, COUNTDOWN = 1, BURN = 2, COAST = 3, CHUTE = 4, FALL = 5;

	/** Players and mobs under a parachute: fast down high up, then slow for the landing. */
	public static final double PARACHUTE_FAST = 0.5, PARACHUTE_SLOW = 0.15, PARACHUTE_SLOW_BELOW = 16;

	private Flight() {}

	/** The flight part of a rocket spec. apex -1: as high as the world goes. */
	public static final class Spec {
		public double thrust;
		public double maxSpeed;
		public double gravity;
		public double maxFall;
		public double apex;
		public boolean chute;
		public double chuteFast;
		public double chuteSlow;
		public double slowBelow;
		public int countdown;
		/** bottle rocket: apex = pressure * water (or * dry without water) */
		public Pressure pressure;
	}

	public static final class Pressure {
		public double water;
		public double dry;
	}

	public static final class State {
		public int phase = IDLE;
		public int t;
		public double y;
		public double vy;
		public double target;
		/** liftoff, apex or landed on the tick it happens */
		public String event;

		State copy() {
			State s = new State();
			s.phase = phase;
			s.t = t;
			s.y = y;
			s.vy = vy;
			s.target = target;
			return s;
		}
	}

	public static boolean isFlying(int phase) {
		return phase == BURN || phase == COAST || phase == CHUTE || phase == FALL;
	}

	public static double targetHeight(Spec f, int pressure, boolean water, double ceiling) {
		double h;
		if (f.pressure != null) h = pressure * (water ? f.pressure.water : f.pressure.dry);
		else h = f.apex < 0 ? Double.POSITIVE_INFINITY : f.apex;
		return Math.max(1, Math.min(h, ceiling));
	}

	public static State launch(Spec f, double target, int countdown) {
		State s = new State();
		s.target = target;
		if (countdown > 0) {
			s.phase = COUNTDOWN;
			s.t = countdown;
		} else {
			s.phase = BURN;
			s.event = "liftoff";
		}
		return s;
	}

	private static double r6(double n) {
		return Math.round(n * 1e6) / 1e6;
	}

	/**
	 * One tick. grounded: something solid or water under a falling rocket (null: the ground
	 * is at y = 0). blocked: a block over the nose while climbing.
	 */
	public static State step(State state, Spec f, Boolean grounded, boolean blocked) {
		State s = state.copy();
		boolean onGround = grounded != null ? grounded : s.y <= 0;
		switch (s.phase) {
			case COUNTDOWN -> {
				s.t -= 1;
				if (s.t <= 0) {
					s.phase = BURN;
					s.t = 0;
					s.event = "liftoff";
				}
			}
			case BURN -> {
				s.t += 1;
				s.vy = r6(Math.min(f.maxSpeed, s.vy + f.thrust));
				// Cut the engine when coasting would carry the rocket up to its target.
				if (blocked || s.y + (s.vy * s.vy) / (2 * f.gravity) >= s.target) s.phase = COAST;
				if (blocked) return apex(s, f);
				s.y = r6(s.y + s.vy);
			}
			case COAST -> {
				s.vy = r6(s.vy - f.gravity);
				if (s.vy <= 0 || blocked) return apex(s, f);
				s.y = r6(s.y + s.vy);
			}
			case CHUTE -> {
				s.vy = -(s.y > f.slowBelow ? f.chuteFast : f.chuteSlow);
				if (onGround) return land(s);
				s.y = r6(s.y + s.vy);
			}
			case FALL -> {
				s.vy = r6(Math.max(-f.maxFall, s.vy - f.gravity));
				if (onGround) return land(s);
				s.y = r6(s.y + s.vy);
			}
			default -> {
			}
		}
		return s;
	}

	private static State apex(State s, Spec f) {
		s.phase = f.chute ? CHUTE : FALL;
		s.vy = 0;
		s.t = 0;
		s.event = "apex";
		return s;
	}

	private static State land(State s) {
		s.phase = IDLE;
		s.vy = 0;
		s.t = 0;
		s.event = "landed";
		return s;
	}
}
