package com.iafenvoy.iceandfire.mixin.client;

import com.iafenvoy.iceandfire.fabric.entity.MultipartLevelAccess;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.world.entity.Entity;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Tracks multipart parts alongside their parent in the client level so picking and collision queries see them.
 */
@Mixin(targets = "net.minecraft.client.multiplayer.ClientLevel$EntityCallbacks")
public abstract class ClientLevelEntityCallbacksMixin {
    @Shadow
    @Final
    ClientLevel this$0;

    @Inject(method = "onTrackingStart(Lnet/minecraft/world/entity/Entity;)V", at = @At("TAIL"))
    private void iceandfire$trackParts(Entity entity, CallbackInfo ci) {
        ((MultipartLevelAccess) this.this$0).iceandfire$addParts(entity);
    }

    @Inject(method = "onTrackingEnd(Lnet/minecraft/world/entity/Entity;)V", at = @At("TAIL"))
    private void iceandfire$untrackParts(Entity entity, CallbackInfo ci) {
        ((MultipartLevelAccess) this.this$0).iceandfire$removeParts(entity);
    }
}
