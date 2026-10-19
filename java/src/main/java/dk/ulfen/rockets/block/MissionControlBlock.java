package dk.ulfen.rockets.block;

import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.BlockHitResult;

/** Right-click to count down from 10 and launch the rockets on the pads nearby; again to abort. */
public class MissionControlBlock extends Block {
	public MissionControlBlock(Properties props) {
		super(props);
	}

	@Override
	protected InteractionResult useWithoutItem(BlockState state, Level level, BlockPos pos, Player player, BlockHitResult hit) {
		if (level instanceof ServerLevel server) Countdowns.toggle(server, pos, player, Countdowns.SECONDS);
		return InteractionResult.SUCCESS;
	}
}
