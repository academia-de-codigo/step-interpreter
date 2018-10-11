const escodegen = require('escodegen');
const estraverse = require('estraverse');
const acorn = require('acorn');

const acornParse = (source, options) =>
    acorn.parse(source, {
        ecmaVersion: 8,
        allowReturnOutsideFunction: true,
        ...options,
    });

module.exports = {
    format,
    acornParse,
    generate,
    clone,
    parse,
    removeCalls,
    injectCalls,
    makeAsync,
};

/**
 * Formats source code by parsing it and re-generating the source code through escodegen
 * @param {String} source source code to format
 * @returns {String} beautified source code
 */
function format(source) {
    return escodegen.generate(acornParse(source));
}

/**
 * Parses the source code into an AST using acorn
 * @param {String} source source code
 * @returns {Object} the abstract syntax tree
 */
function parse(source) {
    return acornParse(source);
}

/**
 * Generates source code from an AST using escodegen
 * @param {Object} ast an abstract syntax tree
 * @returns {String} pretty source code
 */
function generate(ast) {
    return escodegen.generate(ast);
}

/**
 * Clones the ast by generating the code and parsing it again
 * (needs to be re-implemented for obvious performance reasons)
 * @param {Object} ast the ast to clone
 */
function clone(ast) {
    return acornParse(escodegen.generate(ast));
}

/**
 * Injects a function call before every expression
 * @param {Object} ast ast
 * @param {String} fnName the function name
 * @returns {Object} modified ast
 */
function injectCalls(ast, fnName) {
    // eslint-disable-next-line
    ast = clone(ast);
    return estraverse.replace(ast, {
        /* eslint-disable consistent-return */
        leave(node) {
            if (!node.body || !Array.isArray(node.body)) {
                return;
            }

            const steppedBody = node.body.reduce((body, child) => {
                const sanitizedNextNode = removeCalls(child, fnName);
                const call = `${fnName}(\`${escodegen.generate(sanitizedNextNode)}\`);`;
                const parsedCall = acornParse(call).body[0];

                if (child.type === 'FunctionDeclaration' || child.type === 'FunctionExpression') {
                    return [...body, child];
                }

                return [...body, parsedCall, child];
            }, []);

            return { ...node, body: steppedBody };
        },
    });
}

/**
 * Removes every function call in the source code
 * @param {Object} ast ast to modify
 * @param {String} fnName the function name
 * @returns {Object} modified ast
 */
function removeCalls(ast, fnName) {
    ast = clone(ast);
    return estraverse.replace(ast, {
        enter(node) {
            if (
                node.type === 'ExpressionStatement' &&
                node.expression.type === 'CallExpression' &&
                node.expression.callee.name === fnName
            ) {
                this.remove();
            }
        },
    });
}

/**
 * Makes all the code asynchronous, by replacing all function declarations with async function
 * declarations, and prepending all function calls with an await expression.
 * wraps all the source code in an async IIFE
 * @param {Object} ast ast
 * @returns {Object} modified ast
 */
function makeAsync(ast) {
    const source = `(async function() { ${escodegen.generate(ast)} }())`;

    return estraverse.replace(acornParse(source), {
        enter(node) {
            if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
                return { ...node, async: true };
            }
        },
        leave(node) {
            if (node.type === 'CallExpression' && node.callee.type === 'FunctionExpression') {
                return;
            }

            if (node.type === 'CallExpression') {
                return {
                    type: 'AwaitExpression',
                    argument: node,
                };
            }
        },
    });
}
