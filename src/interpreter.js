const vm = require('vm');
const EventEmitter = require('eventemitter3');
const { prepare } = require('./code-transforms');
const { adaptError } = require('./error-adapters');
const Context = require('./context');
const Stepper = require('./stepper');

class Interpreter {
    constructor(options = {}) {
        const { stepTime = 15, on = {}, context = {} } = options;
        this.stepper = new Stepper({ stepTime });

        this.context = new Context(this.stepper, context);
        this.events = new EventEmitter();

        this.stepper.on('step', () => this.events.emit('step'));
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
        this.context.resume();
    }

    pause() {
        this.context.pause();
    }

    stop() {
        this.context.stop();
    }

    setStepTime(ms) {
        this.stepper.setStepTime(ms);
    }
}

function createInterpreter(code, options) {
    const interpreter = new Interpreter(options);

    return {
        run: async () => interpreter.run(code),
        pause: () => interpreter.pause(),
        resume: () => interpreter.resume(),
        stop: () => interpreter.stop(),
        context: interpreter.context
    };
}

exports.createInterpreter = createInterpreter;
