/* eslint-disable no-console */
const { execute } = require('../src');

const code = `
    once('run', () => {
        console.log('i was run');
    });

    once('piriquito', () => {
        console.log('piu piu');
    });

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
    const execution = execute(code);
    execution.onFinish(() => console.log('REALLY FINISHED'));

    setTimeout(() => execution.stop(), 5000);
}

run();
