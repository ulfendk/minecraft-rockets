package dk.ulfen.rockets.block;

import net.minecraft.core.BlockPos;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.VoxelShape;

/** A steel plate four pixels high that rockets stand on. */
public class LaunchPadBlock extends Block {
	private static final VoxelShape SHAPE = Block.box(0, 0, 0, 16, 4, 16);

	public LaunchPadBlock(Properties props) {
		super(props);
	}

	@Override
	protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext ctx) {
		return SHAPE;
	}
}
