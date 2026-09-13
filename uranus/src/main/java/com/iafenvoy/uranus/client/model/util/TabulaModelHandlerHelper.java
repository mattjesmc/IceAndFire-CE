package com.iafenvoy.uranus.client.model.util;

import com.iafenvoy.uranus.Uranus;
import com.iafenvoy.uranus.client.model.ITabulaModelAnimator;
import com.iafenvoy.uranus.client.model.TabulaModel;
import com.iafenvoy.uranus.client.model.TabulaModelHandler;
import com.iafenvoy.uranus.client.model.tabula.TabulaModelContainer;
import com.iafenvoy.uranus.util.function.MemorizeSupplier;
import net.fabricmc.api.EnvType;
import net.fabricmc.api.Environment;
import net.fabricmc.fabric.api.resource.v1.ResourceLoader;
import net.minecraft.client.Minecraft;
import net.minecraft.resources.Identifier;
import net.minecraft.server.packs.PackType;
import net.minecraft.server.packs.resources.Resource;
import net.minecraft.server.packs.resources.ResourceManager;
import net.minecraft.server.packs.resources.ResourceManagerReloadListener;
import net.minecraft.world.entity.Entity;
import org.jetbrains.annotations.Nullable;
import org.jspecify.annotations.NonNull;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Supplier;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Environment(EnvType.CLIENT)
public enum TabulaModelHandlerHelper implements ResourceManagerReloadListener {
    INSTANCE;
    private static final Map<Identifier, TabulaModelContainer> MODELS = new HashMap<>();

    @Override
    public void onResourceManagerReload(@NonNull ResourceManager manager) {
        MODELS.clear();
        for (Map.Entry<Identifier, Resource> entry : manager.listResources("models/tabula", id -> id.getPath().endsWith(".tbl")).entrySet()) {
            Identifier id = entry.getKey();
            try {
                MODELS.put(id, TabulaModelHandler.INSTANCE.loadTabulaModel(getModelJsonStream(id.toString(), entry.getValue().open())));
            } catch (Exception e) {
                Uranus.LOGGER.error("Failed to load tabula {}", id.toString(), e);
            }
        }
        Uranus.LOGGER.info("Successfully load {} tabula models", MODELS.size());
    }

    /**
     * Registers the tabula model reload listener. Called from the client entrypoint.
     */
    public static void registerReloadListener() {
        ResourceLoader.get(PackType.CLIENT_RESOURCES).registerReloadListener(Identifier.fromNamespaceAndPath(Uranus.MOD_ID, "tabula_models"), INSTANCE);
    }

    @Nullable
    public static TabulaModelContainer getContainer(Identifier id) {
        return MODELS.get(id);
    }

    @Nullable
    public static <T extends Entity> TabulaModel<T> getModel(Identifier id) {
        return getModel(id, null);
    }

    @Nullable
    public static <T extends Entity> TabulaModel<T> getModel(Identifier id, Supplier<ITabulaModelAnimator<T>> tabulaAnimator) {
        return getModel(id, new MemorizeSupplier<>(tabulaAnimator));
    }

    @Nullable
    public static <T extends Entity> TabulaModel<T> getModel(Identifier id, MemorizeSupplier<ITabulaModelAnimator<T>> tabulaAnimator) {
        try {
            String path = "models/tabula/" + id.getPath();
            if (!path.endsWith(".tbl")) path += ".tbl";
            id = id.withPath(path);
            if (MODELS.containsKey(id)) return new TabulaModel<>(MODELS.get(id), tabulaAnimator);
        } catch (Exception e) {
            Uranus.LOGGER.error("Failed to load model {}", id, e);
        }
        return null;
    }

    @Deprecated(forRemoval = true)
    public static TabulaModelContainer loadTabulaModel(String path) throws IOException {
        if (!path.startsWith("/")) path = "/" + path;
        if (!path.endsWith(".tbl")) path = path + ".tbl";
        InputStream stream = Minecraft.getInstance().getResourceManager().open(Identifier.parse(path));
        return TabulaModelHandler.INSTANCE.loadTabulaModel(getModelJsonStream(path, stream));
    }

    private static InputStream getModelJsonStream(String name, InputStream file) throws IOException {
        ZipInputStream zip = new ZipInputStream(file);
        ZipEntry entry;
        do {
            if ((entry = zip.getNextEntry()) == null)
                throw new RuntimeException("No model.json present in " + name);
        } while (!entry.getName().equals("model.json"));
        return zip;
    }
}
