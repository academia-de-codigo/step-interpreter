const EventEmitter = require('eventemitter3');
const regeneratorRuntime = require('regenerator-runtime');

class Context {
    constructor(interpreter, userContext = {}) {
        this.events = new EventEmitter();
        this.interpreter = interpreter;
        this.userContext = userContext;
        this.registeredHandlers = handlerCounter(() => this.events.emit('end'));
    }

    on(event, handler) {
        this.events.on(event, handler);
        return () => this.off(event, handler);
    }

    once(event, handler) {
        this.events.once(event, handler);
        return () => this.off(event, handler);
    }

    off(event, handler) {
        this.events.off(event, handler);
    }

    stop() {
        this.interpreter.stop();
    }

    pause() {
        this.interpreter.pause();
    }

    resume() {
        this.interpreter.resume();
    }

    getInterpreterContext(step) {
        const { on, off, once } = withHandlerCounter(
            this,
            this.registeredHandlers
        );
        return {
            ...this.userContext,
            regeneratorRuntime,
            on,
            off,
            once,
            step: (...args) => step(...args),
            stop: (...args) => this.stop(...args),
            pause: (...args) => this.pause(...args),
            resume: (...args) => this.resume(...args),
            context: this
        };
    }
}

module.exports = Context;

function withHandlerCounter(events, handlerCounter) {
    return {
        on(event, handler) {
            handlerCounter.increment();
            events.on(event, handler);
            return () => events.off(event, handler);
        },

        once(event, handler) {
            handlerCounter.increment();
            events.once(event, async () => {
                await handler();
                handlerCounter.decrement();
            });
            return () => events.off(event, handler);
        },

        off(event, handler) {
            events.off(event, handler);
            handlerCounter.decrement();
        }
    };
}

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
