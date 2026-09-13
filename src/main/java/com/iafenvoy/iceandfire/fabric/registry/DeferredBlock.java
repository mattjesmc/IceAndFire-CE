package com.iafenvoy.iceandfire.fabric.registry;

import net.minecraft.core.registries.Registries;
import net.minecraft.resources.Identifier;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.ItemLike;
import net.minecraft.world.level.block.Block;
import org.jetbrains.annotations.NotNull;

import java.util.function.Function;

public class DeferredBlock<T extends Block> extends DeferredHolder<Block, T> implements ItemLike {
    protected DeferredBlock(Identifier id, Function<Identifier, ? extends T> factory) {
        super(Registries.BLOCK, id, factory);
    }

    public static <T extends Block> DeferredBlock<T> createBlock(Identifier id, Function<Identifier, ? extends T> factory) {
        return new DeferredBlock<>(id, factory);
    }

    @Override
    public @NotNull Item asItem() {
        return this.get().asItem();
    }
}
