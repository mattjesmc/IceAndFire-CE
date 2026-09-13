package com.iafenvoy.iceandfire.fabric.entity;

import net.minecraft.network.protocol.Packet;
import net.minecraft.network.protocol.game.ClientGamePacketListener;
import net.minecraft.server.level.ServerEntity;
import net.minecraft.world.entity.Entity;
import org.jetbrains.annotations.NotNull;

/**
 * A collision-only child hitbox of a {@link MultipartEntity}. Parts are never added to the level's entity
 * storage; the owner keeps them in {@link MultipartEntity#getParts()} and the level mixins expose them to
 * entity queries and id lookups (see {@code LevelMixin}, {@code ServerLevelMixin}, {@code ClientLevelMixin}).
 * Mirrors NeoForge's {@code net.neoforged.neoforge.entity.PartEntity}.
 */
public abstract class PartEntity<T extends Entity> extends Entity {
    private final T parent;

    protected PartEntity(T parent) {
        super(parent.getType(), parent.level());
        this.parent = parent;
    }

    public T getParent() {
        return this.parent;
    }

    @Override
    public @NotNull Packet<ClientGamePacketListener> getAddEntityPacket(@NotNull ServerEntity entity) {
        throw new UnsupportedOperationException("Part entities are never spawned on their own");
    }
}
