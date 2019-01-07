const vm = require('vm');
const Stepper = require('./stepper');

const {
    injectCalls, parse, generate, makeAsync,
} = require('./code-transformer');

// TODO: JS-Doc for the class
class Interpreter {
    constructor(code = '', context = {}, options = {}) {
        this.stepper = new Stepper(options);
        this.code = code;
        this.context = vm.createContext({
            ...context,
            step: this.stepper.step.bind(this.stepper),
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

    read(name) {
        return this.context[name];
    }

    pause() {
        this.stepper.pause();
    }

    resume() {
        this.stepper.resume();
    }

    onStep(handler, context) {
        this.stepper.subscribe(handler, context);
    }

    setStepInterval(ms) {
        this.stepper.setSleepTime(ms);
    }

    async run() {
        if (this.executed) {
            return Promise.resolve();
        }

        this.executed = true;
        const transformedCode = generate(makeAsync(injectCalls(parse(this.code), 'step')));
        return vm.runInContext(transformedCode, this.context);
    }
}

module.exports = Interpreter;
