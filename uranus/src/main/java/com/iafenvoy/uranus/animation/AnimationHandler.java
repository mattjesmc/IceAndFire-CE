package com.iafenvoy.uranus.animation;

import com.iafenvoy.uranus.network.payload.AnimationPayload;
import net.fabricmc.fabric.api.networking.v1.PlayerLookup;
import net.fabricmc.fabric.api.networking.v1.ServerPlayNetworking;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;
import org.apache.commons.lang3.ArrayUtils;

/**
 * @author iLexiconn
 * @since 1.0.0
 */
public enum AnimationHandler {
    INSTANCE;

    /**
     * Sends an animation packet to all clients tracking the entity, notifying them of a changed animation
     *
     * @param entity    the entity with an animation to be updated
     * @param animation the animation to be updated
     * @param <T>       the entity type
     */
    public <T extends Entity & IAnimatedEntity> void sendAnimationMessage(T entity, Animation animation) {
        if (entity.level().isClientSide()) return;
        entity.setAnimation(animation);
        AnimationPayload payload = new AnimationPayload(entity.getId(), ArrayUtils.indexOf(entity.getAnimations(), animation));
        for (ServerPlayer player : PlayerLookup.tracking(entity))
            ServerPlayNetworking.send(player, payload);
    }

    /**
     * Updates all animations for a given entity
     *
     * @param entity the entity with an animation to be updated
     * @param <T>    the entity type
     */
    public <T extends Entity & IAnimatedEntity> void updateAnimations(T entity) {
        if (entity.getAnimation() == null)
            entity.setAnimation(IAnimatedEntity.NO_ANIMATION);
        else if (entity.getAnimation() != IAnimatedEntity.NO_ANIMATION) {
            if (entity.getAnimationTick() == 0) {
                if (AnimationEvent.START.invoker().onAnimationStart(entity, entity.getAnimation()))
                    this.sendAnimationMessage(entity, entity.getAnimation());
            }
            if (entity.getAnimationTick() < entity.getAnimation().getDuration()) {
                entity.setAnimationTick(entity.getAnimationTick() + 1);
                Animation animation = entity.getAnimation();
                AnimationEvent.TICK.invoker().onAnimationTick(entity, animation, entity.getAnimationTick());
            }
            if (entity.getAnimationTick() == entity.getAnimation().getDuration()) {
                entity.setAnimationTick(0);
                entity.setAnimation(IAnimatedEntity.NO_ANIMATION);
            }
        }
    }
}
