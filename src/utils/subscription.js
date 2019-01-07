function createSubscription() {
    const subscribers = [];

    return {
        subscribe(handler) {
            subscribers.push(handler);
        },
        notify() {
            subscribers.forEach(handler => handler());
        },
    };
}

exports.createSubscription = createSubscription;
