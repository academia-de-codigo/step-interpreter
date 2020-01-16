import EventEmitter from 'eventemitter3';

export default class Stepper {
    constructor(options = {}) {
        const { stepTime = 100 } = options;

        this.events = new EventEmitter();
        this.stepTime = stepTime;
    }

    on(event, handler) {
        this.events.on(event, handler);
        return () => this.events.off(event, handler);
    }

    async step() {
        if (this.stopped) {
            throw 'execution-stop';
        }

        this.events.emit('step');
        this.currentStep = wait(this.stepTime);

        try {
            await this.currentStep;

            if (this.pausePromise) {
                await this.pausePromise;
            }
        } catch (err) {
            if (err === 'canceled') {
                throw 'execution-stop';
            }
        }
    }

    async stop() {
        this.stopped = true;
        if (this.pausePromise) {
            this.pausePromise.cancel();
            return;
        }

        if (this.currentStep) {
            this.currentStep.cancel();
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
}

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

    promise.cancel = () => rejector('canceled');
    promise.resolve = () => resolver();

    return promise;
}
