const EventEmitter = require('eventemitter3');

class ContextEvents {
    constructor() {
        this.events = new EventEmitter();
        this.activeListeners = handlerCounter(() => this.events.emit('end'));
    }

    emit(event, data) {
        this.events.emit(event, data);
    }

    on(event, handler) {
        this.activeListeners.increment();
        this.events.on(event, handler);
        return () => this.events.off(event, handler);
    }

    once(event, handler) {
        this.activeListeners.increment();
        this.events.once(event, async () => {
            await handler();
            this.activeListeners.decrement();
        });
        return () => this.events.off(event, handler);
    }

    off(event, handler) {
        this.events.off(event, handler);
        this.activeListeners.decrement();
    }
}

module.exports = ContextEvents;

function handlerCounter(onEmpty = () => {}) {
    let count = 0;
    let onEmptyResolvers = [];

    const callOnEmptyHandlers = () => {
        onEmpty();
        onEmptyResolvers.forEach((r) => r());
        onEmptyResolvers = [];
    };

    return {
        increment() {
            count++;
        },
        decrement() {
            count--;

            if (count === 0) {
                callOnEmptyHandlers();
            }
        },
        onEmpty(callback) {
            onEmpty = callback;
        },
        reset() {
            callOnEmptyHandlers();
            count = 0;
        },
        get onEmptyPromise() {
            return new Promise((resolve) => {
                onEmptyResolvers.push(resolve);
            });
        },
        get length() {
            return count;
        }
    };
}
