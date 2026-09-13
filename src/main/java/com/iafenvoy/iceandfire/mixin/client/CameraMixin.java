package com.iafenvoy.iceandfire.mixin.client;

import com.iafenvoy.iceandfire.event.handler.ClientEvents;
import net.minecraft.client.Camera;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyArg;

/**
 * Formerly NeoForge's {@code CalculateDetachedCameraDistanceEvent}: widens the third-person camera while riding a dragon.
 */
@Mixin(Camera.class)
public abstract class CameraMixin {
    @ModifyArg(method = "alignWithEntity", at = @At(value = "INVOKE", target = "Lnet/minecraft/client/Camera;getMaxZoom(F)F"))
    private float iceandfire$dragonCameraDistance(float distance) {
        return ClientEvents.modifyCameraDistance(distance);
    }
}
