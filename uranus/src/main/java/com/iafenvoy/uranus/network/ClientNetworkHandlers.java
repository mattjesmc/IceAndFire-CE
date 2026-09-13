package com.iafenvoy.uranus.network;

import com.iafenvoy.uranus.animation.IAnimatedEntity;
import com.iafenvoy.uranus.network.payload.AnimationPayload;
import net.fabricmc.api.EnvType;
import net.fabricmc.api.Environment;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking;
import net.minecraft.world.level.Level;

@Environment(EnvType.CLIENT)
public final class ClientNetworkHandlers {
    private ClientNetworkHandlers() {
    }

    public static void register() {
        ClientPlayNetworking.registerGlobalReceiver(AnimationPayload.ID, (payload, context) -> onAnimation(payload, context.player().level()));
    }

    public static void onAnimation(AnimationPayload payload, Level world) {
        if (world.getEntity(payload.entityID()) instanceof IAnimatedEntity entity) {
            if (payload.index() == -1) entity.setAnimation(IAnimatedEntity.NO_ANIMATION);
            else entity.setAnimation(entity.getAnimations()[payload.index()]);
            entity.setAnimationTick(0);
        }
    }
}
