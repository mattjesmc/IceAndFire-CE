package com.iafenvoy.iceandfire.registry;

import com.iafenvoy.iceandfire.IceAndFire;
import com.iafenvoy.iceandfire.fabric.registry.DeferredHolder;
import com.iafenvoy.iceandfire.fabric.registry.DeferredRegister;
import com.iafenvoy.iceandfire.world.processor.DreadRuinProcessor;
import com.iafenvoy.iceandfire.world.processor.GraveyardProcessor;
import com.iafenvoy.iceandfire.world.processor.VillageHouseProcessor;
import com.mojang.serialization.MapCodec;
import net.minecraft.core.registries.Registries;
import net.minecraft.world.level.levelgen.structure.templatesystem.StructureProcessor;

/**
 * Structure processor types. Since 26.2 the registry holds the processors' map codecs directly.
 */
public final class IafProcessors {
    public static final DeferredRegister<MapCodec<? extends StructureProcessor>> REGISTRY = DeferredRegister.create(Registries.STRUCTURE_PROCESSOR, IceAndFire.MOD_ID);

    public static final DeferredHolder<MapCodec<? extends StructureProcessor>, MapCodec<GraveyardProcessor>> GRAVEYARD_PROCESSOR = REGISTRY.register("graveyard_processor", () -> GraveyardProcessor.CODEC);
    public static final DeferredHolder<MapCodec<? extends StructureProcessor>, MapCodec<VillageHouseProcessor>> VILLAGE_HOUSE_PROCESSOR = REGISTRY.register("village_house_processor", () -> VillageHouseProcessor.CODEC);
    public static final DeferredHolder<MapCodec<? extends StructureProcessor>, MapCodec<DreadRuinProcessor>> DREAD_MAUSOLEUM_PROCESSOR = REGISTRY.register("dread_mausoleum_processor", () -> DreadRuinProcessor.CODEC);

    private IafProcessors() {
    }
}
