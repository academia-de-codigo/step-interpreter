const { performance } = require('perf_hooks');
const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
const sinonChaiInOrder = require('sinon-chai-in-order').default;

const { run } = require('../src/interpreter');

const { expect } = chai;
chai.use(chaiAsPromised);
chai.use(sinonChai);
chai.use(sinonChaiInOrder);

describe('interpreter', function () {
    describe('execution', function () {
        it('run() should return a promise that fulfills when stack is empty', async function () {
            const code = `
          const a = 1;
          const b = 2;
          const c = sum(a, b);

          function sum(a , b) {
            return a + b;
          }
        `;

            await expect(run(code)).to.eventually.be.fulfilled;
        });

        it('run() promise should include extra properties intended execution control', async function () {
            const code = ``;

            expect(run(code)).to.include.keys(
                'pause',
                'stop',
                'resume',
                'promises',
                'setStepTime',
                'on',
                'emit',
                'once',
                'off',
                'getActiveListeners'
            );
        });

        it('onExecutionEndPromise should only be fulfilled when there are no more active event handlers', async function () {
            const code = `
            const dispose = events.on('hanging', () => {});
            events.once('dispose', dispose);
          `;

            const execution = run(code);
            const { promises } = execution;
            const { executionEnd } = promises;
            await expect(execution).to.eventually.be.fulfilled;
            execution.emit('dispose');
            await expect(executionEnd).to.eventually.be.fulfilled;
        });

        it('run() promises should be fulfilled when user stops execution', async function () {
            const code = `
            while(true) {
                const a = 1;
            }
        `;

            const execution = run(code);
            setTimeout(() => execution.stop(), 200);
            const { promises } = execution;
            const { executionEnd } = promises;
            await expect(execution).to.eventually.be.fulfilled;
            await expect(executionEnd).to.eventually.be.fulfilled;
        });

        it('run() should be able to execute async code top-level', async function () {
            const code = `
            const a = 1;
            await run();
            const b = 2;

            async function run() {}
        `;

            const execution = run(code);
            const { promises } = execution;
            const { executionEnd } = promises;
            await expect(execution).to.eventually.be.fulfilled;
            await expect(executionEnd).to.eventually.be.fulfilled;
        });

        it('run() execution promise should not fulfill while execution is paused', async function () {
            const code = `
            const TIMES = 5;
            for (let i = 0; i < TIMES; i++) {
                const a = 1;
            }
        `;

            const execution = run(code);
            const { promises } = execution;
            const { executionEnd } = promises;
            setTimeout(() => execution.pause(), 10);
            setTimeout(() => execution.resume(), 200);
            await expect(execution).to.eventually.be.fulfilled;
            await expect(executionEnd).to.eventually.be.fulfilled;
        });

        it('run() should pipe ReferenceErrors in code through both promises', async function () {
            const code = `
          const a = 1;
          const b = a + badVariable;
        `;

            const execution = run(code);
            const { promises } = execution;
            const { executionEnd } = promises;

            expect(execution).to.be.eventually.rejectedWith(
                ReferenceError,
                'badVariable'
            );
            expect(executionEnd).to.be.eventually.rejectedWith(
                ReferenceError,
                'badVariable'
            );
        });

        it('run() should throw on SyntaxErrors', async function () {
            const code = `
          const a =;
        `;

            expect(() => run(code)).to.throw(SyntaxError);
        });

        it('should be able to run a for loop', async function () {
            const callback = sinon.fake();
            const code = `
            for(let i = 0; i < 5; i++) {
                callback(i);
            }
            `;

            await run(code, { context: { callback } });
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

            const execution = run(code);
            setTimeout(() => execution.stop(), 200);
            await expect(execution).to.eventually.be.fulfilled;
        });

        it('should be protected against infinite for loops', async function () {
            const code = `
            for (;;) {}
        `;

            const execution = run(code);
            setTimeout(() => execution.stop(), 200);
            await expect(execution).to.eventually.be.fulfilled;
        });

        it('should be able to control step time while running', async function () {
            const INITIAL_STEP_TIME = 100;

            const code = `
            for (let i = 0; i < 2; i++) {
                const a = 1;
            }
        `;

            const before = performance.now();
            const execution = run(code, { stepTime: INITIAL_STEP_TIME });
            setTimeout(() => execution.setStepTime(1), 10);
            await expect(execution).to.eventually.be.fulfilled;
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

            await run(code, { context: { logger, parallel } });
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
            const code = `
                events.once('test', eventHandler);
                emptyStack();
            `;

            const execution = run(code, {
                context: { eventHandler, emptyStack }
            });
            await execution;
            execution.emit('test');
            await execution.promises.executionEnd;

            expect(emptyStack).to.have.been.called;
            expect(eventHandler).to.have.been.called;
            expect(eventHandler).to.have.been.calledAfter(emptyStack);
        });

        it('sync mode support', async function () {
            var NR_CALLS = 20;
            var callback = sinon.fake();
            var finalCallback = sinon.fake();

            const code = `
                for(var i = 0; i < NR_CALLS; i++) {
                    callback();
                }

                finalCallback();
            `;

            const execution = run(code, {
                sync: true,
                context: { NR_CALLS, callback, finalCallback }
            });
            expect(execution).to.be.undefined;
            expect(finalCallback).to.have.been.calledOnce;
            expect(callback).to.have.callCount(NR_CALLS);
        });
    });
    describe('events', function () {
        it('should call on.start event', async function () {
            const callback = sinon.fake();
            const code = `
            test();
            function test() {}
            `;

            await run(code, { on: { start: callback } });
            expect(callback).to.have.been.called;
        });
        it('should fire on.step event with next expression', async function () {
            const callback = sinon.fake();
            const code = `const firstStep = 1;`;

            await run(code, { on: { step: callback } });
            expect(callback).to.have.been.calledWith('const firstStep = 1;');
        });
        it('should call on.step event 2 times', async function () {
            const callback = sinon.fake();
            const code = `
            const firstStep = 1;
            const secondStep = 2;
            `;

            await run(code, { on: { step: callback } });
            expect(callback).to.have.been.calledTwice;
        });
        it('should call on.step event 4 times', async function () {
            const callback = sinon.fake();
            const code = `
            const elements = [1, 2];
            const newElements = elements.map(e => e + 1);
            `;

            await run(code, { on: { step: callback } });
            expect(callback).to.have.callCount(4);
        });
        it('should call on.exit event', async function () {
            const callback = sinon.fake();
            const code = `
            test();
            function test() {}
            `;

            await run(code, { on: { exit: callback } });
            expect(callback).to.have.been.called;
        });
        it('should be able to emit events from outside', async function () {
            const callback = sinon.fake();
            const code = `events.once('test', callback)`;

            const execution = run(code, { context: { callback } });
            await execution;
            execution.emit('test');
            expect(callback).to.have.been.called;
        });
        it('should be able to pass arguments from emitted events', async function () {
            const callback = sinon.fake();
            const eventArg = 'test';
            const code = `
		function resolve(arg) {
		    callback(arg); 
	    	}

		events.once('test', arg => {
                    resolve(arg)}
                )
	`;

            const execution = run(code, { context: { callback } });
            await execution;
            execution.emit('test', eventArg);
            await execution.promises.executionEnd;
            expect(callback).to.have.been.calledWith(eventArg);
        });
    });
    describe('async array operations', function () {
        it('should provide async version of Array.prototype.map', async function () {
            const verifier = sinon.fake();
            const code = `
                const array = [1,2,3];
                const transformed = array.map(element => {
                    return await (element + 0);
                });
                verifier(transformed);
            `;

            const execution = run(code, { context: { verifier } });
            await execution;
            expect(verifier).to.have.been.calledWithExactly([1, 2, 3]);
        });
        it('should provide async version of Array.prototype.forEach', async function () {
            const callback = sinon.fake();
            const verifier = sinon.fake();
            const code = `
                const array = [1,2,3];

                array.forEach(callback);
                verifier();
            `;

            const execution = run(code, { context: { verifier, callback } });
            await execution;
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

            const execution = run(code, { context: { verifier } });
            await execution;
            expect(verifier).to.have.been.calledOnceWithExactly([1]);
        });
        it('should provide async version of Array.prototype.reduce', async function () {
            const verifier = sinon.fake();
            const code = `
                const array = [1,2,3];
                const sum = array.reduce((acc, element) => acc + element);
                verifier(sum);
            `;

            const execution = run(code, { context: { verifier } });
            await execution;
            expect(verifier).to.have.been.calledOnceWithExactly(6);
        });
        it('should provide async version of Array.prototype.find', async function () {
            const verifier = sinon.fake();
            const code = `
                const array = [1,2,3];
                const found = array.find(element => element === 2);
                verifier(found);
            `;

            const execution = run(code, { context: { verifier } });
            await execution;
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

            const execution = run(code, { context: { verifier, array } });
            await execution;
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

            const execution = run(code, { context: { callback } });
            await execution;
            expect(callback).to.have.been.called;
        });
        it('should be able to call created function from outside', async function () {
            const callback = sinon.fake();
            const code = `
                externals.callme = function() {
                    callback();
                    callback();
                    callback();
                }
            `;

            const execution = run(code, {
                context: { callback, externals: {} },
                destroyStepper: false
            });
            const { executionEnd } = execution.promises;
            await execution;
            await executionEnd;
            await execution.context.externals.callme();
            expect(callback).to.have.been.calledThrice;
        });
        it('should be able to call created functions from outside', async function () {
            const callback = sinon.fake();
            const code = `
            const fn1 = () => {
                callback();
            };

            const fn2 = () => {
                callback();
            };

            functions.push(fn1);
            functions.push(fn2);
            `;

            const execution = run(code, {
                context: { callback, functions: [] },
                destroyStepper: false
            });
            const { executionEnd } = execution.promises;
            await execution;
            await executionEnd;
            await Promise.all(execution.context.functions.map((f) => f()));
            expect(callback).to.have.been.calledTwice;
            execution.stop();
        });
    });
});
