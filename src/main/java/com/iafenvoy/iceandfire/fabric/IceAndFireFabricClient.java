package com.iafenvoy.iceandfire.fabric;

import com.iafenvoy.iceandfire.IceAndFireClient;
import net.fabricmc.api.ClientModInitializer;

public final class IceAndFireFabricClient implements ClientModInitializer {
    @Override
    public void onInitializeClient() {
        IceAndFireClient.init();
    }
}
