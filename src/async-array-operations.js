exports.AsyncArrayPrototype = {
    map,
    reduce,
    forEach,
    filter,
    find
};

async function reduce(reducer, initialValue) {
    const { reduce } = Array.prototype;

    const wrappedReducer = async (acc, ...args) => {
        acc = await acc;
        return await reducer(acc, ...args);
    };

    // this is necessary because using .call(this, reducer, undefined)
    // calls reduce with explicit 'undefined' as second argument
    // calling the reducer for the first time with accumulator = undefined
    const args = initialValue
        ? [wrappedReducer, initialValue]
        : [wrappedReducer];

    return reduce.apply(this, args);
}

async function forEach(fn, boundTo = this) {
    for (let i = 0; i < this.length; i++) {
        await fn.call(boundTo, this[i], i, this);
    }
}

async function filter(fn) {
    const result = [];
    for (let i = 0; i < this.length; i++) {
        const pass = await fn(this[i], i, this);

        if (pass) {
            result.push(this[i]);
        }
    }

    return result;
}

async function map(mapper) {
    const result = [];
    for (let i = 0; i < this.length; i++) {
        result.push(await mapper(this[i], i, this));
    }

    return result;
}

async function find(finder) {
    for (let i = 0; i < this.length; i++) {
        const found = await finder(this[i], i, this);

        if (found) {
            return this[i];
        }
    }
}
