const vm = require('vm');
const EventEmitter = require('eventemitter3');
const { prepare } = require('./code-transforms');
const { adaptError } = require('./error-adapters');
const Context = require('./context');
const Stepper = require('./stepper');
const { AsyncArrayPrototype } = require('./async-array-operations');

class Interpreter {
    constructor(options = {}) {
        const { stepTime = 15, on = {}, context = {} } = options;

        this.getStepper = stepperFactory(this, { stepTime });
        this.steppers = [];
        this.context = new Context(this, context);
        this.events = new EventEmitter();

        this.on('start', on.start);
        this.on('step', on.step);
        this.on('end', on.exit);
    }

    on(event, handler) {
        if (typeof handler !== 'function') {
            return;
        }

        this.events.on(event, handler);
        return () => this.events.off(event, handler);
    }

    emit(event, arg) {
        this.context.events.emit(event, arg);
    }

    async run(
        code,
        {
            initialize = async () => {},
            onEmptyStack = () => {},
            context = {}
        } = {}
    ) {
        const stepper = this.getStepper();
        this.steppers.push(stepper);
        const step = async (...args) => stepper.step(...args);

        context = {
            ...this.context.getInterpreterContext(step),
            ...context,
            __initialize__: contextSetup(initialize)
        };

        const transformedCode = `
        __initialize__(this);
        ${prepare(code)}
        `;

        const executor = vm.runInNewContext(transformedCode, context);
        this.events.emit('start');
        this.context.registeredHandlers.increment();

        try {
            await executor();
            this.context.registeredHandlers.decrement();
            onEmptyStack();

            if (this.context.registeredHandlers.length > 0) {
                await this.context.registeredHandlers.onEmptyPromise;
            }
        } catch (err) {
            if (err === 'stepper-destroyed') {
                return;
            }

            throw adaptError(err);
        } finally {
            this.steppers = this.steppers.filter((s) => s !== stepper);
            this.events.emit('end');
        }
    }

    resume() {
        this.steppers.forEach((s) => s.resume());
    }

    pause() {
        this.steppers.forEach((s) => s.pause());
    }

    stop() {
        this.steppers.forEach((s) => s.destroy());
        this.context.registeredHandlers.reset();
    }

    setStepTime(ms) {
        this.steppers.forEach((s) => s.setStepTime(ms));
    }
}

module.exports = Interpreter;

function stepperFactory(interpreter, options) {
    let stepper;
    let stepDisposer;

    return () => {
        if (stepDisposer) {
            stepDisposer();
        }
        stepper = new Stepper(options);
        stepDisposer = stepper.on('step', (...args) =>
            interpreter.events.emit('step', ...args)
        );

        return stepper;
    };
}

function contextSetup(initialize = () => {}) {
    return (context) => {
        context.Promise = Promise;
        context.Error = Error;
        context.setTimeout = setTimeout;
        context.console = console;
        Object.keys(AsyncArrayPrototype).forEach((key) => {
            context.Array.prototype[key] = AsyncArrayPrototype[key];
        });

        initialize(context);
    };
}
