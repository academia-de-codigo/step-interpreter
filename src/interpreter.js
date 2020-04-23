const vm = require('vm');
const EventEmitter = require('eventemitter3');
const { prepare } = require('./code-transforms');
const { adaptError } = require('./error-adapters');
const { createContext, contextSetup } = require('./context');
const Stepper = require('./stepper');

class Interpreter {
    constructor(options = {}) {
        const { stepTime = 15, on = {}, context = {} } = options;

        this.steppers = [];
        this.events = new EventEmitter();
        this.getStepper = stepperFactory(this, { stepTime });
        this.context = createContext(this, context);

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

    emit(event, data) {
        this.context.emit(event, data);
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

        context = {
            __initialize__: (ctx) => {
                contextSetup(ctx);
                initialize(ctx);
            },
            step: async (...args) => stepper.step(...args),
            ...this.context,
            ...context
        };

        const transformedCode = `
        __initialize__(this);
        ${prepare(code)}
        `;

        const executor = vm.runInNewContext(transformedCode, context);
        this.events.emit('start');

        try {
            await executor();
            onEmptyStack();

            if (context._getActiveListeners().length > 0) {
                await context._getActiveListeners().onEmptyPromise;
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
        this.context._getActiveListeners().reset();
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
