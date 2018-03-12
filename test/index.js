const Interpreter = require('../src/interpreter');
const interpreter = new Interpreter();

const code = `
    const a = 1;
    const b = 2;
    const s = sum(a, b);
    console.log(s);

    sayHello();
    console.log('the sum of 10 and 5 is', sum(10, 5));

    faster();
    for (let i = 0; i < 5; i++) {
        console.log('inside for, i:', i);
    }
    slower();

    console.log('for is done');
    defer(sayHello, 1000);

    function sum(a, b) {
        return a + b;
    }

    function sayHello() {
        console.log('hello');
    }

`;

async function run() {
    const unsubscribe = interpreter.addStepper(code =>
        console.log('going to run....', code)
    );

    interpreter.expose({
        console,
        faster: () => {
            interpreter.setStepInterval(100);
        },
        slower: () => {
            interpreter.setStepInterval(1000);
        },
        defer: setTimeout
    });

    setTimeout(unsubscribe, 5000);
    await interpreter.run(code);
    console.log('done');
}

run();
