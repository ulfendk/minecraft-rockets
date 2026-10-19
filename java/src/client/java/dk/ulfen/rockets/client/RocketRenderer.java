package dk.ulfen.rockets.client;

import com.geckolib.animatable.GeoEntity;
import com.geckolib.model.DefaultedEntityGeoModel;
import com.geckolib.renderer.GeoEntityRenderer;
import com.geckolib.renderer.base.GeoRenderState;
import dk.ulfen.rockets.ModRegistry;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.state.LivingEntityRenderState;
import net.minecraft.client.renderer.rendertype.RenderType;
import net.minecraft.client.renderer.rendertype.RenderTypes;
import net.minecraft.resources.Identifier;
import net.minecraft.world.entity.Mob;
import org.jspecify.annotations.Nullable;

/**
 * GeckoLib renderer for the rockets and the parachute, scaled like the Bedrock version, with
 * see-through glass and bottles. Flames and canopies reach outside the hitbox, so no culling.
 */
public class RocketRenderer<T extends Mob & GeoEntity, R extends LivingEntityRenderState & GeoRenderState> extends GeoEntityRenderer<T, R> {
	public RocketRenderer(EntityRendererProvider.Context ctx, String id, float scale, float shadow) {
		super(ctx, new DefaultedEntityGeoModel<>(ModRegistry.id(id)));
		this.withScale(scale);
		this.shadowRadius = shadow;
	}

	@Override
	public @Nullable RenderType getRenderType(R renderState, Identifier texture) {
		// glass texels are half transparent; cutout would draw them solid
		if (!renderState.isInvisible) return RenderTypes.entityTranslucent(texture);
		return super.getRenderType(renderState, texture);
	}

	@Override
	protected boolean affectedByCulling(T entity) {
		return false;
	}
}
