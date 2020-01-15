import Babel from '@babel/standalone';
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
    const createContextCall = fnName =>
        t.awaitExpression(t.callExpression(t.identifier(fnName), []));

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
                    createContextCall('step'),
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
