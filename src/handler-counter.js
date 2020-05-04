function withHandlerCounter(events, activeHandlers = handlerCounter()) {
    return {
        emit(event, data) {
            events.emit(event, data);
        },
        on(event, handler) {
            activeHandlers.increment();

            const asyncHandler = async () => {
                try {
                    await handler();
                } catch (err) {
                    if (err === 'stepper-destroyed') {
                        return;
                    }

                    throw err;
                } finally {
                    activeHandlers.decrement();
                }
            };

            events.on(event, asyncHandler);
            return () => {
                events.off(event, asyncHandler);
                activeHandlers.decrement();
            };
        },
        once(event, handler) {
            activeHandlers.increment();
            const asyncHandler = async () => {
                try {
                    await handler();
                } catch (err) {
                    if (err === 'stepper-destroyed') {
                        return;
                    }

                    throw err;
                } finally {
                    activeHandlers.decrement();
                }
            };
            events.once(event, asyncHandler);
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

exports.handlerCounter = handlerCounter;

function wrapAsyncHandler(handler) {
    return async () => {
        try {
            await handler();
        } catch (err) {
            if (err === 'stepper-destroyed') {
                return;
            }

            throw err;
        }
    };
}
