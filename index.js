import { createInterpreter } from './src/interpreter';

export { createInterpreter };

const i = createInterpreter(`console.log('ho');`);
i.run();
