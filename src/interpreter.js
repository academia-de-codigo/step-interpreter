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
        this.stepper = this.getStepper();

        this.context = new Context(this, context);
        this.events = new EventEmitter();

        this.context.on('start', () => this.events.emit('start'));
        this.context.on('exit', () => this.events.emit('exit'));
        this.on('start', on.start);
        this.on('step', on.step);
        this.on('exit', on.exit);
    }

    on(event, handler) {
        if (typeof handler !== 'function') {
            return;
        }

        this.events.on(event, handler);
        return () => this.events.off(event, handler);
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
            if (err === 'stepper-destroyed') {
                return;
            }

            throw adaptError(err);
        }
    }

    resume() {
        this.stepper.resume();
    }

    pause() {
        this.stepper.pause();
    }

    stop() {
        this.stepper.destroy();
        this.stepper = this.getStepper();
    }

    setStepTime(ms) {
        this.stepper.setStepTime(ms);
    }
}

function stepperFactory(interpreter, options) {
    let stepper;
    let stepDisposer;

    return () => {
        if (stepDisposer) {
            stepDisposer();
        }
        stepper = new Stepper(options);
        stepDisposer = stepper.on('step', () =>
            interpreter.events.emit('step')
        );

        return stepper;
    };
}

module.exports = Interpreter;
