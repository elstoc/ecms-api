import { Gallery } from './utils';
import { getConfig } from './utils/config';

const start = async () => {
    const config = getConfig();
    const gallery = new Gallery(config);
    console.log(`started with content dir: ${config.contentDir}`);
};

start();
