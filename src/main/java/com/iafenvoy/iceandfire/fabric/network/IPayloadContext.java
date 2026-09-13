package com.iafenvoy.iceandfire.fabric.network;

import net.minecraft.world.entity.player.Player;

/**
 * Handler context passed to payload handlers. Fabric already dispatches payload handlers on the game thread,
 * so {@link #enqueueWork(Runnable)} runs the task immediately.
 */
public interface IPayloadContext {
    Player player();

    default void enqueueWork(Runnable task) {
        task.run();
    }

    static IPayloadContext of(Player player) {
        return () -> player;
    }
}
