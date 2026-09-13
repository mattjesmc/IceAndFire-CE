package com.iafenvoy.iceandfire.fabric.registry;

import net.minecraft.core.registries.Registries;
import net.minecraft.resources.Identifier;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.ItemLike;
import org.jetbrains.annotations.NotNull;

import java.util.function.Function;

public class DeferredItem<T extends Item> extends DeferredHolder<Item, T> implements ItemLike {
    protected DeferredItem(Identifier id, Function<Identifier, ? extends T> factory) {
        super(Registries.ITEM, id, factory);
    }

    public static <T extends Item> DeferredItem<T> createItem(Identifier id, Function<Identifier, ? extends T> factory) {
        return new DeferredItem<>(id, factory);
    }

    public ItemStack toStack() {
        return this.toStack(1);
    }

    public ItemStack toStack(int count) {
        ItemStack stack = this.get().getDefaultInstance();
        if (stack.isEmpty()) throw new IllegalStateException("Item " + this.getId() + " has no default instance");
        stack.setCount(count);
        return stack;
    }

    @Override
    public @NotNull Item asItem() {
        return this.get();
    }
}
