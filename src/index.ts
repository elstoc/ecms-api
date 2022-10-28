import { getConfig } from './utils/config';

const start = async () => {
    const config = getConfig();
    console.log(`started with content dir: ${config.contentDir}`);
};

start();
