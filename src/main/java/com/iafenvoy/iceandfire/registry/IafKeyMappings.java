package com.iafenvoy.iceandfire.registry;

import com.iafenvoy.iceandfire.event.handler.ClientEvents;
import net.fabricmc.api.EnvType;
import net.fabricmc.api.Environment;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keymapping.v1.KeyMappingHelper;
import net.minecraft.client.KeyMapping;
import org.lwjgl.glfw.GLFW;

@Environment(EnvType.CLIENT)
public final class IafKeyMappings {
    public static final KeyMapping DRAGON_BREATH = new KeyMapping("key.dragon_fireAttack", GLFW.GLFW_KEY_R, KeyMapping.Category.GAMEPLAY);
    public static final KeyMapping DRAGON_STRIKE = new KeyMapping("key.dragon_strike", GLFW.GLFW_KEY_G, KeyMapping.Category.GAMEPLAY);
    public static final KeyMapping DRAGON_DOWN = new KeyMapping("key.dragon_down", GLFW.GLFW_KEY_X, KeyMapping.Category.GAMEPLAY);
    public static final KeyMapping DRAGON_CHANGE_VIEW = new KeyMapping("key.dragon_change_view", GLFW.GLFW_KEY_F7, KeyMapping.Category.GAMEPLAY);

    private IafKeyMappings() {
    }

    public static void init() {
        KeyMappingHelper.registerKeyMapping(DRAGON_BREATH);
        KeyMappingHelper.registerKeyMapping(DRAGON_STRIKE);
        KeyMappingHelper.registerKeyMapping(DRAGON_DOWN);
        KeyMappingHelper.registerKeyMapping(DRAGON_CHANGE_VIEW);
        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            if (DRAGON_CHANGE_VIEW.consumeClick()) {
                if (ClientEvents.currentView + 1 > 3) ClientEvents.currentView = 0;
                else ClientEvents.currentView++;
            }
        });
    }
}
