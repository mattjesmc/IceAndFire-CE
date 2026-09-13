package com.iafenvoy.iceandfire.mixin;

import com.iafenvoy.iceandfire.fabric.entity.MultipartLevelAccess;
import com.iafenvoy.iceandfire.fabric.entity.PartEntity;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.Entity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Lets interaction packets that target a part id (attacks and right clicks on a dragon's body) resolve to the part.
 */
@Mixin(ServerLevel.class)
public abstract class ServerLevelMixin {
    @Inject(method = "getEntityOrPart", at = @At("RETURN"), cancellable = true)
    private void iceandfire$getPart(int id, CallbackInfoReturnable<Entity> cir) {
        if (cir.getReturnValue() != null) return;
        PartEntity<?> part = ((MultipartLevelAccess) this).iceandfire$getParts().get(id);
        if (part != null) cir.setReturnValue(part);
    }
}
