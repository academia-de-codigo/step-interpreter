const { performance } = require('perf_hooks');
const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
const sinonChaiInOrder = require('sinon-chai-in-order').default;

const Interpreter = require('../src/interpreter');

const { expect } = chai;
chai.use(chaiAsPromised);
chai.use(sinonChai);
chai.use(sinonChaiInOrder);

describe('interpreter', function () {
    describe('execution', function () {
        it('.run() should return a promise that fulfills when interpreter finishes executing the code', async function () {
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

        it('.run() should return a promise that does not fulfill while there are active listeners', async function () {
            const code = `on('something', () => {});`;

            const interpreter = new Interpreter();
            const promise = interpreter.run(code);
            await new Promise((resolve) => setTimeout(resolve, 1000));
            expect(promise).to.not.be.fulfilled;
        });

        it('.run() should return a promise that fulfills when execution is terminated by the user', async function () {
            const code = `
            while(true) {
                const a = 1;
            }
        `;

            const interpreter = new Interpreter();
            setTimeout(() => interpreter.stop(), 200);
            await expect(interpreter.run(code)).to.eventually.be.fulfilled;
        });

        it('.run() should be able to run more code after stopping', async function () {
            const code = `
            const TIMES = 5;
            for (let i = 0; i < TIMES; i++) {
                const a = 1;
            }
        `;

            const interpreter = new Interpreter();
            setTimeout(() => interpreter.stop(), 100);
            await expect(interpreter.run(code)).to.eventually.be.fulfilled;
            await expect(interpreter.run(code)).to.eventually.be.fulfilled;
        });

        it('.run() should be able to execute async code top-level', async function () {
            const code = `
            const a = 1;
            await run();
            const b = 2;

            async function run() {}
        `;

            const interpreter = new Interpreter();
            return expect(interpreter.run(code)).to.eventually.be.fulfilled;
        });

        it('.run() promise should never fulfill if execution is paused', async function () {
            const code = `
            const TIMES = 5;
            for (let i = 0; i < TIMES; i++) {
                const a = 1;
            }
        `;
            const interpreter = new Interpreter();
            setTimeout(() => interpreter.pause(), 10);
            setTimeout(() => interpreter.resume(), 200);
            return expect(interpreter.run(code)).to.eventually.be.fulfilled;
        });

        it('.run() should throw ReferenceError', async function () {
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

        it('.run() should throw SyntaxError', async function () {
            const code = `
          const a =;
        `;

            const interpreter = new Interpreter();
            return expect(interpreter.run(code)).to.be.eventually.rejectedWith(
                SyntaxError
            );
        });

        it('should be able to run a for loop', async function () {
            const callback = sinon.fake();
            const code = `
            for(let i = 0; i < 5; i++) {
                callback(i);
            }
            `;

            const interpreter = new Interpreter({
                context: { callback }
            });

            await interpreter.run(code);
            expect(callback).to.have.been.calledWith(0);
            expect(callback).to.have.been.calledWith(1);
            expect(callback).to.have.been.calledWith(2);
            expect(callback).to.have.been.calledWith(3);
            expect(callback).to.have.been.calledWith(4);
            expect(callback).to.have.been.callCount(5);
        });

        it('should be protected against infinite while loops', async function () {
            const code = `
            while(true) {}
        `;

            const interpreter = new Interpreter();
            setTimeout(() => interpreter.stop(), 200);
            await expect(interpreter.run(code)).to.eventually.be.fulfilled;
        });

        it('should be protected against infinite for loops', async function () {
            const code = `
            for (;;) {}
        `;

            const interpreter = new Interpreter();
            setTimeout(() => interpreter.stop(), 200);
            await expect(interpreter.run(code)).to.eventually.be.fulfilled;
        });

        it('should be able to control step time while running', async function () {
            const INITIAL_STEP_TIME = 100;

            const code = `
            for (let i = 0; i < 2; i++) {
                const a = 1;
            }
        `;

            const interpreter = new Interpreter({
                stepTime: INITIAL_STEP_TIME
            });
            setTimeout(() => interpreter.setStepTime(1), 10);
            const before = performance.now();
            await expect(interpreter.run(code)).to.eventually.be.fulfilled;
            const after = performance.now();

            expect(before - after).to.be.lessThan(INITIAL_STEP_TIME * 2);
        });

        it('should be able to execute code in parallel', async function () {
            const logger = sinon.fake();
            const parallel = sinon.spy((...fns) =>
                Promise.all(fns.map((f) => f()))
            );

            const code = `
                function thread1() {
                    logger('thread1:starting')
                    let times = 10;
                    while(times > 0) {
                        times--;
                    }
                    logger('thread1:ending')
                }

                function thread2() {
                    logger('thread2:starting')
                    logger('thread2:ending')
                }

                logger('starting');
                parallel(thread1, thread2);
                logger('ending');
            `;

            const interpreter = new Interpreter({
                context: { logger, parallel }
            });

            await interpreter.run(code);
            expect(parallel).to.have.been.called;
            expect(logger)
                .inOrder.to.have.been.calledWith('starting')
                .subsequently.calledWith('thread1:starting')
                .subsequently.calledWith('thread2:starting')
                .subsequently.calledWith('thread2:ending')
                .subsequently.calledWith('thread1:ending')
                .subsequently.calledWith('ending');
        });
        it('should be able to wait before all active listeners are finished', async function () {
            const eventHandler = sinon.fake();
            const emptyStack = sinon.fake();
            const executionEnd = sinon.fake();
            const code = `
                once('test', eventHandler);
                emptyStack();
            `;

            const interpreter = new Interpreter({
                context: { eventHandler, emptyStack },
                on: { exit: executionEnd }
            });

            await interpreter.run(code, {
                onEmptyStack: () => interpreter.emit('test')
            });
            expect(emptyStack).to.have.been.called;
            expect(eventHandler).to.have.been.called;
            expect(executionEnd).to.have.been.called;
            expect(eventHandler).to.have.been.calledAfter(emptyStack);
            expect(executionEnd).to.have.been.calledAfter(eventHandler);
        });
    });
    describe('events', function () {
        it('should call on.start event', async function () {
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
        it('should fire on.step event with next expression', async function () {
            const callback = sinon.fake();
            const code = `const firstStep = 1;`;

            const interpreter = new Interpreter({
                on: { step: callback }
            });

            await interpreter.run(code);
            expect(callback).to.have.been.calledWith('const firstStep = 1;');
        });
        it('should call on.step event 2 times', async function () {
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
        it('should call on.step event 4 times', async function () {
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
        it('should call on.exit event', async function () {
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
        it('should be able to emit events from outside', async function () {
            const callback = sinon.fake();
            const code = `once('test', callback)`;

            const interpreter = new Interpreter({ context: { callback } });
            await interpreter.run(code, {
                onEmptyStack: () => interpreter.emit('test')
            });
            expect(callback).to.have.been.called;
        });
    });
    describe.only('async array operations', function () {
        it('should provide async version of Array.prototype.map', async function () {
            const verifier = sinon.fake();
            const code = `
                const array = [1,2,3];
                const transformed = array.map(element => {
                    return await (element + 0);
                });
                verifier(transformed);
            `;

            const interpreter = new Interpreter({ context: { verifier } });
            await interpreter.run(code);
            expect(verifier).to.have.been.calledWithExactly([1, 2, 3]);
        });
        it('should provide async version of Array.prototype.forEach', async function () {
            const callback = sinon.fake();
            const verifier = sinon.fake();
            const code = `
                const array = [1,2,3];

                array.forEach(element => callback(element));
                verifier();
            `;

            const interpreter = new Interpreter({
                context: { callback, verifier }
            });
            await interpreter.run(code);
            expect(verifier).to.have.been.calledAfter(callback);
            expect(callback).to.not.have.been.calledAfter(verifier);
        });
        it('should provide async version of Array.prototype.filter', async function () {
            const verifier = sinon.fake();
            const code = `
                const array = [1,2,3];
                const filtered = array.filter(element => element < 2);
                verifier(filtered);
            `;

            const interpreter = new Interpreter({ context: { verifier } });
            await interpreter.run(code);
            expect(verifier).to.have.been.calledOnceWithExactly([1]);
        });
        it('should provide async version of Array.prototype.reduce', async function () {
            const verifier = sinon.fake();
            const code = `
                const array = [1,2,3];
                const sum = array.reduce((acc, element) => acc + element);
                verifier(sum);
            `;

            const interpreter = new Interpreter({ context: { verifier } });
            await interpreter.run(code);
            expect(verifier).to.have.been.calledOnceWithExactly(6);
        });
        it('should provide async version of Array.prototype.find', async function () {
            const verifier = sinon.fake();
            const code = `
                const array = [1,2,3];
                const found = array.find(element => element === 2);
                verifier(found);
            `;

            const interpreter = new Interpreter({ context: { verifier } });
            await interpreter.run(code);
            expect(verifier).to.have.been.calledOnceWithExactly(2);
        });
        it('should provide async versions of array operations as globals for usage with external arrays', async function () {
            const verifier = sinon.fake();
            const array = [1, 2, 3];
            const code = `
                const found = _find(element => element === 2, array);
                const mapped = _map(element => element + 1, array);
                const filtered = _filter(element => element > 1, array);
                const reduced = _reduce((acc, element) => element + acc, 0, array);
                verifier(found, mapped, filtered, reduced);
            `;

            const interpreter = new Interpreter({
                context: { verifier, array }
            });
            await interpreter.run(code);
            expect(verifier).to.have.been.calledOnceWithExactly(
                2,
                [2, 3, 4],
                [2, 3],
                6
            );
        });
    });

    describe('context tests', function () {
        it('should be able to call outside function', async function () {
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
