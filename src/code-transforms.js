const Babel = require('@babel/standalone');
const generate = require('@babel/generator');
const asyncToPromise = require('babel-plugin-transform-async-to-promises');

exports.toES2015 = toES2015;
exports.prepare = prepare;

function toES2015(code) {
    return Babel.transform(code, {
        presets: ['es2015'],
        plugins: [asyncToPromise]
    }).code;
}

function prepare(code) {
    return `
async function main() {
    ${
        Babel.transform(code, {
            parserOpts: {
                allowAwaitOutsideFunction: true
            },
            plugins: [stepInjector]
        }).code
    }
}

main;
`;
}

function stepInjector(babel) {
    const t = babel.types;

    return {
        visitor: {
            Function(path) {
                path.node.async = true;
            },
            ArrowFunctionExpression(path) {
                implicitToExplicitReturnFunction(babel, path);
            },
            ReturnStatement(path) {
                prependContextCall(babel, path);

                if (!t.isAwaitExpression(path.node.argument)) {
                    path.node.argument = t.awaitExpression(path.node.argument);
                }
            },
            Loop(path) {
                prependContextCall(babel, path);
            },
            VariableDeclaration(path) {
                if (
                    t.isForStatement(path.parent) ||
                    t.isWhileStatement(path.parent)
                ) {
                    path.skip();
                    return;
                }

                prependContextCall(babel, path);
            },
            CallExpression(path) {
                if (t.isAwaitExpression(path.parent)) {
                    return;
                }

                if (path.node.arguments) {
                    path.node.arguments = path.node.arguments.map(arg => {
                        if (t.isCallExpression(arg)) {
                            return t.awaitExpression(arg);
                        }
                        return arg;
                    });
                }

                path.replaceWith(t.awaitExpression(path.node));
            },
            ExpressionStatement(path) {
                if (
                    t.isAwaitExpression(path.node.expression) &&
                    t.isCallExpression(path.node.expression.argument) &&
                    path.node.expression.argument.callee.name === 'step'
                ) {
                    path.skip();
                    return;
                }

                prependContextCall(babel, path);
            }
        }
    };
}

function createContextCall(babel, fnName, expr) {
    const { types: t } = babel;

    const stepperName = t.identifier(fnName);
    const stepperArgs = [
        t.templateLiteral([t.templateElement({ raw: expr })], [])
    ];

    return t.expressionStatement(
        t.awaitExpression(t.callExpression(stepperName, stepperArgs))
    );
}

function prependContextCall(babel, path) {
    return path.insertBefore(
        createContextCall(babel, 'step', generate.default(path.node).code)
    );
}

function implicitToExplicitReturnFunction(babel, path) {
    const { types: t } = babel;

    if (!t.isArrowFunctionExpression(path.node)) {
        return;
    }

    if (t.isBlockStatement(path.node.body)) {
        return;
    }

    const { params } = path.node;

    const stepCall = createContextCall(
        babel,
        'step',
        generate.default(path.node.body).code
    );
    const returnStatement = t.returnStatement(path.node.body);
    const body = t.blockStatement([stepCall, returnStatement]);
    const { async: isAsync } = path.node;

    return path.replaceWith(t.arrowFunctionExpression(params, body, isAsync));
}
