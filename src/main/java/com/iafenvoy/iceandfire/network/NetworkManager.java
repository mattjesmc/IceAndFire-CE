package com.iafenvoy.iceandfire.network;

import com.iafenvoy.iceandfire.fabric.network.IPayloadContext;
import com.iafenvoy.iceandfire.network.payload.*;
import net.fabricmc.fabric.api.networking.v1.PayloadTypeRegistry;
import net.fabricmc.fabric.api.networking.v1.ServerPlayNetworking;

/**
 * Registers payload types (both directions) and the server-side receivers.
 * Client receivers live in {@link com.iafenvoy.iceandfire.fabric.network.ClientReceivers}.
 */
public final class NetworkManager {
    private NetworkManager() {
    }

    public static void registerPayloads() {
        PayloadTypeRegistry.clientboundPlay().register(DragonSetBurnBlockS2CPayload.ID, DragonSetBurnBlockS2CPayload.CODEC);
        PayloadTypeRegistry.clientboundPlay().register(LightningBoltS2CPayload.ID, LightningBoltS2CPayload.CODEC);
        PayloadTypeRegistry.clientboundPlay().register(UpdatePixieHouseS2CPayload.ID, UpdatePixieHouseS2CPayload.CODEC);
        PayloadTypeRegistry.clientboundPlay().register(UpdatePixieJarS2CPayload.ID, UpdatePixieJarS2CPayload.CODEC);
        PayloadTypeRegistry.clientboundPlay().register(UpdatePodiumS2CPayload.ID, UpdatePodiumS2CPayload.CODEC);

        PayloadTypeRegistry.serverboundPlay().register(DragonControlC2SPayload.ID, DragonControlC2SPayload.CODEC);

        PayloadTypeRegistry.clientboundPlay().register(StartRidingMobPayload.ID, StartRidingMobPayload.CODEC);
        PayloadTypeRegistry.serverboundPlay().register(StartRidingMobPayload.ID, StartRidingMobPayload.CODEC);

        ServerPlayNetworking.registerGlobalReceiver(DragonControlC2SPayload.ID, (payload, context) -> ServerNetworkHandlers.handleDragonControl(payload, IPayloadContext.of(context.player())));
        ServerPlayNetworking.registerGlobalReceiver(StartRidingMobPayload.ID, (payload, context) -> ServerNetworkHandlers.handleStartRidingMob(payload, IPayloadContext.of(context.player())));
    }
}
