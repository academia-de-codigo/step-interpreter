const regeneratorRuntime = require('regenerator-runtime');
const { AsyncArrayPrototype, Array } = require('./async-array-operations');
const ContextEvents = require('./context-events');

const createContext = (interpreter, userContext = {}) => {
    const events = new ContextEvents();

    return {
        regeneratorRuntime,
        stop: () => interpreter.stop(),
        pause: () => interpreter.pause(),
        resume: () => interpreter.resume(),
        on: (event, handler) => events.on(event, handler),
        once: (event, handler) => events.once(event, handler),
        off: (event, handler) => events.off(event, handler),
        emit: (event, data) => events.emit(event, data),
        _getActiveListeners: () => events.activeListeners,
        _find: Array.find,
        _filter: Array.filter,
        _map: Array.map,
        _reduce: Array.reduce,
        _forEach: Array.forEach,
        _context: this,
        ...userContext
    };
};

const contextSetup = (context) => {
    context.Promise = Promise;
    context.Error = Error;
    context.setTimeout = setTimeout;
    context.console = console;
    Object.keys(AsyncArrayPrototype).forEach((key) => {
        context.Array.prototype[key] = AsyncArrayPrototype[key];
    });
};

exports.createContext = createContext;
exports.contextSetup = contextSetup;
