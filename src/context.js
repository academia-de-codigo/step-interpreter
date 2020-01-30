const EventEmitter = require('eventemitter3');
const regeneratorRuntime = require('regenerator-runtime');

class Context {
    constructor(stepper, userContext = {}) {
        this.events = new EventEmitter();
        this.stepper = stepper;
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
        this.stepper.destroy();
    }

    pause() {
        this.stepper.pause();
    }

    resume() {
        this.stepper.resume();
    }

    getInterpreterContext() {
        return {
            ...this.userContext,
            regeneratorRuntime,
            setTimeout,
            on: (...args) => this.on(...args),
            off: (...args) => this.off(...args),
            once: (...args) => this.once(...args),
            step: (...args) => this.stepper.step(...args),
            stop: (...args) => this.stop(...args),
            pause: (...args) => this.pause(...args),
            resume: (...args) => this.resume(...args),
            console: console,
            context: this
        };
    }
}

module.exports = Context;
