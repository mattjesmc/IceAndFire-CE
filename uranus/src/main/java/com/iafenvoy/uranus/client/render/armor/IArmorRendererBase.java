package com.iafenvoy.uranus.client.render.armor;

import net.fabricmc.api.EnvType;
import net.fabricmc.api.Environment;
import net.fabricmc.fabric.api.client.rendering.v1.ArmorRenderer;
import net.minecraft.client.model.Model;
import net.minecraft.client.resources.model.EquipmentClientInfo;
import net.minecraft.resources.Identifier;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.ItemLike;

import java.util.Arrays;
import java.util.IdentityHashMap;
import java.util.Map;

/**
 * Client armor-model hook. On Fabric each registered item is bound to an {@link ArmorRenderer} bridge that renders
 * the custom model through the vanilla equipment layer pipeline (see {@link FabricArmorRendererBridge}).
 *
 * <p>The old entity argument is intentionally absent: the render-state pipeline extracts an immutable
 * render state before layer submission. Per-entity animation belongs in the model's
 * {@link Model#setupAnim(Object)} implementation.</p>
 */
@Environment(EnvType.CLIENT)
public interface IArmorRendererBase {
    Map<Item, IArmorRendererBase> RENDERERS = new IdentityHashMap<>();

    Model getHumanoidArmorModel(ItemStack stack, EquipmentClientInfo.LayerType layerType, Model defaultModel);

    default Identifier getArmorTexture(ItemStack stack, EquipmentClientInfo.LayerType layerType, EquipmentClientInfo.Layer layer, Identifier defaultTexture) {
        return defaultTexture;
    }

    static void register(IArmorRendererBase renderer, ItemLike... items) {
        Arrays.stream(items).map(ItemLike::asItem).forEach(item -> RENDERERS.put(item, renderer));
        ArmorRenderer.register((ArmorRenderer.Factory) context -> new FabricArmorRendererBridge(renderer, context.getEquipmentAssets(), context.getEquipmentRenderer()), items);
    }
}
