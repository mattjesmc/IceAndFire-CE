package com.iafenvoy.iceandfire.fabric.network;

import net.fabricmc.api.EnvType;
import net.fabricmc.api.Environment;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;

@Environment(EnvType.CLIENT)
public final class ClientPacketDistributor {
    private ClientPacketDistributor() {
    }

    public static void sendToServer(CustomPacketPayload payload) {
        if (ClientPlayNetworking.canSend(payload.type())) ClientPlayNetworking.send(payload);
    }
}
