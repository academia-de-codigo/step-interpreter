/* eslint-disable no-console */
const Interpreter = require('../src/interpreter');

const code = `
    const a = 1;
    const b = 2;
    slower();
    const s = sum(a, b);
    console.log(s);

    sayHello();
    console.log('the sum of 10 and 5 is', sum(10, 5));

    faster();
    for (let i = 0; i < 5; i++) {
        console.log('inside for, i:', i);
    }

    console.log('for is done');
    defer(sayHello, 2000);

    function sum(a, b) {
        return a + b;
    }

    function sayHello() {
        console.log('hello');
    }

    this.printer = function(string) {
        console.log('I print I print:', string);
    }

    console.log('done inside interpreter');
`;

async function run() {
    const interpreter = new Interpreter();
    const unsubscribe = interpreter.addStepper(code => console.log('going to run....', code));

    interpreter.expose({
        console,
        faster: () => {
            interpreter.setStepInterval(100);
        },
        slower: () => {
            interpreter.setStepInterval(1000);
        },
        defer: setTimeout,
    });

    setTimeout(() => {
        console.log('pausing interpreter...');
        interpreter.pause();
    }, 5000);

    setTimeout(() => {
        console.log('unsubscribing stepper...');
        unsubscribe();
        console.log('resuming interpreter...');
        interpreter.resume();
    }, 7000);

    await interpreter.run(code);
    interpreter.read('printer')('OUTSIDE INTERPRETER: DONE!');
}

run();
