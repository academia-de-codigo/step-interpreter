module.exports = getStepper;

/**
 * A stepper factory. It returns a function that will be called by
 * the interpreter between each expression. It is able to halt
 * and resume vm's code execution.
 * @param {*} interval stepper sleep interval
 */
function getStepper(sleepTime = 500) {
    let lock;
    let unlocker;
    let subscribers = [];

    const stepper = async (nextExpression) => {
        await sleep(sleepTime);
        await lock;

        subscribers.forEach(fn => fn(nextExpression));
    };

    /**
     * Unlocks the stepper function
     */
    stepper.unlock = () => {
        if (!unlocker) {
            return;
        }

        unlocker();
        unlocker = null;
    };

    /**
     * Locks the stepper function
     */
    stepper.lock = () => {
        lock = new Promise((resolve) => {
            unlocker = resolve;
        });
    };

    /**
     * Subscribe to the stepper. This function will be called after every step sleep
     * @param {Function} fn subscriber
     * @returns {Function} unsubscribing function
     */
    stepper.subscribe = (fn) => {
        subscribers.push(fn);

        return () => {
            subscribers = subscribers.filter(cb => cb !== fn);
        };
    };

    /**
     * Sets the sleep time of the stepper
     * @param {Number} ms interval in miliseconds
     */
    stepper.setSleepTime = (ms) => {
        sleepTime = ms; // eslint-disable-line no-param-reassign
    };

    stepper.isLocked = () => !!unlocker;

    return stepper;
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
