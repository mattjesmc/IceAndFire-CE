package com.iafenvoy.iceandfire.fabric.network;

import com.iafenvoy.iceandfire.fabric.ServerLifecycleHooks;
import net.fabricmc.fabric.api.networking.v1.PlayerLookup;
import net.fabricmc.fabric.api.networking.v1.ServerPlayNetworking;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.level.block.entity.BlockEntity;

/**
 * Server-side payload sending helpers with NeoForge-style names.
 */
public final class PacketDistributor {
    private PacketDistributor() {
    }

    public static void sendToPlayer(ServerPlayer player, CustomPacketPayload payload) {
        ServerPlayNetworking.send(player, payload);
    }

    public static void sendToAllPlayers(CustomPacketPayload payload) {
        MinecraftServer server = ServerLifecycleHooks.getCurrentServer();
        if (server == null) return;
        for (ServerPlayer player : PlayerLookup.all(server))
            ServerPlayNetworking.send(player, payload);
    }

    public static void sendToPlayersTrackingEntity(Entity entity, CustomPacketPayload payload) {
        for (ServerPlayer player : PlayerLookup.tracking(entity))
            ServerPlayNetworking.send(player, payload);
    }

    public static void sendToPlayersTrackingEntityAndSelf(Entity entity, CustomPacketPayload payload) {
        sendToPlayersTrackingEntity(entity, payload);
        if (entity instanceof ServerPlayer player) ServerPlayNetworking.send(player, payload);
    }

    public static void sendToPlayersTrackingChunk(BlockEntity blockEntity, CustomPacketPayload payload) {
        for (ServerPlayer player : PlayerLookup.tracking(blockEntity))
            ServerPlayNetworking.send(player, payload);
    }
}
