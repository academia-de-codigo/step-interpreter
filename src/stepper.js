const EventEmitter = require('eventemitter3');

class Stepper {
    constructor(options = {}) {
        const { stepTime = 100 } = options;

        this.events = new EventEmitter();
        this.stepTime = stepTime;
    }

    on(event, handler) {
        this.events.on(event, handler);
        return () => this.events.off(event, handler);
    }

    async step(expr) {
        if (this.destroyed) {
            throw 'stepper-destroyed';
        }

        this.events.emit('step', expr);
        this.currentStep = wait(this.stepTime);

        try {
            await this.currentStep;

            if (this.pausePromise) {
                await this.pausePromise;
            }
        } catch (err) {
            throw 'stepper-destroyed';
        }
    }

    async pause() {
        if (this.pausePromise) {
            return;
        }

        this.pausePromise = wait();
    }

    async resume() {
        if (!this.pausePromise) {
            return;
        }

        this.pausePromise.resolve();
        this.pausePromise = null;
    }

    setStepTime(stepTime) {
        this.stepTime = stepTime;
    }

    async destroy() {
        this.destroyed = true;

        if (this.currentStep) {
            this.currentStep.cancel();
        }

        if (this.pausePromise) {
            this.pausePromise.cancel();
        }
    }
}

module.exports = Stepper;

function wait(ms = false) {
    let rejector;
    let resolver;

    const promise = new Promise((resolve, reject) => {
        rejector = reject;
        resolver = resolve;

        if (ms !== false) {
            setTimeout(resolve, ms);
        }
    });

    promise.cancel = () => rejector('destroyed');
    promise.resolve = () => resolver();

    return promise;
}
