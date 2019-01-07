const Interpreter = require('./interpreter');
const { createInterpreterEvents } = require('./events');
const { createSubscription } = require('./utils/subscription');

function execute(code = '', context = {}, options = {}) {
    let stopped = false;

    const events = createInterpreterEvents();
    const executionEnd = createSubscription();
    const interpreter = new Interpreter(code, { ...context, ...events }, options);

    interpreter.run().then(finishTrigger);
    events.onAwaitingHandlersChange(finishTrigger);

    function finishTrigger() {
        if (events.getAwaitingHandlers() > 0) {
            return;
        }

        executionEnd.notify();
    }

    return {
        pause() {
            interpreter.pause();
        },
        resume() {
            if (stopped) {
                return;
            }

            interpreter.resume();
        },
        stop() {
            stopped = true;
            interpreter.pause();
            executionEnd.notify();
        },
        setInterval(ms) {
            interpreter.setStepInterval(ms);
        },
        emit(event) {
            events.emit(event);
        },
        onFinish(handler) {
            executionEnd.subscribe(handler);
        },
        onStep(handler) {
            interpreter.onStep(handler);
        },
    };
}

exports.execute = execute;
