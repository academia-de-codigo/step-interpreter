const regeneratorRuntime = require('regenerator-runtime');
const { withHandlerCounter } = require('./handler-counter');
const vm = require('vm');
const EventEmitter = require('eventemitter3');
const { prepare } = require('./code-transforms');
const { adaptError } = require('./error-adapters');
const { Array } = require('./async-array-operations');
const { contextSetup } = require('./context');
const Stepper = require('./stepper');

const Emitter = () => {
    const events = new EventEmitter();

    return {
        on(event, handler) {
            events.on(event, handler);
            return () => events.off(event, handler);
        },
        off(event, handler) {
            return events.off(event, handler);
        },
        once(event, handler) {
            events.on(event, handler);
            return () => events.off(event, handler);
        },
        emit(event, data) {
            events.emit(event, data);
        }
    };
};

const run = (code = '', options = {}) => {
    const { stepTime = 15, on = {}, context: userContext = {} } = options;
    const events = Emitter();

    const stepper = new Stepper({ stepTime });
    const stepEventPipe = (data) => events.emit('step', data);
    const stepEventPipeDisposer = stepper.on('step', stepEventPipe);

    on.start && events.on('start', on.start);
    on.step && events.on('step', on.step);
    on.exit && events.on('end', on.exit);

    const stepController = {
        stop: () => {
            stepEventPipeDisposer();
            stepper.destroy();
        },
        pause: () => stepper.pause(),
        resume: () => stepper.resume(),
        setStepTime: (ms) => stepper.setStepTime(ms)
    };

    const contextEvents = withHandlerCounter(events);
    const context = {
        regeneratorRuntime,
        _find: Array.find,
        _filter: Array.filter,
        _map: Array.map,
        _reduce: Array.reduce,
        _forEach: Array.forEach,
        __initialize__: contextSetup,
        Promise,
        step: async (...args) => stepper.step(...args),
        ...contextEvents,
        ...stepController,
        ...userContext
    };

    const { activeHandlers } = contextEvents;
    activeHandlers.onEmptyPromise
        .then(() => events.emit('end'))
        .catch(() => events.emit('end'));

    const executionController = (execution) => ({
        ...stepController,
        on: (event, handler) => events.on(event, handler),
        off: (event, handler) => events.off(event, handler),
        once: (event, handler) => events.once(event, handler),
        emit: (event) => events.emit(event),
        promises: {
            get executionEnd() {
                return activeHandlers.onEmptyPromise;
            },
            get emptyStack() {
                return execution;
            }
        },
        getActiveListeners: () => activeHandlers.length
    });

    const attachControllerToPromise = (execution) => {
        Object.assign(execution, executionController(execution));
        return execution;
    };

    const preparedCode = `
    __initialize__(this);
    ${prepare(code)}
    `;

    activeHandlers.increment();
    events.emit('start');

    const execution = vm
        .runInNewContext(preparedCode, context)()
        .catch((err) => {
            if (err === 'stepper-destroyed') {
                return;
            }

            // makes promises.onExecutionEnd fail aswell
            activeHandlers.reset(adaptError(err));
            throw adaptError(err);
        })
        .finally(() => {
            activeHandlers.decrement();
        });

    return attachControllerToPromise(execution);
};

exports.run = run;
