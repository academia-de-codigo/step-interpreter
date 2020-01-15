import vm from 'vm';
import regeneratorRuntime from 'regenerator-runtime';
import EventEmitter from 'eventemitter3';
import { prepare } from './code-transforms';
import { adaptError } from './error-adapters';

class Context {
    constructor(userContext = {}) {
        this.events = new EventEmitter();
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

    async step() {
        return Promise.resolve();
    }

    getInterpreterContext() {
        return {
            ...this.userContext,
            regeneratorRuntime,
            on: (...args) => this.on(...args),
            off: (...args) => this.off(...args),
            once: (...args) => this.once(...args),
            step: (...args) => this.step(...args)
        };
    }
}

class Interpreter {
    constructor(options = {}) {
        const { stepTime = 100, on = {}, context = {} } = options;
        this.stepTime = stepTime;

        this.context = new Context(context);
        this.events = new EventEmitter();

        this.context.on('start', () => this.events.emit('start'));
        this.context.on('step', () => this.events.emit('step'));
        this.context.on('exit', () => this.events.emit('exit'));

        if (on.start) {
            this.events.on('start', on.start);
        }
        if (on.step) {
            this.events.on('step', on.step);
        }
        if (on.exit) {
            this.events.on('exit', on.exit);
        }
    }

    async run(code) {
        const transformedCode = prepare(code);
        const executor = vm.runInNewContext(
            transformedCode,
            this.context.getInterpreterContext()
        );

        try {
            this.events.emit('start');
            await executor();
            this.events.emit('exit');
        } catch (err) {
            throw adaptError(err);
        }
    }

    resume() {}

    pause() {}

    stop() {}

    setStepTime() {}
}

export function createInterpreter(code, options) {
    const interpreter = new Interpreter(options);

    return {
        run: async () => interpreter.run(code),
        pause: () => interpreter.pause(),
        resume: () => interpreter.resume(),
        stop: () => interpreter.stop()
    };
}
