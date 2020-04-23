const vm = require('vm');
const EventEmitter = require('eventemitter3');
const { prepare } = require('./code-transforms');
const { adaptError } = require('./error-adapters');
const Context = require('./context');
const Stepper = require('./stepper');

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
        { initialize = async () => {}, onEmptyStack = () => {} } = {}
    ) {
        const stepper = this.getStepper();
        this.steppers.push(stepper);
        const step = async (...args) => stepper.step(...args);

        const context = {
            ...this.context.getInterpreterContext(step),
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
        const { Array } = context;
        context.Promise = Promise;
        context.Error = Error;
        context.setTimeout = setTimeout;
        context.console = console;
        Array.prototype.map = map;
        Array.prototype.reduce = reduce;
        Array.prototype.forEach = forEach;
        Array.prototype.filter = filter;
        Array.prototype.find = find;

        initialize(context);
    };
}

async function reduce(reducer, initialValue) {
    const { reduce } = Array.prototype;

    const wrappedReducer = async (acc, ...args) => {
        acc = await acc;
        return await reducer(acc, ...args);
    };

    // this is necessary because using .call(this, reducer, undefined)
    // calls reduce with explicit 'undefined' as second argument
    // calling the reducer for the first time with accumulator = undefined
    const args = initialValue
        ? [wrappedReducer, initialValue]
        : [wrappedReducer];

    return reduce.apply(this, args);
}

async function forEach(fn, boundTo = this) {
    for (let i = 0; i < this.length; i++) {
        await fn.call(boundTo, this[i], i, this);
    }
}

async function filter(fn) {
    const result = [];
    for (let i = 0; i < this.length; i++) {
        const pass = await fn(this[i], i, this);

        if (pass) {
            result.push(this[i]);
        }
    }

    return result;
}

async function map(mapper) {
    const result = [];
    for (let i = 0; i < this.length; i++) {
        result.push(await mapper(this[i], i, this));
    }

    return result;
}

async function find(finder) {
    for (let i = 0; i < this.length; i++) {
        const found = await finder(this[i], i, this);

        if (found) {
            return this[i];
        }
    }
}
