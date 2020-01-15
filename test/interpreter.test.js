import sinon from 'sinon';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { run } from '../src/interpreter';

chai.use(chaiAsPromised);

describe('interpreter', function() {
    describe('execution', function() {
        it('should correct execute code without throwing errors', async function() {
            const code = `
          const a = 1;
          const b = 2;
          const c = sum(a, b);

          function sum(a , b) {
            return a + b;
          }
        `;

            expect(run(code)).to.eventually.be.fulfilled;
        });

        it('should throw ReferenceError', async function() {
            const code = `
          const a = 1;
          const b = a + badVariable;
        `;

            return expect(run(code)).to.be.eventually.rejectedWith(
                ReferenceError,
                'badVariable'
            );
        });

        it('should throw TypeError', async function() {
            const code = `
          const a =;
        `;

            return expect(run(code)).to.be.eventually.rejectedWith(SyntaxError);
        });
    });
    describe('context tests', function() {
        it('1 should be 1', async function() {
            const callback = sinon.fake();
            const code = `callback();`;
            await run(code, { callback });
            expect(callback.called).to.be.true;
        });
    });
});
