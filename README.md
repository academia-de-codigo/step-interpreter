# step-interpreter

Javascript interpreter that is able to run code with configurable speed.

TODO README


Example usage:

```
const Interpreter = require('../src/interpreter');

const code = `
    const a = 1;

    for (let i = 0; i < 5; i++) {
        console.log(sum(a, i));
    }
    
    this.printer = function(string) {
        console.log(string);
    };

    function sum(a, b) {
        return a + b;
    }

    console.log('done inside interpreter');
`;

async function run() {
    const interpreter = new Interpreter();
    const unsubscribe = interpreter.addStepper(code => console.log('going to run....', code));

    interpreter.expose({
        console,
    });

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
    interpreter.read('printer')('OUTSIDE INTERPRETER: DONE!');
}

run();
```
