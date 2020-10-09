const { AsyncArrayPrototype, Array } = require('./async-array-operations');
const regeneratorRuntime = require('regenerator-runtime');
const { withHandlerCounter, handlerCounter } = require('./handler-counter');

const createContext = ({ events, userContext, stepper }) => {
    const activeHandlers = handlerCounter();

    return {
        regeneratorRuntime,
        _find: Array.find,
        _filter: Array.filter,
        _map: Array.map,
        _reduce: Array.reduce,
        _forEach: Array.forEach,
        __initialize__: contextSetup,
        Promise,
        step: async (...args) => stepper.step(...args),
        events: withHandlerCounter(events, activeHandlers),
        _execution: {
            stop: () => {
                stepper.destroy();
                events.destroy();
            },
            pause: () => stepper.pause(),
            resume: () => stepper.resume(),
            setStepTime: (ms) => stepper.setStepTime(ms),
            activeHandlers
        },
        ...userContext
    };
};

exports.createContext = createContext;

const contextSetup = (context) => {
    context.Promise = Promise;
    context.Error = Error;
    context.setTimeout = setTimeout;
    context.console = console;
    Object.keys(AsyncArrayPrototype).forEach((key) => {
        context.Array.prototype[key] = AsyncArrayPrototype[key];
    });
};

exports.contextSetup = contextSetup;
