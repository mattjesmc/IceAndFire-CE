package com.iafenvoy.iceandfire;

import com.iafenvoy.iceandfire.config.IafClientConfig;
import com.iafenvoy.iceandfire.event.handler.ClientEvents;
import com.iafenvoy.iceandfire.fabric.network.ClientReceivers;
import com.iafenvoy.iceandfire.recipe.DragonForgeRecipeCache;
import com.iafenvoy.iceandfire.registry.IafKeyMappings;
import com.iafenvoy.iceandfire.registry.IafMenus;
import com.iafenvoy.iceandfire.registry.IafRenderers;
import com.iafenvoy.iceandfire.render.SirenShaderRenderHelper;
import com.iafenvoy.iceandfire.screen.gui.*;
import com.iafenvoy.iceandfire.screen.gui.bestiary.BestiaryScreen;
import com.iafenvoy.jupiter.ConfigManager;
import net.fabricmc.api.EnvType;
import net.fabricmc.api.Environment;
import net.fabricmc.fabric.api.resource.v1.ResourceLoader;
import net.fabricmc.fabric.api.resource.v1.pack.PackActivationType;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.gui.screens.MenuScreens;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.Identifier;

@Environment(EnvType.CLIENT)
public final class IceAndFireClient {
    private IceAndFireClient() {
    }

    /**
     * Client initialization, called once from the Fabric {@code client} entrypoint (after {@link IceAndFire#init()}).
     */
    public static void init() {
        ConfigManager.getInstance().registerConfigHandler(IafClientConfig.INSTANCE);

        IafRenderers.registerModelPredicates();
        IafRenderers.registerArmorRenderers();
        IafRenderers.registerItemRenderers();
        IafRenderers.registerEntityRenderers();
        IafRenderers.registerBlockEntityRenderers();
        IafRenderers.registerParticleRenderers();
        registerScreens();

        IafKeyMappings.init();
        ClientReceivers.register();
        ClientEvents.init();
        SirenShaderRenderHelper.init();
        DragonForgeRecipeCache.init();

        FabricLoader.getInstance().getModContainer(IceAndFire.MOD_ID).ifPresent(container ->
                ResourceLoader.registerBuiltinPack(Identifier.fromNamespaceAndPath(IceAndFire.MOD_ID, "iaf_legacy"), container, Component.translatable("resourcePack.iceandfire.legacy.name"), PackActivationType.NORMAL));
    }

    private static void registerScreens() {
        MenuScreens.register(IafMenus.IAF_LECTERN_SCREEN.get(), LecternScreen::new);
        MenuScreens.register(IafMenus.PODIUM_SCREEN.get(), PodiumScreen::new);
        MenuScreens.register(IafMenus.DRAGON_SCREEN.get(), DragonScreen::new);
        MenuScreens.register(IafMenus.HIPPOGRYPH_SCREEN.get(), HippogryphScreen::new);
        MenuScreens.register(IafMenus.HIPPOCAMPUS_SCREEN.get(), HippocampusScreen::new);
        MenuScreens.register(IafMenus.DRAGON_FORGE_SCREEN.get(), DragonForgeScreen::new);
        MenuScreens.register(IafMenus.BESTIARY_SCREEN.get(), BestiaryScreen::new);
    }
}
