package com.iafenvoy.iceandfire.mixin.client;

import com.iafenvoy.iceandfire.fabric.entity.MultipartEntity;
import com.iafenvoy.iceandfire.fabric.entity.PartEntity;
import net.minecraft.client.renderer.debug.EntityHitboxDebugRenderer;
import net.minecraft.gizmos.GizmoStyle;
import net.minecraft.gizmos.Gizmos;
import net.minecraft.util.ARGB;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.boss.enderdragon.EnderDragon;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(EntityHitboxDebugRenderer.class)
public class EntityHitboxDebugRendererMixin {
    @Inject(method = "showHitboxes", at = @At("TAIL"))
    private void iceandfire$showMultipartHitboxes(Entity entity, float partialTick, boolean serverSide, CallbackInfo ci) {
        if (!(entity instanceof MultipartEntity multipart) || !multipart.isMultipartEntity() || entity instanceof EnderDragon) return;
        PartEntity<?>[] parts = multipart.getParts();
        if (parts == null) return;

        for (PartEntity<?> part : parts) {
            if (part == null) continue;
            Vec3 motion = part.getPosition(partialTick).subtract(part.position());
            AABB bounds = part.getBoundingBox().move(motion);
            Gizmos.cuboid(bounds, GizmoStyle.stroke(ARGB.colorFromFloat(1.0F, 0.25F, 1.0F, 0.0F)));
        }
    }
}
