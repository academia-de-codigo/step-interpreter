const vm = require('vm');
const Stepper = require('./stepper');
const { createInterpreterEvents } = require('./events');

const {
    injectCalls, parse, generate, makeAsync,
} = require('./code-transformer');

// TODO: JS-Doc for the class
class Interpreter {
    constructor(context = {}, options = {}) {
        this.stepper = new Stepper(options);
        this.context = vm.createContext({
            ...context,
            ...createInterpreterEvents(),
            step: (...args) => this.stepper.step(...args),
            console,
        });
    }

    expose(anything) {
        if (typeof anything !== 'object') {
            throw new Error('Argument needs to be an object');
        }

        Object.keys(anything).forEach((key) => {
            this.context[key] = anything[key];
        });
    }

    emit(event) {
        this.context.emit(event);
    }

    on(event) {
        this.context.on(event);
    }

    once(event) {
        this.context.once(event);
    }

    read(name) {
        return this.context[name];
    }

    pause() {
        this.stepper.pause();
    }

    resume() {
        this.stepper.resume();
    }

    stop() {
        if (!this.cancelPromise) {
            return;
        }

        this.pause();
        this.context.clearEvents();
        this.cancelPromise();
    }

    onStep(handler, context) {
        this.stepper.subscribe(handler, context);
    }

    setStepInterval(ms) {
        this.stepper.setSleepTime(ms);
    }

    async run(code) {
        if (this.running) {
            return;
        }

        const transformedCode = generate(makeAsync(injectCalls(parse(code), 'step')));

        this.running = true;
        await Promise.race([
            new Promise((resolve) => {
                this.cancelPromise = resolve;
            }),
            new Promise(async (resolve) => {
                await vm.runInContext(transformedCode, this.context);
                await endTrigger(this.context);
                resolve();
            }),
        ]);
        this.running = false;
    }
}

module.exports = Interpreter;

function endTrigger(context) {
    return new Promise((resolve) => {
        if (context.getAwaitingHandlers() === 0) {
            resolve();
            return;
        }

        context.onAwaitingHandlersChange(() => {
            if (context.getAwaitingHandlers() === 0) {
                resolve();
            }
        });
    });
}
