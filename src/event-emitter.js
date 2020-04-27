const EventEmitter = require('eventemitter3');

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
        },
        destroy() {
            events.removeAllListeners();
        }
    };
};

module.exports = Emitter;
