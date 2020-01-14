import Context from 'context-eval';
import EventEmitter from 'eventemitter3';
import regeneratorRuntime from 'regenerator-runtime';
import { prepare, prepareSync } from './code-transforms';

export async function run(code = '', userContext = {}, step) {
    const context = createContext(userContext, step);
    const execution = new Context(context);

    const transformedCode = prepare(code, !step);
    const executor = execution.evaluate(transformedCode);
    const { handlerCounter } = context.events;

    try {
        handlerCounter.increment();
        await executor();
    } catch (err) {
        throw new Error(`[INTERPRETER] interpreter error: ${err.message}`);
    } finally {
        handlerCounter.decrement();
    }

    return createInterpreterControlObject(context, execution);
}

export function runSync(code = '', userContext = {}, step) {
    const context = createContext(userContext, step);
    const execution = new Context(context);
    const transformedCode = prepareSync(code, !step);
    const executor = execution.evaluate(transformedCode);

    try {
        executor();
    } catch (err) {
        throw new Error(`[INTERPRETER] interpreter error: ${err.message}`);
    }

    return createInterpreterControlObject(context, execution);
}

function createCounter() {
    let count = 0;
    const eventemitter = new EventEmitter();
    const notify = () => eventemitter.emit('change', count);
    const subscribe = handler => {
        eventemitter.on('change', handler);
        return () => eventemitter.off('change', handler);
    };

    return {
        increment: () => {
            count += 1;
            notify();
        },
        decrement: () => {
            count = count === 0 ? 0 : count - 1;
            notify();
        },
        reset: () => {
            if (count === 0) {
                return;
            }

            count = 0;
            notify();
        },
        onChange: handler => {
            return subscribe(handler);
        },
        get count() {
            return count;
        }
    };
}

function createEventManager() {
    const handlerCounter = createCounter();
    const emitter = new EventEmitter();

    return {
        get handlerCounter() {
            return handlerCounter;
        },
        get handlerCount() {
            return handlerCounter.count;
        },
        emit: (event, ...args) => {
            emitter.emit(event, ...args);
        },
        clean: () => {
            handlerCounter.reset();
            emitter.removeAllListeners();
        },
        externals: {
            on: (event, handler) => {
                emitter.on(event, handler);
                return () => emitter.off(event, handler);
            },
            once: (event, handler) => {
                emitter.once(event, handler);
                return () => emitter.off(event, handler);
            },
            off: (event, handler) => {
                emitter.off(event, handler);
            }
        },
        internals: {
            on: (event, handler) => {
                const wrappedHandler = async (...args) => {
                    try {
                        await handler(...args);
                    } catch (err) {
                        if (!err || err.message === 'stop') {
                            return;
                        }

                        throw Error(err);
                    }
                };

                emitter.on(event, wrappedHandler);
                handlerCounter.increment();
                return () => {
                    emitter.off(event, wrappedHandler);
                    handlerCounter.decrement();
                };
            },
            once: (event, handler) => {
                const wrappedHandler = async (...args) => {
                    try {
                        await handler(...args);
                    } catch (err) {
                        if (!err || err.message === 'stop') {
                            return;
                        }

                        throw Error(err);
                    } finally {
                        handlerCounter.decrement();
                    }
                };

                emitter.once(event, wrappedHandler);
                handlerCounter.increment();

                return () => {
                    emitter.off(event, wrappedHandler);
                    handlerCounter.decrement();
                };
            },
            off: (event, handler) => {
                if (emitter.listeners(event).includes(handler)) {
                    return;
                }
                handlerCounter.decrement();
                emitter.off(event, handler);
            }
        }
    };
}

function createStepper(userStepper) {
    let stopped;
    let steppingPromise;
    let resumeSteppingPromise;
    let stopSteppingPromise;

    return {
        step: async expr => {
            await steppingPromise;

            if (stopped) {
                return Promise.reject();
            }

            if (userStepper) {
                await userStepper(expr);
            }

            return Promise.resolve();
        },
        stop: () => {
            stopped = true;
            if (steppingPromise && stopSteppingPromise) {
                stopSteppingPromise();
                stopSteppingPromise = null;
            }
        },
        resume: () => {
            if (!steppingPromise) {
                return;
            }

            steppingPromise = null;
            resumeSteppingPromise();

            resumeSteppingPromise = null;
            stopSteppingPromise = null;
        },
        pause: () => {
            if (steppingPromise) {
                return;
            }

            steppingPromise = new Promise((resolve, reject) => {
                resumeSteppingPromise = resolve;
                stopSteppingPromise = reject;
            });
        },
        isPaused() {
            return !!resumeSteppingPromise && !!stopSteppingPromise;
        }
    };
}

function createContext(userContext, userStepper) {
    const events = createEventManager();
    const stepper = createStepper(userStepper);

    const { handlerCounter } = events;
    handlerCounter.onChange(count => {
        if (count === 0) {
            events.emit('finished');
        }
    });

    return {
        ...userContext,
        Error,
        console,
        events,
        Promise,
        stepper,
        emit: events.emit,
        on: events.internals.on,
        once: events.internals.once,
        off: events.internals.off,
        step: stepper.step,
        regeneratorRuntime
    };
}

function createInterpreterControlObject(context, execution) {
    const { events, stepper } = context;
    return {
        emit: events.emit,
        on: events.externals.on,
        once: events.externals.once,
        off: events.externals.off,
        get handlerCount() {
            return events.handlerCount;
        },
        context,
        stepper,
        pause: stepper.pause,
        resume: stepper.resume,
        stop: () => {
            stepper.stop();
            events.clean();
            execution.destroy();
        },
        isPaused: stepper.isPaused
    };
}
