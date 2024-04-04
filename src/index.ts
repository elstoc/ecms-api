import * as dotenv from 'dotenv';
import winston from 'winston';
import express from 'express';
import cors from 'cors';
import path from 'path';

import { createRootRouter } from './routes';
import { Auth, Site } from './services';
import { getConfig } from './utils';
import { LocalFileStorageAdapter } from './adapters/LocalFileStorageAdapter';
import { createErrorHandlerMiddleware } from './routes/errorHandlerMiddleware';
import { EndpointValidator, OASParser } from './utils/site';
import { createRequestValidationMiddleware } from './routes/requestValidationMiddleware';

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

const corsConfig = {
    origin: [config.uiUrl],
    credentials: true
}; 

const app = express();
const rootRouter = createRootRouter(logger, site, auth);
const errorHandler = createErrorHandlerMiddleware(logger);
const oasParser = new OASParser(path.join(__dirname, '../api.spec.yaml'));
oasParser.parseAndValidateSchema().then(() => {
    const endpointValidationSchemas = oasParser.getAllValidationSchemas();
    const endpointValidator = new EndpointValidator(endpointValidationSchemas);
    const requestValidationMiddleware = createRequestValidationMiddleware(endpointValidator);
    
    app.use(cors(corsConfig));
    app.use(express.json());
    app.use(requestValidationMiddleware);
    app.use('/', rootRouter);
    app.use(errorHandler);
    
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
