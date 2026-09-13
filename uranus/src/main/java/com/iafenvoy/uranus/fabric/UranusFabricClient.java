package com.iafenvoy.uranus.fabric;

import com.iafenvoy.uranus.client.model.util.TabulaModelHandlerHelper;
import com.iafenvoy.uranus.client.render.DynamicItemRenderer;
import com.iafenvoy.uranus.network.ClientNetworkHandlers;
import net.fabricmc.api.ClientModInitializer;

public final class UranusFabricClient implements ClientModInitializer {
    @Override
    public void onInitializeClient() {
        ClientNetworkHandlers.register();
        TabulaModelHandlerHelper.registerReloadListener();
        DynamicItemRenderer.registerRenderer();
    }
}
