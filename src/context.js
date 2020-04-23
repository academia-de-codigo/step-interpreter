const EventEmitter = require('eventemitter3');
const regeneratorRuntime = require('regenerator-runtime');

class Context {
    constructor(interpreter, userContext = {}) {
        this.events = new EventEmitter();
        this.interpreter = interpreter;
        this.userContext = userContext;
    }

    on(event, handler) {
        this.events.on(event, handler);
        return () => this.events.off(event, handler);
    }

    once(event, handler) {
        this.events.once(event, handler);
        return () => this.events.off(event, handler);
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
        return {
            ...this.userContext,
            regeneratorRuntime,
            on: (...args) => this.on(...args),
            off: (...args) => this.off(...args),
            once: (...args) => this.once(...args),
            step: (...args) => step(...args),
            stop: (...args) => this.stop(...args),
            pause: (...args) => this.pause(...args),
            resume: (...args) => this.resume(...args),
            context: this
        };
    }
}

module.exports = Context;
