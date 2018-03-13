module.exports = {
    extends: 'airbnb-base',
    rules: {
        indent: ['error', 4],
        'no-use-before-define': ['error', { functions: false, classes: true }],
        'space-before-function-paren': [
            'error',
            {
                anonymous: 'never',
                named: 'never',
                asyncArrow: 'always',
            },
        ],
    },
};
