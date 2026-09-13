package com.iafenvoy.iceandfire.fabric;

import net.minecraft.core.Holder;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.Identifier;
import net.minecraft.world.entity.EntityType;

import java.util.Optional;

/**
 * Small replacements for vanilla helpers that disappeared in 26.2.
 */
public final class VanillaCompat {
    private VanillaCompat() {
    }

    /**
     * Formerly {@code EntityType#byString(String)}.
     */
    public static Optional<EntityType<?>> entityTypeByString(String id) {
        return Optional.ofNullable(Identifier.tryParse(id)).flatMap(BuiltInRegistries.ENTITY_TYPE::get).map(Holder.Reference::value);
    }
}
