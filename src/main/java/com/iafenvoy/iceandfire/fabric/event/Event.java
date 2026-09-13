package com.iafenvoy.iceandfire.fabric.event;

/**
 * Base class for the mod's own events, posted through {@link IafEventBus}. Mirrors the subset of NeoForge's
 * event API that the code base uses so call sites only change their imports.
 */
public abstract class Event {
    private boolean canceled;

    public boolean isCanceled() {
        return this.canceled;
    }

    public void setCanceled(boolean canceled) {
        if (!(this instanceof ICancellableEvent))
            throw new UnsupportedOperationException(this.getClass().getName() + " is not cancellable");
        this.canceled = canceled;
    }
}
