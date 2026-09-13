package com.iafenvoy.iceandfire.fabric.registry;

import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.Identifier;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.block.Block;
import org.jetbrains.annotations.Nullable;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * Minimal Fabric stand-in for NeoForge's {@code DeferredRegister}.
 * <p>
 * Entries are collected as they are declared (static initializers) and pushed into the vanilla registry
 * when {@link #register()} is called from the mod initializer. Registration order across registers is the
 * caller's responsibility (blocks before items, effects before potions, ...).
 */
public class DeferredRegister<T> {
    private final ResourceKey<? extends Registry<T>> registryKey;
    @Nullable
    private Registry<T> registry;
    private final String namespace;
    private final List<DeferredHolder<T, ? extends T>> entries = new ArrayList<>();
    private boolean registered;

    protected DeferredRegister(ResourceKey<? extends Registry<T>> registryKey, @Nullable Registry<T> registry, String namespace) {
        this.registryKey = registryKey;
        this.registry = registry;
        this.namespace = namespace;
    }

    public static <T> DeferredRegister<T> create(ResourceKey<? extends Registry<T>> key, String namespace) {
        return new DeferredRegister<>(key, null, namespace);
    }

    public static <T> DeferredRegister<T> create(Registry<T> registry, String namespace) {
        return new DeferredRegister<>(registry.key(), registry, namespace);
    }

    public static Items createItems(String namespace) {
        return new Items(namespace);
    }

    public static Blocks createBlocks(String namespace) {
        return new Blocks(namespace);
    }

    public <I extends T> DeferredHolder<T, I> register(String name, Supplier<? extends I> supplier) {
        return this.register(name, id -> supplier.get());
    }

    public <I extends T> DeferredHolder<T, I> register(String name, Function<Identifier, ? extends I> factory) {
        return this.add(DeferredHolder.create(this.registryKey, Identifier.fromNamespaceAndPath(this.namespace, name), factory));
    }

    protected <H extends DeferredHolder<T, ? extends T>> H add(H holder) {
        if (this.registered)
            throw new IllegalStateException("Cannot add entries to " + this.registryKey.identifier() + " after registration");
        this.entries.add(holder);
        return holder;
    }

    public ResourceKey<? extends Registry<T>> getRegistryKey() {
        return this.registryKey;
    }

    public String getNamespace() {
        return this.namespace;
    }

    public Collection<DeferredHolder<T, ? extends T>> getEntries() {
        return Collections.unmodifiableList(this.entries);
    }

    @SuppressWarnings("unchecked")
    public Registry<T> getRegistry() {
        if (this.registry == null) {
            Registry<?> found = BuiltInRegistries.REGISTRY.getValue(this.registryKey.identifier());
            this.registry = (Registry<T>) Objects.requireNonNull(found, () -> "Unknown registry " + this.registryKey.identifier());
        }
        return this.registry;
    }

    /**
     * Pushes every collected entry into the backing registry. Safe to call more than once; later calls are no-ops.
     */
    public void register() {
        if (this.registered) return;
        this.registered = true;
        Registry<T> target = this.getRegistry();
        for (DeferredHolder<T, ? extends T> entry : this.entries)
            entry.registerInto(target);
    }

    public static class Items extends DeferredRegister<Item> {
        protected Items(String namespace) {
            super(Registries.ITEM, BuiltInRegistries.ITEM, namespace);
        }

        @Override
        public <I extends Item> DeferredItem<I> register(String name, Supplier<? extends I> supplier) {
            return this.register(name, id -> supplier.get());
        }

        @Override
        public <I extends Item> DeferredItem<I> register(String name, Function<Identifier, ? extends I> factory) {
            return this.add(DeferredItem.createItem(Identifier.fromNamespaceAndPath(this.getNamespace(), name), factory));
        }
    }

    public static class Blocks extends DeferredRegister<Block> {
        protected Blocks(String namespace) {
            super(Registries.BLOCK, BuiltInRegistries.BLOCK, namespace);
        }

        @Override
        public <I extends Block> DeferredBlock<I> register(String name, Supplier<? extends I> supplier) {
            return this.register(name, id -> supplier.get());
        }

        @Override
        public <I extends Block> DeferredBlock<I> register(String name, Function<Identifier, ? extends I> factory) {
            return this.add(DeferredBlock.createBlock(Identifier.fromNamespaceAndPath(this.getNamespace(), name), factory));
        }
    }
}
