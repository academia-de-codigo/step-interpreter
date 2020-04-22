const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
const { prepare, toES2015 } = require('../src/code-transforms');

const { expect } = chai;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('code-transforms', function () {
    describe('sync to async', function () {
        it('should wrap code in async function', function () {
            const input = `const a = 1;`;
            const output = /async function main\(\) \{.+\}/s;
            expect(prepare(input)).to.match(output);
        });
        it('should transform named functions into async functions', function () {
            const input = `function test() {}`;
            const output = `async function test() {}`;
            expect(prepare(input)).to.include(output);
        });
        it('should transform named arrow functions into async functions', function () {
            const input = `const test = () => {}`;
            const output = `const test = async () => {}`;
            expect(prepare(input)).to.include(output);
        });
        it('should transform anonymous functions into async functions', function () {
            const input = `array.map(function(element) {
                return element;
            })`;
            const output = /async function\s*\(element\)\s*\{.+\}/s;
            expect(prepare(input)).to.match(output);
        });
        it('should transform anonymous arrow functions into async functions', function () {
            const input = `array.map(element => {
                return element;
            })`;
            const output = /async\s*element\s*=>\s*\{.+\}/s;
            expect(prepare(input)).to.match(output);
        });
        it('should transform anonymous arrow functions with implicit return into async functions', function () {
            const input = `array.map(element => element);`;
            const output = /async\s*element\s*=>\s*.+/s;
            expect(prepare(input)).to.match(output);
        });
        it('should wrap function calls with await', function () {
            const input = `hello('world')`;
            const output = `await hello('world');`;
            expect(prepare(input)).to.include(output);
        });
        it('should wrap "method" calls with await', function () {
            const input = `console.log()`;
            const output = `await console.log();`;
            expect(prepare(input)).to.include(output);
        });
        it('should wrap argument function calls with await', function () {
            const input = `console.log(hello('world'), goodbye('world'));`;
            const output = `await console.log((await hello('world')), (await goodbye('world')));`;
            expect(prepare(input)).to.include(output);
        });
    });

    describe('step injection', function () {
        it('should inject steps before declarations', function () {
            const input = `const a = 1;`;
            const step = 'await step(`const a = 1;`);';
            expect(prepare(input)).to.include(step);
        });
        it('should inject steps before declarations inside functions', function () {
            const input = `function test() { const a = 1; }`;
            const step = 'await step(`const a = 1;`);';
            expect(prepare(input)).to.include(step);
        });
        it('should inject steps before declarations inside for loops', function () {
            const input = `for(let i = 0; i < 1; i++) { const a = 1; }`;
            const step = 'await step(`const a = 1;`);';
            expect(prepare(input)).to.include(step);
        });
        it('should inject steps before declarations inside while loops', function () {
            const input = `while(true) { const a = 1; }`;
            const step = 'await step(`const a = 1;`);';
            expect(prepare(input)).to.include(step);
        });
        it('should inject step call with the next block code as argument (without that block steps)', function () {
            const input = `while (true) { console.log('hey!'); }`;
            const output = /await step\(`while \(true\) {\s+console\.log\('hey!'\);\s+}`\)/s;
            expect(prepare(input)).to.match(output);
        });
        it('should inject step calls inside anonymous callback functions', async function () {
            const input = `
            const a = [1, 2];
            const b = a.map(function(element) {
                console.log(element);
            });
            `;
            const step = 'await step(`console.log(element);`)';
            expect(prepare(input)).to.include(step);
        });
        it('should inject step calls inside arrow functions with body', async function () {
            const input = `
            const a = [1, 2];
            const b = a.map(element => {
                console.log(element);
                return element + 1;
            });
            `;

            const step1 = 'await step(`console.log(element);`)';
            const step2 = 'await step(`return element + 1;`)';
            expect(prepare(input)).to.include(step1);
            expect(prepare(input)).to.include(step2);
        });
        it('should inject step calls inside arrow functions with implicit return', async function () {
            const input = `
            const a = [1, 2];
            const b = a.map(element => element + 1);
            `;

            const step = 'await step(`element + 1`);';
            expect(prepare(input)).to.include(step);
        });
        it('should inject step calls inside with blocks', async function () {
            const input = `
            with (context) {
                const a = [1, 2];
            }
            `;

            const step = 'await step(`const a = [1, 2];`);';
            expect(prepare(input)).to.include(step);
        });
    });
    describe('es2015 transpilation', function () {
        it('should be able to transpile to es2015', async function () {
            const input = `
            const a = [1, 2];
    
            const b = {
                c() {
                    console.log('im b!');
                }
            }
            `;

            const output = /var a/;
            const output2 = /function c/;
            const transformed = toES2015(input);
            expect(transformed).to.match(output);
            expect(transformed).to.match(output2);
        });
    });
});
