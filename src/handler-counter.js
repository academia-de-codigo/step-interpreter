function withHandlerCounter(events) {
    const activeHandlers = handlerCounter();

    return {
        activeHandlers,
        emit(event, data) {
            events.emit(event, data);
        },
        on(event, handler) {
            activeHandlers.increment();
            events.on(event, handler);
            return () => {
                events.off(event, handler);
                activeHandlers.decrement();
            };
        },
        once(event, handler) {
            activeHandlers.increment();
            events.once(event, async () => {
                await handler();
                activeHandlers.decrement();
            });
            return () => {
                events.off(event, handler);
                activeHandlers.decrement();
            };
        }
    };
}

exports.withHandlerCounter = withHandlerCounter;

function handlerCounter(onEmpty = () => {}) {
    let count = 0;
    let onEmptyResolvers = [];
    let onEmptyRejecters = [];

    const callOnEmptyHandlers = (err) => {
        onEmpty();

        const resolvers = err ? onEmptyRejecters : onEmptyResolvers;
        resolvers.forEach((r) => r(err));
        onEmptyResolvers = [];
        onEmptyRejecters = [];
    };

    return {
        increment() {
            count++;
        },
        decrement() {
            count--;

            if (count === 0) {
                callOnEmptyHandlers();
            }
        },
        onEmpty(callback) {
            onEmpty = callback;
        },
        reset(err) {
            callOnEmptyHandlers(err);
            count = 0;
        },
        get onEmptyPromise() {
            return new Promise((resolve, reject) => {
                onEmptyResolvers.push(resolve);
                onEmptyRejecters.push(reject);
            });
        },
        get length() {
            return count;
        }
    };
}

exports.handlerCounter;
