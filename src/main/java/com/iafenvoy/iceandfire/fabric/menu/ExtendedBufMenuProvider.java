package com.iafenvoy.iceandfire.fabric.menu;

import io.netty.buffer.Unpooled;
import net.fabricmc.fabric.api.menu.v1.ExtendedMenuProvider;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.MenuProvider;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.inventory.AbstractContainerMenu;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.function.Consumer;

/**
 * A {@link MenuProvider} that writes extra opening data for menus created through
 * {@link IMenuTypeExtension#create} (NeoForge's {@code IMenuProviderExtension#writeClientSideData}).
 */
public interface ExtendedBufMenuProvider extends ExtendedMenuProvider<RegistryFriendlyByteBuf> {
    /**
     * Writes the data the client-side menu constructor reads. {@code menu} is not available on Fabric and is always
     * {@code null}; it is kept so upstream overrides compile unchanged.
     */
    void writeClientSideData(@Nullable AbstractContainerMenu menu, RegistryFriendlyByteBuf buffer);

    @Override
    default RegistryFriendlyByteBuf getScreenOpeningData(ServerPlayer player) {
        RegistryFriendlyByteBuf buffer = new RegistryFriendlyByteBuf(Unpooled.buffer(), player.registryAccess());
        this.writeClientSideData(null, buffer);
        return buffer;
    }

    /**
     * Wraps a plain provider with an ad-hoc data writer (NeoForge's {@code openMenu(provider, writer)}).
     */
    static ExtendedMenuProvider<RegistryFriendlyByteBuf> wrap(MenuProvider provider, Consumer<RegistryFriendlyByteBuf> writer) {
        return new ExtendedMenuProvider<>() {
            @Override
            public @NotNull Component getDisplayName() {
                return provider.getDisplayName();
            }

            @Override
            public @Nullable AbstractContainerMenu createMenu(int id, @NotNull Inventory inventory, @NotNull Player player) {
                return provider.createMenu(id, inventory, player);
            }

            @Override
            public RegistryFriendlyByteBuf getScreenOpeningData(ServerPlayer player) {
                RegistryFriendlyByteBuf buffer = new RegistryFriendlyByteBuf(Unpooled.buffer(), player.registryAccess());
                writer.accept(buffer);
                return buffer;
            }
        };
    }
}
