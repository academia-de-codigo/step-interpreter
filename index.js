const Interpreter = require('./src/interpreter');

exports.Interpreter = Interpreter;

const code = `
    const a = 1;
    const b = 2;

    for (let i = 0; i < 5; i++) {
        console.log(sum(a, b, i));
    }

    function sum(...args) {
        return args.reduce((acc, value) => {
            return acc + value;
        }, 0);
    }
`;

run();
async function run() {
    const interpreter = new Interpreter();
    console.log('starting..');
    await interpreter.run(code);
    console.log('done!');
}
