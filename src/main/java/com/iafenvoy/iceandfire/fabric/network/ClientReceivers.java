package com.iafenvoy.iceandfire.fabric.network;

import com.iafenvoy.iceandfire.network.ClientNetworkHandlers;
import com.iafenvoy.iceandfire.network.payload.*;
import net.fabricmc.api.EnvType;
import net.fabricmc.api.Environment;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking;

@Environment(EnvType.CLIENT)
public final class ClientReceivers {
    private ClientReceivers() {
    }

    public static void register() {
        ClientPlayNetworking.registerGlobalReceiver(DragonSetBurnBlockS2CPayload.ID, (payload, context) -> ClientNetworkHandlers.handleDragonSetBurnBlock(payload, IPayloadContext.of(context.player())));
        ClientPlayNetworking.registerGlobalReceiver(LightningBoltS2CPayload.ID, (payload, context) -> ClientNetworkHandlers.handleLightningBolt(payload, IPayloadContext.of(context.player())));
        ClientPlayNetworking.registerGlobalReceiver(UpdatePixieHouseS2CPayload.ID, (payload, context) -> ClientNetworkHandlers.handleUpdatePixieHouse(payload, IPayloadContext.of(context.player())));
        ClientPlayNetworking.registerGlobalReceiver(UpdatePixieJarS2CPayload.ID, (payload, context) -> ClientNetworkHandlers.handleUpdatePixieJar(payload, IPayloadContext.of(context.player())));
        ClientPlayNetworking.registerGlobalReceiver(UpdatePodiumS2CPayload.ID, (payload, context) -> ClientNetworkHandlers.handleUpdatePodium(payload, IPayloadContext.of(context.player())));
        ClientPlayNetworking.registerGlobalReceiver(StartRidingMobPayload.ID, (payload, context) -> ClientNetworkHandlers.handleStartRidingMob(payload, IPayloadContext.of(context.player())));
    }
}
