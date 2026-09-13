package com.iafenvoy.iceandfire.compat;

import net.fabricmc.loader.api.FabricLoader;

public final class IafClientCompat {
    private IafClientCompat() {
    }

    public static boolean isSodiumLoaded() {
        return FabricLoader.getInstance().isModLoaded("sodium") || FabricLoader.getInstance().isModLoaded("embeddium");
    }
}
