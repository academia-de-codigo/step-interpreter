const sinon = require('sinon');
const { performance } = require('perf_hooks');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
const Stepper = require('../src/stepper');

const { expect } = chai;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('stepper', function () {
    describe('setup', function () {
        it('should be able to be built without args', function () {
            const buildStepper = () => new Stepper();
            expect(buildStepper).to.not.throw();
        });
    });
    describe('stepping', function () {
        it('should resolve in configured step time', async function () {
            const stepTime = 50;
            // rename this variable
            const allowedDifferenceMs = 10;
            const stepper = new Stepper({ stepTime });

            const before = performance.now();
            await stepper.step();
            const after = performance.now();

            expect(after - before).to.be.greaterThan(
                stepTime - allowedDifferenceMs
            );
            expect(after - before).to.be.lessThan(
                stepTime + allowedDifferenceMs
            );
        });

        it('should be able to be destroyed', async function () {
            const stepTime = 200;
            const stepper = new Stepper({ stepTime });

            setTimeout(() => stepper.destroy(), 10);
            const before = performance.now();
            await expect(stepper.step()).to.be.eventually.rejectedWith(
                'stepper-destroyed'
            );
            const after = performance.now();

            expect(after - before).to.be.lessThan(stepTime);
        });

        it('should not be able to step again after being destroyed', async function () {
            const stepTime = 200;
            const stepper = new Stepper({ stepTime });

            setTimeout(() => stepper.destroy(), 10);

            const before = performance.now();
            await expect(stepper.step()).to.be.eventually.rejectedWith(
                'stepper-destroyed'
            );
            const after = performance.now();
            expect(after - before).to.be.lessThan(stepTime);

            await expect(stepper.step()).to.be.eventually.rejectedWith(
                'stepper-destroyed'
            );
            await expect(stepper.step()).to.be.eventually.rejectedWith(
                'stepper-destroyed'
            );
        });

        it('should be able to be paused', async function () {
            // pausing the stepper for a bigger time than its step time
            // should be enough to understand if it has indeed been paused
            // we use a small stepTime and a big pauseTime and make sure
            // the actual step time was bigger than both step time and pausedTime
            const stepTime = 20;
            const stepper = new Stepper({ stepTime });

            // rename this variable
            const pauseAtMs = 10;
            const pauseForMs = 100;

            setTimeout(() => stepper.pause(), pauseAtMs);
            setTimeout(() => stepper.resume(), pauseAtMs + pauseForMs);

            const before = performance.now();
            await expect(stepper.step()).to.be.eventually.fulfilled;
            const after = performance.now();

            expect(after - before).to.be.greaterThan(stepTime);
            expect(after - before).to.be.greaterThan(pauseForMs);
        });

        it('should be able to be destroyed while paused', async function () {
            const stepTime = 50;
            const stepper = new Stepper({ stepTime });

            setTimeout(() => stepper.pause(), 10);
            setTimeout(() => stepper.destroy(), 100);

            const before = performance.now();
            await expect(stepper.step()).to.be.eventually.rejectedWith(
                'stepper-destroyed'
            );
            const after = performance.now();

            expect(after - before).to.be.greaterThan(stepTime);
        });

        it('pausing multiple times should have no effect', async function () {
            const stepTime = 20;
            const stepper = new Stepper({ stepTime });

            // rename this variable
            const pauseAtMs = 10;
            const pauseForMs = 100;

            setTimeout(() => stepper.pause(), pauseAtMs);
            setTimeout(() => stepper.pause(), pauseAtMs + 5);
            setTimeout(() => stepper.pause(), pauseAtMs + 10);
            setTimeout(() => stepper.resume(), pauseAtMs + pauseForMs);

            const before = performance.now();
            await expect(stepper.step()).to.be.eventually.fulfilled;
            const after = performance.now();

            expect(after - before).to.be.greaterThan(stepTime);
            expect(after - before).to.be.greaterThan(pauseForMs);
        });

        it('resuming multiple times should have no effect', async function () {
            const stepTime = 20;
            const stepper = new Stepper({ stepTime });

            // rename this variable
            const pauseAtMs = 10;
            const pauseForMs = 100;

            setTimeout(() => stepper.pause(), pauseAtMs);
            setTimeout(() => stepper.resume(), pauseAtMs + pauseForMs);
            setTimeout(() => stepper.resume(), pauseAtMs + pauseForMs + 1);
            setTimeout(() => stepper.resume(), pauseAtMs + pauseForMs + 2);

            const before = performance.now();
            await expect(stepper.step()).to.be.eventually.fulfilled;
            const after = performance.now();

            expect(after - before).to.be.greaterThan(stepTime);
            expect(after - before).to.be.greaterThan(pauseForMs);
        });
    });

    describe('events', function () {
        it('should emit step event with arguments', async function () {
            const stepTime = 5;
            const stepper = new Stepper({ stepTime });
            const callback = sinon.fake();
            stepper.on('step', callback);

            await stepper.step('expression');
            expect(callback).to.have.been.calledWith('expression');
        });
    });
});
