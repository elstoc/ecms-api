import * as dotenv from 'dotenv';
import winston from 'winston';

import { Auth, Site } from './services';
import { getConfig } from './utils';
import { LocalFileStorageAdapter } from './adapters/LocalFileStorageAdapter';
import { createApp } from './app';

dotenv.config();
const config = getConfig();

const logger = winston.createLogger({
    level: config.logLevel,
    format: winston.format.simple(),
    transports: [
        new winston.transports.Console(),
    ]
});

const storageAdapter = new LocalFileStorageAdapter(config.dataDir, config.storageWriteUid, config.storageWriteUid);
const site = new Site(config, storageAdapter);
const auth = new Auth(config, storageAdapter);

createApp(config, site, auth).then((app) => {
    const server = app.listen(config.apiPort, () => {
        logger.info(`app started, listening on port ${config.apiPort}`);
    });
    
    const shutdown = () => {
        logger.info('Closing HTTP server');
        server.close(() => {
            logger.info('HTTP server closed, shutting down site components');
            site.shutdown().then(() => {
                logger.info('shutdown complete');
                process.exit(0);
            });
        });
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
});
