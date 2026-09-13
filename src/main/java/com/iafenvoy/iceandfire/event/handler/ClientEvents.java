package com.iafenvoy.iceandfire.event.handler;

import com.mojang.datafixers.util.Pair;
import com.iafenvoy.iceandfire.compat.IafClientCompat;
import com.iafenvoy.iceandfire.entity.DragonBaseEntity;
import com.iafenvoy.iceandfire.entity.util.ICustomMoveController;
import com.iafenvoy.iceandfire.fabric.network.ClientPacketDistributor;
import com.iafenvoy.iceandfire.network.payload.DragonControlC2SPayload;
import com.iafenvoy.iceandfire.registry.IafKeyMappings;
import com.iafenvoy.iceandfire.render.entity.feature.DragonRiderFeatureRenderer;
import com.iafenvoy.iceandfire.render.misc.LightningBoltData;
import com.iafenvoy.iceandfire.render.misc.LightningRenderer;
import com.mojang.blaze3d.vertex.PoseStack;
import net.fabricmc.api.EnvType;
import net.fabricmc.api.Environment;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.rendering.v1.level.LevelRenderContext;
import net.fabricmc.fabric.api.client.rendering.v1.level.LevelRenderEvents;
import net.minecraft.client.CameraType;
import net.minecraft.client.Minecraft;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.client.player.RemotePlayer;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.phys.Vec3;

import java.util.concurrent.CopyOnWriteArrayList;

@Environment(EnvType.CLIENT)
public final class ClientEvents {
    public static int currentView = 0;
    public static final CopyOnWriteArrayList<Pair<Vec3, Vec3>> LIGHTNINGS = new CopyOnWriteArrayList<>();
    private static final LightningRenderer LIGHTNING_RENDERER = new LightningRenderer();

    private ClientEvents() {
    }

    public static void init() {
        ClientTickEvents.END_CLIENT_TICK.register(ClientEvents::onClientTick);
        LevelRenderEvents.COLLECT_SUBMITS.register(ClientEvents::submitLightningBolts);
    }

    /**
     * Formerly {@code CalculateDetachedCameraDistanceEvent}; invoked from {@code CameraMixin} with the requested
     * third-person distance and returns the distance to use.
     */
    public static float modifyCameraDistance(float distance) {
        Player player = Minecraft.getInstance().player;
        if (player != null && player.getVehicle() instanceof DragonBaseEntity dragon) {
            float scale = dragon.getRenderSize() / 3;
            if (Minecraft.getInstance().options.getCameraType() == CameraType.THIRD_PERSON_BACK ||
                    Minecraft.getInstance().options.getCameraType() == CameraType.THIRD_PERSON_FRONT) {
                if (currentView == 1) return scale * 1.2F;
                else if (currentView == 2) return scale * 3;
                else if (currentView == 3) return scale * 5;
            }
        }
        return distance;
    }

    /**
     * Formerly {@code EntityTickEvent.Post} filtered to the local player and the entities riding it.
     */
    private static void onClientTick(Minecraft mc) {
        LocalPlayer player = mc.player;
        if (player == null) return;
        for (Entity entity : player.getPassengers()) {
            if (entity instanceof ICustomMoveController moveController) {
                byte previousState = moveController.getControlState();
                moveController.dismount(mc.options.keyShift.isDown());
                byte controlState = moveController.getControlState();
                if (controlState != previousState)
                    ClientPacketDistributor.sendToServer(new DragonControlC2SPayload(entity.getId(), controlState, entity.blockPosition()));
            }
        }
        if (player.getVehicle() instanceof ICustomMoveController controller) {
            Entity vehicle = player.getVehicle();
            byte previousState = controller.getControlState();
            controller.up(mc.options.keyJump.isDown());
            controller.down(IafKeyMappings.DRAGON_DOWN.isDown());
            controller.attack(IafKeyMappings.DRAGON_STRIKE.isDown());
            controller.dismount(mc.options.keyShift.isDown());
            controller.strike(IafKeyMappings.DRAGON_BREATH.isDown());
            byte controlState = controller.getControlState();
            if (controlState != previousState)
                ClientPacketDistributor.sendToServer(new DragonControlC2SPayload(vehicle.getId(), controlState, vehicle.blockPosition()));
        }
    }

    /**
     * Formerly {@code RenderPlayerEvent.Pre}; invoked from {@code LivingEntityRendererMixin} for avatar render states.
     *
     * @return true when the player should not be rendered by the vanilla pass
     */
    public static boolean shouldSkipPlayerRender(int entityId) {
        if (Minecraft.getInstance().level == null) return false;
        Entity entity = Minecraft.getInstance().level.getEntity(entityId);
        if (!(entity instanceof Player player) || !(player.getVehicle() instanceof DragonBaseEntity)) return false;
        if (player instanceof LocalPlayer && Minecraft.getInstance().options.getCameraType().isFirstPerson())
            return true;
        // Sodium skips the nested extract/submit used by DragonRiderFeatureRenderer, so
        // cancelling here would make the rider vanish. Leave vanilla/Sodium passenger rendering.
        if (IafClientCompat.isSodiumLoaded()) return false;
        if (player instanceof LocalPlayer && !DragonRiderFeatureRenderer.RENDERING_RIDERS.contains(player))
            return true;
        return player instanceof RemotePlayer && !DragonRiderFeatureRenderer.RENDERING_RIDERS.contains(player);
    }

    /**
     * Formerly {@code SubmitCustomGeometryEvent}.
     */
    private static void submitLightningBolts(LevelRenderContext context) {
        if (LIGHTNINGS.isEmpty() && !LIGHTNING_RENDERER.hasBolts()) return;
        Minecraft minecraft = Minecraft.getInstance();
        if (minecraft.level == null) return;
        float partialTicks = minecraft.getDeltaTracker().getGameTimeDeltaPartialTick(false);
        PoseStack poseStack = context.poseStack();
        Vec3 cameraPos = context.levelState().cameraRenderState.pos;
        poseStack.pushPose();
        poseStack.translate(-cameraPos.x, -cameraPos.y, -cameraPos.z);
        for (Pair<Vec3, Vec3> pair : LIGHTNINGS) {
            LightningBoltData bolt = new LightningBoltData(LightningBoltData.BoltRenderInfo.ELECTRICITY, pair.getFirst(), pair.getSecond(), 4)
                    .size(0.05F)
                    .lifespan(10)
                    .fade(LightningBoltData.FadeFunction.fade(0.1F))
                    .spawn(LightningBoltData.SpawnFunction.NO_DELAY);
            LIGHTNING_RENDERER.update(null, bolt, partialTicks);
        }
        LIGHTNINGS.clear();
        LIGHTNING_RENDERER.submit(partialTicks, poseStack, context.submitNodeCollector(), 0xF000F0);
        poseStack.popPose();
    }
}
