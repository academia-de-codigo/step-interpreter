import Babel from '@babel/standalone';
import generate from '@babel/generator';
import asyncToGenerator from './async-to-generator-polyfill';

const asyncWrapper = code => {
    return `
    async function main() {
        ${code}
    }

    main;
    `;
};

export function prepare(code, noStep) {
    if (noStep) {
        return Babel.transform(asyncWrapper(code), {
            presets: ['es2015'],
            plugins: [asyncToGenerator]
        }).code;
    }

    const withSteps = Babel.transform(asyncWrapper(code), {
        plugins: [stepInjector]
    }).code;

    return Babel.transform(withSteps, {}).code;
}

const syncWrapper = code => {
    return `
    function main() {
        ${code}
    }

    main;
    `;
};

export function prepareSync(code, noStep) {
    if (noStep) {
        return Babel.transform(syncWrapper(code), {
            presets: ['es2015']
        }).code;
    }

    const withSteps = Babel.transform(syncWrapper(code), {
        plugins: [stepInjector]
    }).code;

    return Babel.transform(withSteps, {
        presets: ['es2015']
    }).code;
}

function stepInjector(babel) {
    const t = babel.types;
    const createContextCall = (fnName, expr) =>
        t.awaitExpression(
            t.callExpression(t.identifier(fnName), [
                t.templateLiteral([t.templateElement({ raw: expr })], [])
            ])
        );

    const MainVisitor = {
        FunctionDeclaration: {
            enter(path) {
                path.node.async = true;
            }
        },
        Statement: {
            exit(path) {
                if (path.node.type === 'BlockStatement') {
                    return;
                }
                path.replaceWithMultiple([
                    createContextCall(
                        'step',
                        stepRemover(generate.default(path.node).code)
                    ),
                    path.node
                ]);
            }
        }
    };

    return {
        visitor: {
            FunctionDeclaration(path) {
                if (path.node.id.name === 'main') {
                    path.traverse(MainVisitor);
                }

                path.stop();
            }
        }
    };
}

function stepRemover(code) {
    return Babel.transform(code, {
        parserOpts: {
            allowReturnOutsideFunction: true,
            allowAwaitOutsideFunction: true
        },
        plugins: [
            {
                visitor: {
                    CallExpression(path) {
                        if (path.node.callee.name === 'step') {
                            path.parentPath.remove();
                        }
                    }
                }
            }
        ]
    }).code;
}
