import sinon from 'sinon';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import { createInterpreter } from '../src/interpreter';

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('interpreter', function() {
    describe('execution', function() {
        it('.run() should return a promise that fulfills when interpreter finishes executing the code', async function() {
            const code = `
          const a = 1;
          const b = 2;
          const c = sum(a, b);

          function sum(a , b) {
            return a + b;
          }
        `;

            const interpreter = createInterpreter(code);
            return expect(interpreter.run(code)).to.eventually.be.fulfilled;
        });

        it('.run() should return a promise that fulfills when execution is terminated by the user', async function() {
            const code = `
            while(true) {
                await wait(5);
                
            }

            async function wait(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
        `;

            const interpreter = createInterpreter(code);
            setTimeout(() => interpreter.stop(), 100);
            return expect(interpreter.run(code)).to.eventually.be.fulfilled;
        });

        it('.run() should be able to execute async code top-level', async function() {
            const code = `
            await wait(100);

            async function wait(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
        `;

            const interpreter = createInterpreter(code);
            return expect(interpreter.run(code)).to.eventually.be.fulfilled;
        });

        it('.run() promise should never fulfill if execution is paused', async function() {
            const code = `
            await wait(50);

            async function wait(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
        `;
            const interpreter = createInterpreter(code);
            setTimeout(() => interpreter.pause(), 10);
            setTimeout(() => interpreter.resume(), 200);
            return expect(interpreter.run()).to.eventually.be.fulfilled;
        });

        it('.run() should throw ReferenceError', async function() {
            const code = `
          const a = 1;
          const b = a + badVariable;
        `;

            const interpreter = createInterpreter(code);
            return expect(interpreter.run()).to.be.eventually.rejectedWith(
                ReferenceError,
                'badVariable'
            );
        });

        it('.run() should throw SyntaxError', async function() {
            const code = `
          const a =;
        `;

            const interpreter = createInterpreter(code);
            return expect(interpreter.run()).to.be.eventually.rejectedWith(
                SyntaxError
            );
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
