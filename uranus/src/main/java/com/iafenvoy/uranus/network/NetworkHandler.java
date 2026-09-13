package com.iafenvoy.uranus.network;

import com.iafenvoy.uranus.network.payload.AnimationPayload;
import net.fabricmc.fabric.api.networking.v1.PayloadTypeRegistry;

public final class NetworkHandler {
    private NetworkHandler() {
    }

    public static void registerPayloads() {
        PayloadTypeRegistry.clientboundPlay().register(AnimationPayload.ID, AnimationPayload.CODEC);
    }
}
