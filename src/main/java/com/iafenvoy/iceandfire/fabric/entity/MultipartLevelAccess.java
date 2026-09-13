package com.iafenvoy.iceandfire.fabric.entity;

import it.unimi.dsi.fastutil.ints.Int2ObjectMap;

/**
 * Duck interface implemented on {@code Level} by mixin: the part entities currently tracked in a level, keyed by entity id.
 */
public interface MultipartLevelAccess {
    Int2ObjectMap<PartEntity<?>> iceandfire$getParts();

    default void iceandfire$addParts(Object entity) {
        if (entity instanceof MultipartEntity multipart && multipart.isMultipartEntity()) {
            PartEntity<?>[] parts = multipart.getParts();
            if (parts == null) return;
            for (PartEntity<?> part : parts)
                if (part != null) this.iceandfire$getParts().put(part.getId(), part);
        }
    }

    default void iceandfire$removeParts(Object entity) {
        if (entity instanceof MultipartEntity multipart && multipart.isMultipartEntity()) {
            PartEntity<?>[] parts = multipart.getParts();
            if (parts == null) return;
            for (PartEntity<?> part : parts)
                if (part != null) this.iceandfire$getParts().remove(part.getId());
        }
    }
}
