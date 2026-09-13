package com.iafenvoy.uranus.animation;

import net.fabricmc.fabric.api.event.Event;
import net.fabricmc.fabric.api.event.EventFactory;

/**
 * Events emitted while an animated entity's animation is updated.
 */
public final class AnimationEvent {
    /**
     * Fired before an animation is synchronized to clients. Return {@code false} to cancel the sync.
     */
    public static final Event<Start> START = EventFactory.createArrayBacked(Start.class, listeners -> (entity, animation) -> {
        for (Start listener : listeners)
            if (!listener.onAnimationStart(entity, animation)) return false;
        return true;
    });
    /**
     * Fired after an animation advances by one tick.
     */
    public static final Event<Tick> TICK = EventFactory.createArrayBacked(Tick.class, listeners -> (entity, animation, tick) -> {
        for (Tick listener : listeners) listener.onAnimationTick(entity, animation, tick);
    });

    private AnimationEvent() {
    }

    @FunctionalInterface
    public interface Start {
        boolean onAnimationStart(IAnimatedEntity entity, Animation animation);
    }

    @FunctionalInterface
    public interface Tick {
        void onAnimationTick(IAnimatedEntity entity, Animation animation, int tick);
    }
}
