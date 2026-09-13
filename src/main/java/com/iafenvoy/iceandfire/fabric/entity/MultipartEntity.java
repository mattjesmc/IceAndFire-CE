package com.iafenvoy.iceandfire.fabric.entity;

import org.jetbrains.annotations.Nullable;

/**
 * Implemented by entities that own {@link PartEntity} hitboxes (NeoForge's {@code isMultipartEntity}/{@code getParts}).
 */
public interface MultipartEntity {
    default boolean isMultipartEntity() {
        return true;
    }

    /**
     * The child parts of this entity; the returned array should be cached by the implementor.
     */
    PartEntity<?> @Nullable [] getParts();
}
