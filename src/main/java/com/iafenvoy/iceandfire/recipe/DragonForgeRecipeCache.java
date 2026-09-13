package com.iafenvoy.iceandfire.recipe;

import com.iafenvoy.iceandfire.IceAndFire;
import com.iafenvoy.iceandfire.registry.IafRecipes;
import net.fabricmc.api.EnvType;
import net.fabricmc.api.Environment;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayConnectionEvents;
import net.fabricmc.fabric.api.client.recipe.v1.sync.ClientRecipeSynchronizedEvent;
import net.minecraft.world.item.crafting.RecipeHolder;

import java.util.List;

/**
 * Client copy of dragon-forge recipes delivered by Fabric's recipe synchronization
 * (see {@link DragonForgeRecipeSync}).
 */
@Environment(EnvType.CLIENT)
public final class DragonForgeRecipeCache {
    private static volatile List<DragonForgeRecipe> RECIPES = List.of();

    private DragonForgeRecipeCache() {
    }

    public static List<DragonForgeRecipe> get() {
        return RECIPES;
    }

    public static void init() {
        ClientRecipeSynchronizedEvent.EVENT.register((minecraft, recipes) -> {
            RECIPES = recipes.getAllOfType(IafRecipes.DRAGON_FORGE_TYPE.get()).stream().map(RecipeHolder::value).toList();
            IceAndFire.LOGGER.info("Received {} dragon forge recipes from recipe sync", RECIPES.size());
        });
        ClientPlayConnectionEvents.DISCONNECT.register((handler, client) -> RECIPES = List.of());
    }
}
