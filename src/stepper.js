export function createStepper(userStepper) {
    let stopped;
    let steppingPromise;
    let resumeSteppingPromise;
    let stopSteppingPromise;

    return {
        step: async expr => {
            await steppingPromise;

            if (stopped) {
                return Promise.reject('execution-stop');
            }

            if (userStepper) {
                await userStepper(expr);
            }

            return Promise.resolve();
        },
        stop: () => {
            stopped = true;
            if (steppingPromise && stopSteppingPromise) {
                stopSteppingPromise();
                stopSteppingPromise = null;
            }
        },
        resume: () => {
            if (!steppingPromise) {
                return;
            }

            steppingPromise = null;
            resumeSteppingPromise();

            resumeSteppingPromise = null;
            stopSteppingPromise = null;
        },
        pause: () => {
            if (steppingPromise) {
                return;
            }

            steppingPromise = new Promise((resolve, reject) => {
                resumeSteppingPromise = resolve;
                stopSteppingPromise = () => reject('execution-stop');
            });
        },
        isPaused() {
            return !!resumeSteppingPromise && !!stopSteppingPromise;
        }
    };
}
