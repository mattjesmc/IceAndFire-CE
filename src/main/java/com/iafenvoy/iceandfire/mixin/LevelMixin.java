package com.iafenvoy.iceandfire.mixin;

import com.iafenvoy.iceandfire.fabric.entity.MultipartLevelAccess;
import com.iafenvoy.iceandfire.fabric.entity.PartEntity;
import it.unimi.dsi.fastutil.ints.Int2ObjectMap;
import it.unimi.dsi.fastutil.ints.Int2ObjectOpenHashMap;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.entity.EntityTypeTest;
import net.minecraft.world.phys.AABB;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

import java.util.List;
import java.util.function.Predicate;

/**
 * Exposes the mod's {@link PartEntity} hitboxes to the level's entity queries, the way vanilla does for
 * ender dragon parts (NeoForge generalizes this for every multipart entity).
 */
@Mixin(Level.class)
public abstract class LevelMixin implements MultipartLevelAccess {
    @Unique
    private final Int2ObjectMap<PartEntity<?>> iceandfire$parts = new Int2ObjectOpenHashMap<>();

    @Override
    public Int2ObjectMap<PartEntity<?>> iceandfire$getParts() {
        return this.iceandfire$parts;
    }

    @Inject(method = "getEntities(Lnet/minecraft/world/entity/Entity;Lnet/minecraft/world/phys/AABB;Ljava/util/function/Predicate;)Ljava/util/List;", at = @At("RETURN"))
    private void iceandfire$addPartsToEntityQuery(Entity except, AABB bb, Predicate<? super Entity> selector, CallbackInfoReturnable<List<Entity>> cir) {
        if (this.iceandfire$parts.isEmpty()) return;
        List<Entity> output = cir.getReturnValue();
        for (PartEntity<?> part : this.iceandfire$parts.values())
            if (part != except && part.getParent() != except && selector.test(part) && bb.intersects(part.getBoundingBox()))
                output.add(part);
    }

    @Inject(method = "getEntities(Lnet/minecraft/world/level/entity/EntityTypeTest;Lnet/minecraft/world/phys/AABB;Ljava/util/function/Predicate;Ljava/util/List;I)V", at = @At("TAIL"))
    private <T extends Entity> void iceandfire$addPartsToTypedQuery(EntityTypeTest<Entity, T> type, AABB bb, Predicate<? super T> selector, List<? super T> output, int maxResults, CallbackInfo ci) {
        if (this.iceandfire$parts.isEmpty()) return;
        for (PartEntity<?> part : this.iceandfire$parts.values()) {
            if (output.size() >= maxResults) return;
            T cast = type.tryCast(part);
            if (cast != null && cast.getBoundingBox().intersects(bb) && selector.test(cast))
                output.add(cast);
        }
    }

    @Inject(method = "hasEntities", at = @At("RETURN"), cancellable = true)
    private <T extends Entity> void iceandfire$hasParts(EntityTypeTest<Entity, T> type, AABB bb, Predicate<? super T> selector, CallbackInfoReturnable<Boolean> cir) {
        if (cir.getReturnValueZ() || this.iceandfire$parts.isEmpty()) return;
        for (PartEntity<?> part : this.iceandfire$parts.values()) {
            T cast = type.tryCast(part);
            if (cast != null && cast.getBoundingBox().intersects(bb) && selector.test(cast)) {
                cir.setReturnValue(true);
                return;
            }
        }
    }
}
