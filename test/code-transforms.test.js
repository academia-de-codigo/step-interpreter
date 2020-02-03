const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
const { prepare, toES2015 } = require('../src/code-transforms');

const { expect } = chai;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('code-transforms', function() {
    it('should wrap code in async function', function() {
        const input = `const a = 1;`;
        const output = /async function main\(\) \{.+\}/s;
        expect(prepare(input)).to.match(output);
    });
    it('should transform normal functions into async functions', function() {
        const input = `function test() {}`;
        const output = `async function test() {}`;
        expect(prepare(input)).to.include(output);
    });
    it('should inject steps before declarations', function() {
        const input = `const a = 1;`;
        const step = 'await step(`const a = 1;`);';
        expect(prepare(input)).to.include(step);
    });
    it('should inject steps before declarations inside functions', function() {
        const input = `function test() { const a = 1; }`;
        const step = 'await step(`const a = 1;`);';
        expect(prepare(input)).to.include(step);
    });
    it('should inject steps before declarations inside for loops', function() {
        const input = `for(let i = 0; i < 1; i++) { const a = 1; }`;
        const step = 'await step(`const a = 1;`);';
        expect(prepare(input)).to.include(step);
    });
    it('should inject steps before declarations inside while loops', function() {
        const input = `while(true) { const a = 1; }`;
        const step = 'await step(`const a = 1;`);';
        expect(prepare(input)).to.include(step);
    });
    it('should inject step call with the next expression as argument', function() {
        const input = `const a = 1;`;
        const step = 'await step(`const a = 1;`);';
        expect(prepare(input)).to.include(step);
    });
    it('should inject step call with the next block code as argument (without that block steps)', function() {
        const input = `while (true) { console.log('hey!'); }`;
        const output = /await step\(`while \(true\) {\s+console\.log\('hey!'\);\s+}`\)/s;
        expect(prepare(input)).to.match(output);
    });
    it('should inject step calls inside anonymous callback functions', async function() {
        const input = `
        const a = [1, 2];
        const b = a.map(function(element) {
            console.log(element);
        });
        `;
        const step = 'await step(`console.log(element);`)';
        expect(prepare(input)).to.include(step);
    });
    it('should inject step calls inside arrow functions with body', async function() {
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
    it('should inject step calls inside arrow functions with implicit return', async function() {
        const input = `
        const a = [1, 2];
        const b = a.map(element => element + 1);
        `;

        const step = 'await step(`element + 1`);';
        expect(prepare(input)).to.include(step);
    });
    it('should be able to transpile to es2015', async function() {
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
        const transformed = toES2015(prepare(input));
        expect(transformed).to.match(output);
        expect(transformed).to.match(output2);
    });
});
