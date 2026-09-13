package com.iafenvoy.iceandfire.mixin;

import net.minecraft.world.entity.Entity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

@Mixin(Entity.class)
public interface EntityAccessor {
    /**
     * The raw network id. 26.2 leaves it at 0 until the level (server) or the spawn packet (client) assigns one,
     * and {@link Entity#getId()} throws while it is 0.
     */
    @Accessor("id")
    int iceandfire$getRawId();
}
