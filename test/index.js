/* eslint-disable no-console */
const Interpreter = require('../src');

const code = `
    on('patxoca', () => {
        console.log('patxoca');
    })
    const a = 1;
    const b = 2;
    const s = sum(a, b);
    console.log(s);

    sayHello();
    console.log('the sum of 10 and 5 is', sum(10, 5));

    for (let i = 0; i < 5; i++) {
        console.log('inside for, i:', i);
    }

    console.log('for is done');

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
    setTimeout(() => {
        interpreter.pause();
        setTimeout(() => interpreter.resume(), 5000);
    }, 5000);
    await interpreter.run(code);
    console.log('done outside interpreter!');
}

run();
