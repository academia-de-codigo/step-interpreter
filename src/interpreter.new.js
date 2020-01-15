import vm from 'vm';
import regeneratorRuntime from 'regenerator-runtime';
import EventEmitter from 'eventemitter3';
import { prepare } from './code-transforms';
import { adaptError } from './error-adapters';
import { createStepper } from './stepper';

class Context {
    constructor(userContext = {}, userStepper = () => {}) {
        this.events = new EventEmitter();
        this.userContext = userContext;
        this.stepper = createStepper(userStepper);
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
        this.stepper.stop();
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
            resume: (...args) => this.resume(...args)
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
            if (err === 'execution-stop') {
                return;
            }

            throw adaptError(err);
        }
    }

    resume() {
        this.context.resume();
    }

    pause() {
        this.context.pause();
    }

    stop() {
        this.context.stop();
    }

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
