class Stepper {
    constructor(options = {}) {
        this.sleepTime = options.sleepTime || 500;
        this.subscribers = [];
    }

    async step(expression) {
        await sleep(this.sleepTime);
        await this.lock;
        await Promise.all(
            this.subscribers.map(subscriber => subscriber.handler.call(subscriber.context, expression)),
        );
    }

    pause() {
        this.lock = new Promise((resolve) => {
            this.unlocker = resolve;
        });
    }

    resume() {
        this.unlocker();
        this.unlocker = null;
    }

    unsubscribe(handler, context) {
        this.subscribers = this.subscribers.filter(
            subscriber => handler !== subscriber.handler && context !== subscriber.context,
        );
    }

    subscribe(handler, context) {
        this.subscribers.push({ handler, context });

        return () => {
            this.unsubscribe(handler, context);
        };
    }

    setSleepTime(ms) {
        if (!Number.isFinite(ms)) {
            return;
        }

        this.sleepTime = ms;
    }

    isLocked() {
        return !!this.unlocker;
    }
}

module.exports = Stepper;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
