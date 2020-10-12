[![Maintainability](https://api.codeclimate.com/v1/badges/d88c39be51e81a4f78cf/maintainability)](https://codeclimate.com/github/pantoninho/step-interpreter/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/d88c39be51e81a4f78cf/test_coverage)](https://codeclimate.com/github/pantoninho/step-interpreter/test_coverage)
[![Build Status](https://travis-ci.com/pantoninho/step-interpreter.svg?branch=master)](https://travis-ci.com/pantoninho/step-interpreter)

# step-interpreter

Sandboxed javascript interpreter that is able to run at configurable speed.


API:

```
const { run } = require('step-interpreter');
const code = `console.log('hello world!')`;

// default options
const options = {
    stepTime: 15,
    context: {},
    es2015: false,
    sync: false
};

await run(code, options);
```

Example usage:

```
const { run } = require('step-interpreter');

const code = `
    const a = 1;

    events.once('test', () => {
        console.log('received test event!');
    })

    for (let i = 0; i < 5; i++) {
        console.log(sum(a, i));
    }

    function sum(a, b) {
        return a + b;
    }

    externalFunction();
    console.log('interpreter done executing');
`;

(async () => {
    const execution = run(code, {
        stepTime: 300,
        context: {
            externalFunction: () =>
                console.log('external function has been called!')
        }
    });
    execution.on('step', (code) => console.log('executing: ', code));

    setTimeout(() => {
        console.log('pausing interpreter...');
        execution.pause();
    }, 1000);

    setTimeout(() => {
        console.log('resuming interpreter...');
        execution.resume();
    }, 3000);

    await execution;
    console.log('stack is now empty, but there are active event listeners..');
    const { executionEnd } = execution.promises;
    execution.emit('test');
    await executionEnd;
    console.log('execution ended');
})();
```

README TODOS:
 - add option descriptions
