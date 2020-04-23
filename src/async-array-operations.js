exports.AsyncArrayPrototype = {
    map(mapper) {
        return map(mapper, this);
    },
    reduce(reducer, initialValue) {
        return reduce(reducer, initialValue, this);
    },
    forEach(fn) {
        return forEach(fn, this);
    },
    filter(fn) {
        return filter(fn, this);
    },
    find(fn) {
        return find(fn, this);
    }
};

exports.Array = {
    reduce,
    forEach,
    filter,
    map,
    find
};

async function reduce(reducer, initialValue, array) {
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

    return reduce.apply(array, args);
}

async function forEach(fn, array) {
    for (let i = 0; i < array.length; i++) {
        await fn.call(null, array[i], i, array);
    }
}

async function filter(fn, array) {
    const result = [];
    for (let i = 0; i < array.length; i++) {
        const pass = await fn(array[i], i, array);

        if (pass) {
            result.push(array[i]);
        }
    }

    return result;
}

async function map(mapper, array) {
    const result = [];
    for (let i = 0; i < array.length; i++) {
        result.push(await mapper(array[i], i, array));
    }

    return result;
}

async function find(finder, array) {
    for (let i = 0; i < array.length; i++) {
        const found = await finder(array[i], i, array);

        if (found) {
            return array[i];
        }
    }
}
