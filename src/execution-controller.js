const createExecutionController = ({ execution, events, context }) => {
    const {
        activeHandlers,
        stop,
        pause,
        resume,
        setStepTime
    } = context._execution;

    const controller = {
        on: (event, handler) => events.on(event, handler),
        off: (event, handler) => events.off(event, handler),
        once: (event, handler) => events.once(event, handler),
        emit: (event) => events.emit(event),
        stop,
        pause,
        resume,
        setStepTime,
        context,
        promises: {
            get executionEnd() {
                return activeHandlers.onEmptyPromise;
            },
            get emptyStack() {
                return execution;
            }
        },
        getActiveListeners: () => activeHandlers.length
    };

    Object.assign(execution, controller);
    return execution;
};

exports.createExecutionController = createExecutionController;
