const { AsyncArrayPrototype } = require('./async-array-operations');

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
