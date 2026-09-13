package com.iafenvoy.iceandfire.world.processor;

import com.iafenvoy.iceandfire.IceAndFire;
import com.mojang.serialization.MapCodec;
import net.minecraft.core.BlockPos;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.resources.Identifier;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.LevelReader;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.levelgen.structure.templatesystem.StructurePlaceSettings;
import net.minecraft.world.level.levelgen.structure.templatesystem.StructureProcessor;
import net.minecraft.world.level.levelgen.structure.templatesystem.StructureTemplate;
import org.jetbrains.annotations.NotNull;

public class VillageHouseProcessor implements StructureProcessor {
    public static final Identifier LOOT = Identifier.fromNamespaceAndPath(IceAndFire.MOD_ID, "chest/village_scribe");
    public static final VillageHouseProcessor INSTANCE = new VillageHouseProcessor();
    public static final MapCodec<VillageHouseProcessor> CODEC = MapCodec.unit(() -> INSTANCE);

    @Override
    public StructureTemplate.StructureBlockInfo processBlock(@NotNull LevelReader world, @NotNull BlockPos pos, @NotNull BlockPos pivot, @NotNull BlockPos templateRelativePos, StructureTemplate.StructureBlockInfo currentBlockInfo, StructurePlaceSettings data) {
        RandomSource random = data.getRandom(currentBlockInfo.pos());
        if (currentBlockInfo.state().getBlock() == Blocks.CHEST) {
            CompoundTag tag = new CompoundTag();
            tag.putString("LootTable", LOOT.toString());
            tag.putLong("LootTableSeed", random.nextLong());
            return new StructureTemplate.StructureBlockInfo(currentBlockInfo.pos(), currentBlockInfo.state(), tag);
        }
        return currentBlockInfo;
    }

    @Override
    public @NotNull MapCodec<? extends StructureProcessor> codec() {
        return CODEC;
    }
}
