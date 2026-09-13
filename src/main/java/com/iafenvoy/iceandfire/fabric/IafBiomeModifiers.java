package com.iafenvoy.iceandfire.fabric;

import com.iafenvoy.iceandfire.IceAndFire;
import com.iafenvoy.iceandfire.registry.IafEntities;
import net.fabricmc.fabric.api.biome.v1.BiomeModifications;
import net.fabricmc.fabric.api.biome.v1.BiomeSelectors;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.tags.TagKey;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.level.levelgen.GenerationStep;

/**
 * Code equivalent of upstream's {@code data/iceandfire/neoforge/biome_modifier/*.json}: adds the mod's placed
 * features and mob spawns to the biomes selected by the mod's biome tags.
 */
public final class IafBiomeModifiers {
    private IafBiomeModifiers() {
    }

    public static void init() {
        // Flowers
        addFeature("structure_gen/fire", GenerationStep.Decoration.VEGETAL_DECORATION, "fire_lily");
        addFeature("structure_gen/ice", GenerationStep.Decoration.VEGETAL_DECORATION, "frost_lily");
        addFeature("structure_gen/lightning", GenerationStep.Decoration.VEGETAL_DECORATION, "lightning_lily");
        // Ores
        addFeature("ore_gen/sapphire", GenerationStep.Decoration.UNDERGROUND_ORES, "sapphire_ore");
        addFeature("ore_gen/silver", GenerationStep.Decoration.UNDERGROUND_ORES, "silver_ore");
        // Feature-driven spawns and skeletons
        addFeature("entity_gen/deathworm", GenerationStep.Decoration.SURFACE_STRUCTURES, "spawn_death_worm");
        addFeature("structure_gen/fire", GenerationStep.Decoration.SURFACE_STRUCTURES, "spawn_dragon_skeleton_fire");
        addFeature("structure_gen/ice", GenerationStep.Decoration.SURFACE_STRUCTURES, "spawn_dragon_skeleton_ice");
        addFeature("structure_gen/lightning", GenerationStep.Decoration.SURFACE_STRUCTURES, "spawn_dragon_skeleton_lightning");
        addFeature("entity_gen/hippocampus", GenerationStep.Decoration.SURFACE_STRUCTURES, "spawn_hippocampus");
        addFeature("entity_gen/sea_serpent", GenerationStep.Decoration.SURFACE_STRUCTURES, "spawn_sea_serpent");
        addFeature("entity_gen/stymphalian_bird", GenerationStep.Decoration.SURFACE_STRUCTURES, "spawn_stymphalian_bird");
        addFeature("entity_gen/wandering_cyclops", GenerationStep.Decoration.SURFACE_STRUCTURES, "spawn_wandering_cyclops");
        // Natural spawns
        addSpawn("entity_gen/amphithere", IafEntities.AMPHITHERE.get(), 50, 1, 3);
        addSpawn("entity_gen/cockatrice", IafEntities.COCKATRICE.get(), 4, 1, 2);
        addSpawn("entity_gen/hippogryph", IafEntities.HIPPOGRYPH.get(), 2, 1, 1);
        addSpawn("structure_gen/mausoleum", IafEntities.DREAD_LICH.get(), 4, 1, 1);
        addSpawn("entity_gen/troll", IafEntities.TROLL.get(), 60, 1, 3);
    }

    private static void addFeature(String biomeTag, GenerationStep.Decoration step, String placedFeature) {
        BiomeModifications.addFeature(BiomeSelectors.tag(biomeTag(biomeTag)), step, ResourceKey.create(Registries.PLACED_FEATURE, IceAndFire.id(placedFeature)));
    }

    private static void addSpawn(String biomeTag, EntityType<?> type, int weight, int minGroup, int maxGroup) {
        BiomeModifications.addSpawn(BiomeSelectors.tag(biomeTag(biomeTag)), type.getCategory(), type, weight, minGroup, maxGroup);
    }

    private static TagKey<net.minecraft.world.level.biome.Biome> biomeTag(String path) {
        return TagKey.create(Registries.BIOME, IceAndFire.id(path));
    }
}
