package com.iafenvoy.uranus.client.render.armor;

import com.mojang.blaze3d.vertex.PoseStack;
import net.fabricmc.api.EnvType;
import net.fabricmc.api.Environment;
import net.fabricmc.fabric.api.client.rendering.v1.ArmorRenderer;
import net.minecraft.client.model.HumanoidModel;
import net.minecraft.client.model.Model;
import net.minecraft.client.renderer.SubmitNodeCollector;
import net.minecraft.client.renderer.entity.layers.EquipmentLayerRenderer;
import net.minecraft.client.renderer.entity.state.HumanoidRenderState;
import net.minecraft.client.renderer.rendertype.RenderTypes;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.client.resources.model.EquipmentAssetManager;
import net.minecraft.client.resources.model.EquipmentClientInfo;
import net.minecraft.core.component.DataComponents;
import net.minecraft.resources.Identifier;
import net.minecraft.resources.ResourceKey;
import net.minecraft.util.ARGB;
import net.minecraft.world.entity.EntityTypes;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.component.DyedItemColor;
import net.minecraft.world.item.equipment.EquipmentAsset;
import net.minecraft.world.item.equipment.Equippable;

import java.util.List;
import java.util.Optional;

/**
 * Renders an {@link IArmorRendererBase} through Fabric's {@link ArmorRenderer} hook. When the renderer does not
 * override any layer texture the vanilla {@link EquipmentLayerRenderer} draws the custom model (keeping dye, foil and
 * trims identical to vanilla); otherwise the layers are submitted here with the overridden textures.
 */
@Environment(EnvType.CLIENT)
final class FabricArmorRendererBridge implements ArmorRenderer {
    private final IArmorRendererBase renderer;
    private final EquipmentAssetManager equipmentAssets;
    private final EquipmentLayerRenderer equipmentRenderer;

    FabricArmorRendererBridge(IArmorRendererBase renderer, EquipmentAssetManager equipmentAssets, EquipmentLayerRenderer equipmentRenderer) {
        this.renderer = renderer;
        this.equipmentAssets = equipmentAssets;
        this.equipmentRenderer = equipmentRenderer;
    }

    @Override
    @SuppressWarnings("unchecked")
    public void render(PoseStack poseStack, SubmitNodeCollector collector, ItemStack stack, HumanoidRenderState state, EquipmentSlot slot, int light, HumanoidModel<HumanoidRenderState> contextModel) {
        Equippable equippable = stack.get(DataComponents.EQUIPPABLE);
        if (equippable == null || equippable.assetId().isEmpty() || equippable.slot() != slot) return;
        EquipmentClientInfo.LayerType layerType = state.isBaby && state.entityType != EntityTypes.ARMOR_STAND
                ? EquipmentClientInfo.LayerType.HUMANOID_BABY
                : (slot == EquipmentSlot.LEGS ? EquipmentClientInfo.LayerType.HUMANOID_LEGGINGS : EquipmentClientInfo.LayerType.HUMANOID);
        Model<? super HumanoidRenderState> model = (Model<? super HumanoidRenderState>) this.renderer.getHumanoidArmorModel(stack, layerType, contextModel);
        ResourceKey<EquipmentAsset> assetId = equippable.assetId().get();
        List<EquipmentClientInfo.Layer> layers = this.equipmentAssets.get(assetId).getLayers(layerType);

        Identifier[] textures = new Identifier[layers.size()];
        boolean overridden = false;
        for (int i = 0; i < layers.size(); i++) {
            EquipmentClientInfo.Layer layer = layers.get(i);
            Identifier defaultTexture = layer.getTextureLocation(layerType);
            textures[i] = this.renderer.getArmorTexture(stack, layerType, layer, defaultTexture);
            if (!defaultTexture.equals(textures[i])) overridden = true;
        }
        if (!overridden) {
            this.equipmentRenderer.renderLayers(layerType, assetId, model, state, stack, poseStack, collector, light, state.outlineColor);
            return;
        }

        int dyeColor = DyedItemColor.getOrDefault(stack, 0);
        boolean renderFoil = stack.hasFoil();
        int order = 1;
        for (int i = 0; i < layers.size(); i++) {
            int color = colorForLayer(layers.get(i), dyeColor);
            if (color == 0) continue;
            collector.order(order++).submitModel(model, state, poseStack, RenderTypes.armorCutoutNoCull(textures[i]), light, OverlayTexture.NO_OVERLAY, color, null, state.outlineColor, null);
            if (renderFoil) {
                collector.order(order++).submitModel(model, state, poseStack, RenderTypes.armorEntityGlint(), light, OverlayTexture.NO_OVERLAY, color, null, state.outlineColor, null);
                renderFoil = false;
            }
        }
    }

    private static int colorForLayer(EquipmentClientInfo.Layer layer, int dyeColor) {
        Optional<EquipmentClientInfo.Dyeable> dyeable = layer.dyeable();
        if (dyeable.isPresent()) {
            int colorWhenUndyed = dyeable.get().colorWhenUndyed().map(ARGB::opaque).orElse(0);
            return dyeColor != 0 ? dyeColor : colorWhenUndyed;
        }
        return -1;
    }
}
