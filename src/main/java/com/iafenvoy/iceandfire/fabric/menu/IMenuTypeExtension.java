package com.iafenvoy.iceandfire.fabric.menu;

import net.fabricmc.fabric.api.menu.v1.ExtendedMenuType;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.inventory.AbstractContainerMenu;
import net.minecraft.world.inventory.MenuType;

/**
 * Creates menu types whose client-side constructor receives a {@link RegistryFriendlyByteBuf} of extra data
 * (NeoForge's {@code IMenuTypeExtension.create}) on top of Fabric's {@link ExtendedMenuType}.
 * The data is produced by an {@link ExtendedBufMenuProvider} when the menu is opened.
 */
public final class IMenuTypeExtension {
    /**
     * Ships the raw remaining bytes of the buffer and hands the client a fresh buffer over them.
     */
    public static final StreamCodec<RegistryFriendlyByteBuf, RegistryFriendlyByteBuf> BUF_CODEC = StreamCodec.of(
            (target, data) -> target.writeBytes(data, data.readerIndex(), data.readableBytes()),
            source -> new RegistryFriendlyByteBuf(source.readBytes(source.readableBytes()), source.registryAccess())
    );

    private IMenuTypeExtension() {
    }

    public static <T extends AbstractContainerMenu> MenuType<T> create(IContainerFactory<T> factory) {
        return new ExtendedMenuType<>(factory::create, BUF_CODEC);
    }

    @FunctionalInterface
    public interface IContainerFactory<T extends AbstractContainerMenu> {
        T create(int id, Inventory inventory, RegistryFriendlyByteBuf data);
    }
}
