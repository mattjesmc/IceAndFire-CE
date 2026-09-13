package com.iafenvoy.iceandfire.fabric.event;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

/**
 * Tiny class-keyed event bus replacing {@code NeoForge.EVENT_BUS} for the mod's own {@link Event}s.
 * Listeners registered for a class also receive events of its subclasses.
 */
public final class IafEventBus {
    private static final Map<Class<?>, List<Consumer<? extends Event>>> LISTENERS = new ConcurrentHashMap<>();

    private IafEventBus() {
    }

    public static <E extends Event> void addListener(Class<E> type, Consumer<E> listener) {
        LISTENERS.computeIfAbsent(type, k -> new CopyOnWriteArrayList<>()).add(listener);
    }

    /**
     * Posts the event to every listener (most specific class first) and returns it for chaining, e.g.
     * {@code IafEventBus.post(new GriefBreakBlockEvent(...)).isCanceled()}.
     */
    @SuppressWarnings("unchecked")
    public static <E extends Event> E post(E event) {
        List<Consumer<? extends Event>> targets = new ArrayList<>();
        for (Class<?> c = event.getClass(); c != null && Event.class.isAssignableFrom(c); c = c.getSuperclass()) {
            List<Consumer<? extends Event>> list = LISTENERS.get(c);
            if (list != null) targets.addAll(list);
        }
        for (Consumer<? extends Event> target : targets)
            ((Consumer<E>) target).accept(event);
        return event;
    }
}
