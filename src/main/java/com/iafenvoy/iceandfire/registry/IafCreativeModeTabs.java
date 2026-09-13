package com.iafenvoy.iceandfire.registry;

import com.iafenvoy.iceandfire.IceAndFire;
import com.iafenvoy.iceandfire.fabric.registry.DeferredHolder;
import com.iafenvoy.iceandfire.fabric.registry.DeferredRegister;
import net.fabricmc.fabric.api.creativetab.v1.FabricCreativeModeTab;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;

import java.util.LinkedList;
import java.util.List;
import java.util.function.Supplier;

@SuppressWarnings("unused")
public final class IafCreativeModeTabs {
    public static final DeferredRegister<CreativeModeTab> REGISTRY = DeferredRegister.create(Registries.CREATIVE_MODE_TAB, IceAndFire.MOD_ID);

    public static final List<Supplier<? extends Item>> BLOCKS_LIST = new LinkedList<>(), ITEMS_LIST = new LinkedList<>(), TOOLS_WEAPONS_LIST = new LinkedList<>(), ARMORS_LIST = new LinkedList<>();

    public static final DeferredHolder<CreativeModeTab, CreativeModeTab> BLOCKS = register("blocks", () -> FabricCreativeModeTab.builder().title(Component.translatable("itemGroup." + IceAndFire.MOD_ID + ".blocks")).icon(() -> new ItemStack(IafBlocks.DRAGON_SCALE_RED.get())).displayItems(display(BLOCKS_LIST)).build());
    public static final DeferredHolder<CreativeModeTab, CreativeModeTab> ITEMS = register("items", () -> FabricCreativeModeTab.builder().title(Component.translatable("itemGroup." + IceAndFire.MOD_ID + ".items")).icon(() -> new ItemStack(IafItems.DRAGON_SKULL_FIRE.get())).displayItems(display(ITEMS_LIST)).build());
    public static final DeferredHolder<CreativeModeTab, CreativeModeTab> TOOLS_WEAPONS = register("tools_weapons", () -> FabricCreativeModeTab.builder().title(Component.translatable("itemGroup." + IceAndFire.MOD_ID + ".tools_weapons")).icon(() -> new ItemStack(IafItems.DRAGONSTEEL_LIGHTNING_SWORD.get())).displayItems(display(TOOLS_WEAPONS_LIST)).build());
    public static final DeferredHolder<CreativeModeTab, CreativeModeTab> ARMORS = register("armors", () -> FabricCreativeModeTab.builder().title(Component.translatable("itemGroup." + IceAndFire.MOD_ID + ".armors")).icon(() -> new ItemStack(IafItems.DRAGONSTEEL_FIRE_HELMET.get())).displayItems(display(ARMORS_LIST)).build());

    private IafCreativeModeTabs() {
    }

    private static CreativeModeTab.DisplayItemsGenerator display(List<Supplier<? extends Item>> items) {
        return (parameters, output) -> items.forEach(item -> output.accept(item.get()));
    }

    private static DeferredHolder<CreativeModeTab, CreativeModeTab> register(String name, Supplier<CreativeModeTab> group) {
        return REGISTRY.register(name, group);
    }
}
