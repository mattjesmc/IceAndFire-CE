package com.iafenvoy.iceandfire.render.entity;

import com.iafenvoy.iceandfire.registry.IafBlocks;
import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.math.Axis;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.renderer.SubmitNodeCollector;
import net.minecraft.client.renderer.block.MovingBlockRenderState;
import net.minecraft.client.renderer.entity.EntityRenderer;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.state.level.CameraRenderState;
import net.minecraft.client.renderer.texture.TextureAtlas;
import net.minecraft.core.BlockPos;
import net.minecraft.resources.Identifier;
import net.minecraft.world.entity.projectile.hurtingprojectile.Fireball;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import org.jetbrains.annotations.NotNull;
import org.jspecify.annotations.NonNull;

/**
 * Renders fire/ice dragon charges as a block (magma or dragon ice) through the moving-block feature renderer.
 */
public class DragonChargeEntityRenderer extends EntityRenderer<Fireball, DragonChargeEntityRenderer.State> {
    public final boolean isFire;

    public DragonChargeEntityRenderer(EntityRendererProvider.Context context, boolean isFire) {
        super(context);
        this.isFire = isFire;
    }

    @SuppressWarnings("deprecation")
    public @NotNull Identifier getTextureLocation(@NotNull Fireball entity) {
        return TextureAtlas.LOCATION_BLOCKS;
    }

    @Override
    public State createRenderState() {
        return new State();
    }

    @Override
    public void extractRenderState(Fireball entity, State state, float partialTicks) {
        super.extractRenderState(entity, state, partialTicks);
        state.entity = entity;
        state.partialTick = partialTicks;
        BlockState blockState = this.isFire ? Blocks.MAGMA_BLOCK.defaultBlockState() : IafBlocks.DRAGON_ICE.get().defaultBlockState();
        BlockPos pos = entity.blockPosition();
        state.movingBlock.randomSeedPos = pos;
        state.movingBlock.blockPos = pos;
        state.movingBlock.blockState = blockState;
        if (entity.level() instanceof ClientLevel clientLevel) {
            state.movingBlock.biome = clientLevel.getBiome(pos);
            state.movingBlock.cardinalLighting = clientLevel.cardinalLighting();
            state.movingBlock.lightEngine = clientLevel.getLightEngine();
        }
    }

    @Override
    public void submit(State state, PoseStack matrixStackIn, @NonNull SubmitNodeCollector collector, @NonNull CameraRenderState camera) {
        matrixStackIn.pushPose();
        matrixStackIn.translate(0.0D, 0.5D, 0.0D);
        matrixStackIn.mulPose(Axis.YP.rotationDegrees(-90.0F));
        matrixStackIn.translate(-0.5D, -0.5D, 0.5D);
        matrixStackIn.mulPose(Axis.YP.rotationDegrees(90.0F));
        collector.submitMovingBlock(matrixStackIn, state.movingBlock, state.outlineColor);
        matrixStackIn.popPose();
        super.submit(state, matrixStackIn, collector, camera);
    }

    public static class State extends LegacyEntityRenderState<Fireball> {
        public final MovingBlockRenderState movingBlock = new MovingBlockRenderState();
    }
}
