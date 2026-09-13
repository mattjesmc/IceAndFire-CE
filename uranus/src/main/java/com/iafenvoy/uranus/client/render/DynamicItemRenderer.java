package com.iafenvoy.uranus.client.render;

import com.iafenvoy.uranus.Uranus;
import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.serialization.MapCodec;
import net.fabricmc.api.EnvType;
import net.fabricmc.api.Environment;
import net.minecraft.client.renderer.SubmitNodeCollector;
import net.minecraft.client.renderer.special.SpecialModelRenderer;
import net.minecraft.client.renderer.special.SpecialModelRenderers;
import net.minecraft.resources.Identifier;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import org.joml.Vector3fc;
import org.jspecify.annotations.NonNull;

import java.util.IdentityHashMap;
import java.util.Map;
import java.util.function.Consumer;

/**
 * Dynamic item renderer registry for item models with type {@code uranus:dynamic}.
 * Item display context is now resolved by the item-model pipeline before submission.
 */
@Environment(EnvType.CLIENT)
@FunctionalInterface
public interface DynamicItemRenderer {
    Identifier TYPE = Identifier.fromNamespaceAndPath(Uranus.MOD_ID, "dynamic");
    Map<Item, DynamicItemRenderer> RENDERERS = new IdentityHashMap<>();

    void submit(ItemStack stack, PoseStack poseStack, SubmitNodeCollector collector, int light, int overlay, boolean foil, int color);

    /**
     * Registers the {@code uranus:dynamic} special model renderer type. Called from the client entrypoint.
     * {@link SpecialModelRenderers#ID_MAPPER} is made accessible by Fabric API's transitive access wideners.
     */
    static void registerRenderer() {
        SpecialModelRenderers.ID_MAPPER.put(TYPE, Unbaked.MAP_CODEC);
    }

    final class Renderer implements SpecialModelRenderer<ItemStack> {
        @Override
        public void submit(ItemStack stack, @NonNull PoseStack poseStack, @NonNull SubmitNodeCollector collector, int light, int overlay, boolean foil, int color) {
            DynamicItemRenderer renderer = RENDERERS.get(stack.getItem());
            if (renderer != null) renderer.submit(stack, poseStack, collector, light, overlay, foil, color);
        }

        @Override
        public void getExtents(@NonNull Consumer<Vector3fc> output) {
        }

        @Override
        public ItemStack extractArgument(@NonNull ItemStack stack) {
            return stack;
        }
    }

    record Unbaked() implements SpecialModelRenderer.Unbaked<ItemStack> {
        public static final MapCodec<Unbaked> MAP_CODEC = MapCodec.unit(Unbaked::new);

        @Override
        public SpecialModelRenderer<ItemStack> bake(SpecialModelRenderer.@NonNull BakingContext context) {
            return new Renderer();
        }

        @Override
        public @NonNull MapCodec<Unbaked> type() {
            return MAP_CODEC;
        }
    }
}
