const EventEmitter = require('eventemitter3');
const { createSubscription } = require('./utils/subscription');

function createInterpreterEvents() {
    const events = new EventEmitter();
    const handlersSubscription = createSubscription();
    let awaitingHandlers = 0;

    return {
        on(eventname, handler) {
            awaitingHandlers += 1;
            events.on(eventname, handler);
        },
        off(eventname, handler) {
            if (!events.listeners(eventname).includes(handler)) {
                return;
            }

            events.off(eventname, handler);
            awaitingHandlers -= 1;
            handlersSubscription.notify();
        },
        once(eventname, handler) {
            awaitingHandlers += 1;

            events.once(eventname, async (...args) => {
                await handler(...args);
                awaitingHandlers -= 1;
                handlersSubscription.notify();
            });
        },
        emit(eventname) {
            events.emit(eventname);
        },
        getAwaitingHandlers() {
            return awaitingHandlers;
        },
        onAwaitingHandlersChange(handler) {
            handlersSubscription.subscribe(handler);
        },
    };
}

exports.createInterpreterEvents = createInterpreterEvents;
