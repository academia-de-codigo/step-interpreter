const ERROR_MAP = {
    ReferenceError: ReferenceError
};

export function adaptError(error) {
    const { name } = error.constructor;

    if (!ERROR_MAP[name]) {
        return error;
    }

    const adapted = new ERROR_MAP[name](error.message);
    adapted.stack = error.stack;
    adapted.original = error;

    return adapted;
}
