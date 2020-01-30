const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
const Interpreter = require('../src/interpreter');

const { expect } = chai;
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

            const interpreter = new Interpreter();
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

            const interpreter = new Interpreter();
            setTimeout(() => interpreter.stop(), 100);
            return expect(interpreter.run(code)).to.eventually.be.fulfilled;
        });

        it('.run() should be able to work after stopping', async function() {
            const code = `
            await wait(15);
            await wait(15);
            await wait(15);
            await wait(15);

            async function wait(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
        `;

            const interpreter = new Interpreter();
            setTimeout(() => interpreter.stop(), 20);
            await expect(interpreter.run(code)).to.eventually.be.fulfilled;
            await expect(interpreter.run(code)).to.eventually.be.fulfilled;
        });

        it('.run() should be able to execute async code top-level', async function() {
            const code = `
            await wait(100);

            async function wait(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
        `;

            const interpreter = new Interpreter();
            return expect(interpreter.run(code)).to.eventually.be.fulfilled;
        });

        it('.run() promise should never fulfill if execution is paused', async function() {
            const code = `
            await wait(50);

            async function wait(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
        `;
            const interpreter = new Interpreter();
            setTimeout(() => interpreter.pause(), 10);
            setTimeout(() => interpreter.resume(), 200);
            return expect(interpreter.run(code)).to.eventually.be.fulfilled;
        });

        it('.run() should throw ReferenceError', async function() {
            const code = `
          const a = 1;
          const b = a + badVariable;
        `;

            const interpreter = new Interpreter();
            return expect(interpreter.run(code)).to.be.eventually.rejectedWith(
                ReferenceError,
                'badVariable'
            );
        });

        it('.run() should throw SyntaxError', async function() {
            const code = `
          const a =;
        `;

            const interpreter = new Interpreter();
            return expect(interpreter.run(code)).to.be.eventually.rejectedWith(
                SyntaxError
            );
        });

        it('should be able to run a for loop', async function() {
            const callback = sinon.fake();
            const code = `
                    callback(1);
            `;

            const interpreter = new Interpreter({
                context: { callback }
            });

            await interpreter.run(code);
            /*
            expect(callback).to.have.been.calledWith(1);
            expect(callback).to.have.been.calledWith(2);
            expect(callback).to.have.been.calledWith(3);
            expect(callback).to.have.been.calledWith(4);
            expect(callback).to.have.been.calledWith(5);
            */
        });
    });
    describe('events', function() {
        it('should call on.start event', async function() {
            const callback = sinon.fake();
            const code = `
            test();
            function test() {}
            `;

            const interpreter = new Interpreter({
                on: { start: callback }
            });

            await interpreter.run(code);
            expect(callback).to.have.been.called;
        });
        it('should call on.step event', async function() {
            const callback = sinon.fake();
            const code = `
            const firstStep = 1;
            `;

            const interpreter = new Interpreter({
                on: { step: callback }
            });

            await interpreter.run(code);
            expect(callback).to.have.been.called;
        });
        it('should call on.step event 2 times', async function() {
            const callback = sinon.fake();
            const code = `
            const firstStep = 1;
            const secondStep = 2;
            `;

            const interpreter = new Interpreter({
                on: { step: callback }
            });

            await interpreter.run(code);
            expect(callback).to.have.been.calledTwice;
        });
        it('should call on.step event 4 times', async function() {
            const callback = sinon.fake();
            const code = `
            const elements = [1, 2];
            const newElements = elements.map(e => e + 1);
            `;

            const interpreter = new Interpreter({
                on: { step: callback }
            });

            await interpreter.run(code);
            expect(callback).to.have.callCount(4);
        });
        it('should call on.exit event', async function() {
            const callback = sinon.fake();
            const code = `
            test();
            function test() {}
            `;

            const interpreter = new Interpreter({
                on: { exit: callback }
            });

            await interpreter.run(code);
            expect(callback).to.have.been.called;
        });
    });
    describe('context tests', function() {
        it('should be able to call outside function', async function() {
            const callback = sinon.fake();
            const code = `callback();`;
            const interpreter = new Interpreter({
                context: { callback }
            });

            await interpreter.run(code);
            expect(callback).to.have.been.called;
        });
    });
});
