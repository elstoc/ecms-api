import * as dotenv from 'dotenv';
import winston from 'winston';
import express from 'express';
import cors from 'cors';

import { createRootRouter } from './routes';
import { Auth, Site } from './services';
import { getConfig } from './utils';
import { LocalFileStorageAdapter } from './adapters/LocalFileStorageAdapter';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

const start = async () => {
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

    app.listen(apiPort, () => {
        console.log(`app started, listening on port ${apiPort}`);
    });
};

start();
