/* *******
this is taken from the official babel repo but with all the build-time node dependencies stripped out (---> fs)
******* */
import utils from '@babel/helper-plugin-utils';
import remapAsyncToGenerator from '@babel/helper-remap-async-to-generator';
import moduleImports from '@babel/helper-module-imports';

export default utils.declare((api, options) => {
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

                    remapAsyncToGenerator(path, { wrapAsync });
                }
            }
        };
    }

    return {
        name: 'transform-async-to-generator',

        visitor: {
            Function(path, state) {
                if (!path.node.async || path.node.generator) return;

                remapAsyncToGenerator(path, {
                    wrapAsync: state.addHelper('asyncToGenerator')
                });
            }
        }
    };
});
