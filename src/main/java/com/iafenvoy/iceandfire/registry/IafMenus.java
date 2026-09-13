package com.iafenvoy.iceandfire.registry;

import com.iafenvoy.iceandfire.IceAndFire;
import com.iafenvoy.iceandfire.fabric.menu.IMenuTypeExtension;
import com.iafenvoy.iceandfire.fabric.registry.DeferredHolder;
import com.iafenvoy.iceandfire.fabric.registry.DeferredRegister;
import com.iafenvoy.iceandfire.screen.menu.*;
import net.minecraft.core.registries.Registries;
import net.minecraft.world.flag.FeatureFlags;
import net.minecraft.world.inventory.AbstractContainerMenu;
import net.minecraft.world.inventory.MenuType;

import java.util.function.Supplier;

/**
 * Menu types. Screens are bound client-side in {@link com.iafenvoy.iceandfire.IceAndFireClient}.
 */
public final class IafMenus {
    public static final DeferredRegister<MenuType<?>> REGISTRY = DeferredRegister.create(Registries.MENU, IceAndFire.MOD_ID);

    public static final DeferredHolder<MenuType<?>, MenuType<DragonMenu>> DRAGON_SCREEN = register("dragon", () -> IMenuTypeExtension.create(DragonMenu::new));
    public static final DeferredHolder<MenuType<?>, MenuType<HippogryphMenu>> HIPPOGRYPH_SCREEN = register("hippogryph", () -> IMenuTypeExtension.create(HippogryphMenu::new));
    public static final DeferredHolder<MenuType<?>, MenuType<HippocampusMenu>> HIPPOCAMPUS_SCREEN = register("hippocampus", () -> IMenuTypeExtension.create(HippocampusMenu::new));
    public static final DeferredHolder<MenuType<?>, MenuType<DragonForgeMenu>> DRAGON_FORGE_SCREEN = register("dragon_forge", () -> IMenuTypeExtension.create(DragonForgeMenu::new));
    public static final DeferredHolder<MenuType<?>, MenuType<PodiumMenu>> PODIUM_SCREEN = register("podium", () -> new MenuType<>(PodiumMenu::new, FeatureFlags.VANILLA_SET));
    public static final DeferredHolder<MenuType<?>, MenuType<LecternMenu>> IAF_LECTERN_SCREEN = register("iaf_lectern", () -> new MenuType<>(LecternMenu::new, FeatureFlags.VANILLA_SET));
    public static final DeferredHolder<MenuType<?>, MenuType<BestiaryMenu>> BESTIARY_SCREEN = register("bestiary", () -> IMenuTypeExtension.create(BestiaryMenu::new));

    private static <C extends AbstractContainerMenu> DeferredHolder<MenuType<?>, MenuType<C>> register(String name, Supplier<MenuType<C>> type) {
        return REGISTRY.register(name, type);
    }
}
