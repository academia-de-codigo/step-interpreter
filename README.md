[![Maintainability](https://api.codeclimate.com/v1/badges/d88c39be51e81a4f78cf/maintainability)](https://codeclimate.com/github/pantoninho/step-interpreter/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/d88c39be51e81a4f78cf/test_coverage)](https://codeclimate.com/github/pantoninho/step-interpreter/test_coverage)
[![Build Status](https://travis-ci.com/pantoninho/step-interpreter.svg?branch=master)](https://travis-ci.com/pantoninho/step-interpreter)

# step-interpreter

Sandboxed javascript interpreter that is able to run at configurable speed.

TODO README

Example usage:

```
const { createInterpreter } = require('step-interpreter');

const code = `
    const a = 1;

    for (let i = 0; i < 5; i++) {
        console.log(sum(a, i));
    }

    function sum(a, b) {
        return a + b;
    }

    console.log('done inside interpreter');
`;

async function run() {
    const interpreter = createInterpreter({
        stepTime: 100,
        context: { console }
    });

    const unsubscribe = interpreter.on(
        'step',
        code => console.log('going to run....', code)
    );

    interpreter.expose({ console });

    setTimeout(() => {
        console.log('pausing interpreter...');
        interpreter.pause();
    }, 1500);

    setTimeout(() => {
        console.log('unsubscribing stepper...');
        unsubscribe();
        console.log('resuming interpreter...');
        interpreter.resume();
        console.log('setting step interval to 10');
        interpreter.setStepInterval(10);
    }, 3000);

    await interpreter.run(code);
}

run();
```
