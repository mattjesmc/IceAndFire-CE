package com.iafenvoy.iceandfire.fabric.registry;

import net.minecraft.core.Holder;
import net.minecraft.core.Registry;
import net.minecraft.resources.Identifier;
import net.minecraft.resources.ResourceKey;
import net.minecraft.tags.TagKey;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.Optional;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * Lazily-registered registry entry (NeoForge's DeferredHolder). Vanilla's {@link Holder} is sealed in 26.2, so this
 * cannot be a holder itself; use {@link #holder()} where a {@code Holder<R>} is required.
 * The value becomes available once the owning {@link DeferredRegister#register()} has run.
 */
public class DeferredHolder<R, T extends R> implements Supplier<T> {
    protected final ResourceKey<R> key;
    private final Function<Identifier, ? extends T> factory;
    @Nullable
    private T value;
    @Nullable
    private Holder<R> holder;

    protected DeferredHolder(ResourceKey<? extends Registry<R>> registryKey, Identifier id, Function<Identifier, ? extends T> factory) {
        this.key = ResourceKey.create(registryKey, id);
        this.factory = factory;
    }

    public static <R, T extends R> DeferredHolder<R, T> create(ResourceKey<? extends Registry<R>> registryKey, Identifier id, Function<Identifier, ? extends T> factory) {
        return new DeferredHolder<>(registryKey, id, factory);
    }

    void registerInto(Registry<R> registry) {
        if (this.value != null) throw new IllegalStateException("Entry " + this.key + " was already registered");
        T created = this.factory.apply(this.key.identifier());
        Registry.register(registry, this.key, created);
        this.value = created;
        this.holder = registry.get(this.key.identifier()).<Holder<R>>map(reference -> reference).orElseGet(() -> registry.wrapAsHolder(created));
    }

    /**
     * @return the registered value
     * @throws IllegalStateException if the owning register has not run yet
     */
    @Override
    public @NotNull T get() {
        T v = this.value;
        if (v == null) throw new IllegalStateException("Registry entry " + this.key + " has not been registered yet");
        return v;
    }

    /**
     * Alias of {@link #get()} mirroring {@code Holder#value()}.
     */
    public @NotNull T value() {
        return this.get();
    }

    /**
     * The registry holder for this entry, for APIs that take a {@code Holder<R>} (effects, attributes, ...).
     */
    public @NotNull Holder<R> holder() {
        Holder<R> h = this.holder;
        if (h == null) throw new IllegalStateException("Registry entry " + this.key + " has not been registered yet");
        return h;
    }

    public ResourceKey<R> getKey() {
        return this.key;
    }

    public Identifier getId() {
        return this.key.identifier();
    }

    public Optional<T> asOptional() {
        return Optional.ofNullable(this.value);
    }

    public boolean isBound() {
        return this.value != null;
    }

    public boolean is(Identifier id) {
        return this.key.identifier().equals(id);
    }

    public boolean is(ResourceKey<R> key) {
        return this.key == key || this.key.equals(key);
    }

    public boolean is(TagKey<R> tag) {
        return this.holder != null && this.holder.is(tag);
    }

    public boolean is(Holder<R> other) {
        return other.unwrapKey().map(this::is).orElse(false);
    }

    public String getRegisteredName() {
        return this.key.identifier().toString();
    }

    @Override
    public boolean equals(Object obj) {
        return obj == this || obj instanceof DeferredHolder<?, ?> other && other.key.equals(this.key);
    }

    @Override
    public int hashCode() {
        return this.key.hashCode();
    }

    @Override
    public String toString() {
        return "DeferredHolder{" + this.key + "}";
    }
}
