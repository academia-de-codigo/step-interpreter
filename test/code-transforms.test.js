import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import { prepare } from '../src/code-transforms';

const { expect } = chai;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('code-transforms', function() {
    it('should wrap code in async function', function() {
        const input = `const a = 1;`;
        const output = /async function main\(\) {.+}/s;

        expect(prepare(input)).to.match(output);
    });
    it('should transform normal functions into async functions', function() {
        const input = `function test() {}`;
        const output = `async function test() {}`;

        expect(prepare(input)).to.include(output);
    });
    it('should inject steps before declarations', function() {
        const input = `const a = 1;`;
        const output = /await step\(.+\);\s+const a = 1;/;

        expect(prepare(input)).to.match(output);
    });
    it('should inject steps before declarations inside functions', function() {
        const input = `function test() { const a = 1; }`;
        const output = /await step\(.+\);\s+const a = 1;/;

        expect(prepare(input)).to.match(output);
    });
    it('should inject steps before declarations inside for loops', function() {
        const input = `for(let i = 0; i < 1; i++) { const a = 1; }`;
        const output = /await step\(.+\);\s+const a = 1;/;

        expect(prepare(input)).to.match(output);
    });
    it('should inject steps before declarations inside while loops', function() {
        const input = `while(true) { const a = 1; }`;
        const output = /await step\(.+\);\s+const a = 1;/;

        expect(prepare(input)).to.match(output);
    });
    it('should inject step call with the next expression as argument', function() {
        const input = `const a = 1;`;
        const output = /await step\(`const a = 1;`\);\s+const a = 1;/;

        expect(prepare(input)).to.match(output);
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
        const output = /await\s+step\(`console.log\(element\);`\);\s+console.log\(element\);/;
        expect(prepare(input)).to.match(output);
    });
    it('should inject step calls inside arrow functions with body', async function() {
        const input = `
        const a = [1, 2];
        const b = a.map(element => {
            console.log(element);
            return element + 1;
        });
        `;

        const output = /await\s+step\(`console.log\(element\);`\);\s+console.log\(element\);/;
        expect(prepare(input)).to.match(output);
    });
    it('should inject step calls inside arrow functions with implicit return', async function() {
        const input = `
        const a = [1, 2];
        const b = a.map(element => element + 1);
        `;

        const output = /await step\(`return element \+ 1;`\);\s+return element \+ 1;/;
        console.log('output:', prepare(input));
        expect(prepare(input)).to.match(output);
    });
});
