package com.iafenvoy.iceandfire.render;

import com.iafenvoy.iceandfire.IceAndFire;
import com.iafenvoy.iceandfire.config.IafClientConfig;
import com.iafenvoy.iceandfire.registry.IafMobEffects;
import net.fabricmc.api.EnvType;
import net.fabricmc.api.Environment;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.minecraft.client.Minecraft;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.client.renderer.GameRenderer;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.Identifier;

@Environment(EnvType.CLIENT)
public class SirenShaderRenderHelper {
    private static final Identifier SIREN_SHADER = Identifier.fromNamespaceAndPath(IceAndFire.MOD_ID, "shaders/post/siren.json");

    public static void init() {
        ClientTickEvents.END_CLIENT_TICK.register(SirenShaderRenderHelper::tick);
    }

    private static void tick(Minecraft minecraft) {
        LocalPlayer player = minecraft.player;
        if (player == null) return;
        GameRenderer renderer = minecraft.gameRenderer;
        if (IafClientConfig.INSTANCE.sirenShader.getValue() && player.hasEffect(BuiltInRegistries.MOB_EFFECT.wrapAsHolder(IafMobEffects.SIREN_CHARM.get())))
            enableShader(renderer);
        else disableShader(renderer);
    }

    private static boolean enabled(GameRenderer renderer) {
        return SIREN_SHADER.equals(renderer.currentPostEffect());
    }

    private static void enableShader(GameRenderer renderer) {
        if (enabled(renderer)) return;
        // GameRenderer#setPostEffect is private in vanilla; opened by iceandfire.accesswidener
        renderer.setPostEffect(SIREN_SHADER);
    }

    private static void disableShader(GameRenderer renderer) {
        if (!enabled(renderer)) return;
        renderer.clearPostEffect();
    }
}
