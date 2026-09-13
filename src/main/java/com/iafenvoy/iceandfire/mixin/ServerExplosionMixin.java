package com.iafenvoy.iceandfire.mixin;

import com.iafenvoy.iceandfire.entity.util.BlockLaunchExplosion;
import com.llamalad7.mixinextras.injector.ModifyExpressionValue;
import net.minecraft.core.BlockPos;
import net.minecraft.world.level.ServerExplosion;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;

import java.util.List;

/**
 * Formerly NeoForge's {@code ExplosionEvent.Detonate}: lets {@link BlockLaunchExplosion} launch (or keep) the blocks
 * an explosion is about to destroy.
 */
@Mixin(ServerExplosion.class)
public abstract class ServerExplosionMixin {
    @ModifyExpressionValue(method = "explode", at = @At(value = "INVOKE", target = "Lnet/minecraft/world/level/ServerExplosion;calculateExplodedPositions()Ljava/util/List;"))
    private List<BlockPos> iceandfire$launchBlocks(List<BlockPos> toBlow) {
        return BlockLaunchExplosion.onExplosionDetonate((ServerExplosion) (Object) this, toBlow);
    }
}
