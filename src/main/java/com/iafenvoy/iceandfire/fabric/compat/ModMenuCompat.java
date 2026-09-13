package com.iafenvoy.iceandfire.fabric.compat;

import com.iafenvoy.iceandfire.config.IafClientConfig;
import com.iafenvoy.iceandfire.config.IafCommonConfig;
import com.iafenvoy.jupiter.render.screen.ConfigSelectScreen;
import com.terraformersmc.modmenu.api.ConfigScreenFactory;
import com.terraformersmc.modmenu.api.ModMenuApi;
import net.minecraft.network.chat.Component;

/**
 * Mod Menu entrypoint exposing the Jupiter config screens (NeoForge: IConfigScreenFactory extension point).
 */
public final class ModMenuCompat implements ModMenuApi {
    @Override
    public ConfigScreenFactory<?> getModConfigScreenFactory() {
        return parent -> ConfigSelectScreen.builder(Component.translatable("config.iceandfire.title"), parent)
                .server(IafCommonConfig.INSTANCE)
                .client(IafClientConfig.INSTANCE)
                .build();
    }
}
