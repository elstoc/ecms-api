import * as dotenv from 'dotenv';
import winston from 'winston';
import express from 'express';
import cors from 'cors';

import { createRootRouter } from './routes';
import { Auth, Site } from './services';
import { getConfig } from './utils';
import { LocalFileStorageAdapter } from './adapters/LocalFileStorageAdapter';

dotenv.config();

const config = getConfig();

const logger = winston.createLogger({
    level: config.logLevel,
    format: winston.format.simple(),
    transports: [
        new winston.transports.Console(),
    ]
});

const storageAdapter = new LocalFileStorageAdapter(config.dataDir);
const site = new Site(config, storageAdapter);
const auth = new Auth(config, storageAdapter);

const rootRouter = createRootRouter(logger, site, auth);

const { apiPort, uiUrl } = config;
const app = express();
app.use(cors({ origin: [uiUrl], credentials: true }));
app.use('/', rootRouter);

const server = app.listen(apiPort, () => {
    console.log(`app started, listening on port ${apiPort}`);
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
    });
});
