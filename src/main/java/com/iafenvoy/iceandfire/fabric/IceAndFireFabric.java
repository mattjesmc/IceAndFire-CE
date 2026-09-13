package com.iafenvoy.iceandfire.fabric;

import com.iafenvoy.iceandfire.IceAndFire;
import net.fabricmc.api.ModInitializer;

public final class IceAndFireFabric implements ModInitializer {
    @Override
    public void onInitialize() {
        IceAndFire.init();
    }
}
