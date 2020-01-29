/* *******
this is taken from the official babel repo but with all the build-time node dependencies stripped out (---> fs)
******* */
const utils = require('@babel/helper-plugin-utils');
const remapAsyncToGenerator = require('@babel/helper-remap-async-to-generator');
const moduleImports = require('@babel/helper-module-imports');

console.log('remap async:', remapAsyncToGenerator);

module.exports = utils.declare((api, options) => {
    api.assertVersion(7);
    const { types: t } = api;

    const { method, module } = options;

    if (method && module) {
        return {
            name: 'transform-async-to-generator',

            visitor: {
                Function(path, state) {
                    if (!path.node.async || path.node.generator) return;

                    let wrapAsync = state.methodWrapper;
                    if (wrapAsync) {
                        wrapAsync = t.cloneNode(wrapAsync);
                    } else {
                        wrapAsync = state.methodWrapper = moduleImports.addNamed(
                            path,
                            method,
                            module
                        );
                    }

                    remapAsyncToGenerator.default(path, { wrapAsync });
                }
            }
        };
    }

    return {
        name: 'transform-async-to-generator',

        visitor: {
            Function(path, state) {
                if (!path.node.async || path.node.generator) return;

                remapAsyncToGenerator.default(path, {
                    wrapAsync: state.addHelper('asyncToGenerator')
                });
            }
        }
    };
});
