package com.iafenvoy.iceandfire.recipe;

import com.iafenvoy.iceandfire.registry.IafRecipeSerializers;
import net.fabricmc.fabric.api.recipe.v1.sync.RecipeSynchronization;

/**
 * Asks Fabric's recipe synchronization to send {@code iceandfire:dragonforge} recipes to the client.
 * The client stores them in {@link DragonForgeRecipeCache}.
 */
public final class DragonForgeRecipeSync {
    private DragonForgeRecipeSync() {
    }

    public static void init() {
        for (var serializer : IafRecipeSerializers.REGISTRY.getEntries())
            RecipeSynchronization.synchronizeRecipeSerializer(serializer.get());
    }
}
