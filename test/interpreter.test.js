import sinon from 'sinon';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import { run } from '../src/interpreter';
import { createInterpreter } from '../src/interpreter.new';

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('interpreter', function() {
    describe('execution', function() {
        it('.run() should return a promise that fulfills when execution is terminated', async function() {
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
    describe('events', function() {
        it('should call on.start event', async function() {
            const callback = sinon.fake();
            const code = `
            test();
            function test() {}
            `;

            const interpreter = createInterpreter(code, {
                on: { start: callback }
            });

            await interpreter.run();
            expect(callback).to.have.been.called;
        });
        it('should call on.exit event', async function() {
            const callback = sinon.fake();
            const code = `
            test();
            function test() {}
            `;

            const interpreter = createInterpreter(code, {
                on: { exit: callback }
            });

            await interpreter.run();
            expect(callback).to.have.been.called;
        });
        it('should not call on.exit event if execution does not terminate', async function() {
            const callback = sinon.fake();
            const code = `
            run().then(() => {
                console.log('will never be printed');
            })
            
            async function run() {
                return new Promise(() => {});
            }
            `;

            await run(code, {
                onEnd: callback
            });

            expect(callback).to.not.have.been.called;
        });
    });
    describe('context tests', function() {
        it('should be able to call outside function', async function() {
            const callback = sinon.fake();
            const code = `callback();`;
            const interpreter = createInterpreter(code, {
                context: { callback }
            });

            await interpreter.run();
            expect(callback).to.have.been.called;
        });
    });
});
