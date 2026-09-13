package com.iafenvoy.iceandfire;

import com.iafenvoy.iceandfire.config.IafCommonConfig;
import com.iafenvoy.iceandfire.data.DragonColor;
import com.iafenvoy.iceandfire.data.IafSkullType;
import com.iafenvoy.iceandfire.data.SeaSerpentType;
import com.iafenvoy.iceandfire.data.TrollType;
import com.iafenvoy.iceandfire.event.handler.ServerEvents;
import com.iafenvoy.iceandfire.fabric.IafBiomeModifiers;
import com.iafenvoy.iceandfire.fabric.ServerLifecycleHooks;
import com.iafenvoy.iceandfire.network.NetworkManager;
import com.iafenvoy.iceandfire.recipe.DragonForgeRecipeSync;
import com.iafenvoy.iceandfire.registry.*;
import com.iafenvoy.jupiter.ConfigManager;
import com.iafenvoy.jupiter.ServerConfigManager;
import net.fabricmc.fabric.api.registry.FabricPotionBrewingBuilder;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.resources.Identifier;
import net.minecraft.world.item.alchemy.Potions;
import net.minecraft.world.item.crafting.Ingredient;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

public final class IceAndFire {
    public static final Logger LOGGER = LogManager.getLogger();
    public static final String MOD_ID = "iceandfire";
    public static final String VERSION = FabricLoader.getInstance().getModContainer(MOD_ID)
            .map(container -> container.getMetadata().getVersion().getFriendlyString())
            .orElse("UNKNOWN");

    private IceAndFire() {
    }

    //TODO: IceAndFire::id is a temporary fix to capable with old version, should be removed in later versions
    public static Identifier id(String path) {
        if (path.contains(":")) return Identifier.tryParse(path);
        else return Identifier.fromNamespaceAndPath(MOD_ID, path);
    }

    /**
     * Common (both sides) initialization, called once from the Fabric {@code main} entrypoint.
     * <p>
     * Unlike NeoForge's registry events, the deferred registers push their entries into the vanilla registries right
     * here, so the order below matters: everything an entry's supplier reads must already be registered.
     */
    public static void init() {
        ConfigManager.getInstance().registerConfigHandler(IafCommonConfig.INSTANCE);
        ServerConfigManager.registerServerConfig(IafCommonConfig.INSTANCE, ServerConfigManager.PermissionChecker.IS_OPERATOR);

        IafBestiaryPages.init();
        IafDragonColors.init();
        IafDragonTypes.init();
        IafHippogryphTypes.init();
        IafSeaSerpentTypes.init();
        IafTrollTypes.init();

        DragonColor.initArmors();
        SeaSerpentType.initArmors();
        IafSkullType.initItems();
        TrollType.initArmors();

        IafAttributes.REGISTRY.register();
        IafSounds.REGISTRY.register();
        IafBlocks.REGISTRY.register();
        IafBlockEntities.REGISTRY.register();
        IafDataComponents.REGISTRY.register();
        IafMobEffects.REGISTRY.register();
        IafPotions.REGISTRY.register();
        IafEntities.REGISTRY.register();
        IafItems.REGISTRY.register();
        IafCreativeModeTabs.REGISTRY.register();
        IafLoots.REGISTRY.register();
        IafRecipes.REGISTRY.register();
        IafRecipeSerializers.REGISTRY.register();
        IafParticles.REGISTRY.register();
        IafProcessors.REGISTRY.register();
        IafFeatures.REGISTRY.register();
        IafMenus.REGISTRY.register();
        IafStructurePieces.REGISTRY.register();
        IafStructureTypes.REGISTRY.register();
        //Trade
        IafTrades.POI_REGISTRY.register();
        IafTrades.PROFESSION_REGISTRY.register();

        IafAttachments.init();
        IafEntities.registerAttributes();
        IafEntities.registerPlacements();
        IafBiomeModifiers.init();
        NetworkManager.registerPayloads();
        ServerLifecycleHooks.init();
        ServerEvents.init();
        DragonForgeRecipeSync.init();

        FabricPotionBrewingBuilder.BUILD.register(builder -> {
            builder.registerPotionRecipe(Potions.WATER, Ingredient.of(IafItems.SHINY_SCALES.get()), Potions.WATER_BREATHING);
            builder.registerPotionRecipe(Potions.AWKWARD, Ingredient.of(IafItems.GORGON_HEAD.get()), IafPotions.DEPETRIFICATION.holder());
        });

        // Formerly FMLCommonSetupEvent
        IafTrades.registerPoiStates();
        IafRecipes.init();
        IafTiers.init();
    }
}
