const escodegen = require('escodegen');
const estraverse = require('estraverse');
const acorn = require('acorn');

const parse = (source, options) =>
    acorn.parse(source, {
        ecmaVersion: 8,
        allowReturnOutsideFunction: true,
        ...options
    });

/**
 * Formats source code by parsing it and re-generating the source code through escodegen
 * @param {String} source source code to format
 * @returns {String} beautified source code
 */
exports.format = function(source) {
    return escodegen.generate(parse(source));
};

exports.parse = function(source) {
    return parse(source);
};

exports.generate = function(ast) {
    return escodegen.generate(ast);
};

/**
 * Clones the ast by generating the code and parsing it again (needs to be re-implemented for obvious performance reasons)
 * @param {Object} ast the ast to clone
 */
exports.clone = function(ast) {
    return parse(escodegen.generate(ast));
};

/**
 * Injects a function call before every expression
 * @param {Object} ast ast
 * @param {String} fnName the function name
 * @returns {Object} modified ast
 */
exports.injectCalls = function(ast, fnName) {
    ast = exports.clone(ast);
    return estraverse.replace(ast, {
        leave(node, parent) {
            if (!node.body || !Array.isArray(node.body)) {
                return;
            }

            const steppedBody = node.body.reduce((body, child) => {
                const sanitizedNextNode = exports.removeCalls(child, fnName);
                const call = `${fnName}(\`${escodegen.generate(
                    sanitizedNextNode
                )}\`);`;
                const parsedCall = parse(call).body[0];

                if (
                    child.type === 'FunctionDeclaration' ||
                    child.type === 'FunctionExpression'
                ) {
                    return [...body, child];
                }

                return [...body, parsedCall, child];
            }, []);

            return { ...node, body: steppedBody };
        }
    });
};

/**
 * Removes every function call in the source code
 * @param {Object} ast ast to modify
 * @param {String} fnName the function name
 * @returns {Object} modified ast
 */
exports.removeCalls = function(ast, fnName) {
    ast = exports.clone(ast);
    return estraverse.replace(ast, {
        enter(node, parent) {
            if (
                node.type === 'ExpressionStatement' &&
                node.expression.type === 'CallExpression' &&
                node.expression.callee.name === fnName
            ) {
                this.remove();
            }
        }
    });
};

/**
 * Makes all the code asynchronous, by replacing all function declarations with async function declarations,
 * and prepending all function calls with an await expression. wraps all the source code in an async IIFE
 * @param {Object} ast ast
 * @returns {Object} modified ast
 */
exports.makeAsync = function(ast) {
    const source = `(async function() { ${escodegen.generate(ast)} }())`;

    return estraverse.replace(parse(source), {
        /* eslint-disable consistent-return */
        enter(node) {
            if (
                node.type === 'FunctionDeclaration' ||
                node.type === 'FunctionExpression'
            ) {
                return { ...node, async: true };
            }
        },
        leave(node, parent) {
            if (
                node.type === 'CallExpression' &&
                node.callee.type === 'FunctionExpression'
            ) {
                return;
            }

            if (node.type === 'CallExpression') {
                return {
                    type: 'AwaitExpression',
                    argument: node
                };
            }
        }
    });
};

/**
 * Makes all the code synchronous, removing every async modifier from function declaration,
 * and any await expression before a function call
 * @param {Object} ast ast
 * @returns {Object} modified ast
 */
exports.makeSync = function(ast) {
    ast = exports.clone(escodegen.generate(ast));
    return estraverse.replace(ast, {
        leave(node, parent) {
            if (node.body && Array.isArray(node.body)) {
                const body = node.body.reduce((body, child) => {
                    if (
                        child.type === 'ExpressionStatement' &&
                        child.expression.type === 'CallExpression' &&
                        child.expression.callee.type === 'FunctionExpression'
                    ) {
                        return [...body, ...child.expression.callee.body.body];
                    }

                    return [...body, child];
                }, []);

                return { ...node, body };
            }

            if (
                node.type === 'FunctionDeclaration' ||
                node.type === 'FunctionExpression'
            ) {
                return { ...node, async: false };
            }

            if (node.type === 'AwaitExpression') {
                return {
                    ...node.argument
                };
            }
        }
    });
};
