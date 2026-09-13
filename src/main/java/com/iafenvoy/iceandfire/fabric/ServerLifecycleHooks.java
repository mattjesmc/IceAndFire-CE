package com.iafenvoy.iceandfire.fabric;

import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents;
import net.minecraft.server.MinecraftServer;
import org.jetbrains.annotations.Nullable;

/**
 * Tracks the running server so code can reach it without a level reference (NeoForge's ServerLifecycleHooks).
 */
public final class ServerLifecycleHooks {
    @Nullable
    private static volatile MinecraftServer currentServer;

    private ServerLifecycleHooks() {
    }

    public static void init() {
        ServerLifecycleEvents.SERVER_STARTING.register(server -> currentServer = server);
        ServerLifecycleEvents.SERVER_STOPPED.register(server -> {
            if (currentServer == server) currentServer = null;
        });
    }

    @Nullable
    public static MinecraftServer getCurrentServer() {
        return currentServer;
    }
}
