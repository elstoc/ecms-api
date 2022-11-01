import express, { Express, Router } from 'express';
import cors from 'cors';
import { Config } from './utils';

export const createExpressApp = (galleryRouter: Router, config: Config): Express => {
    const app = express();
    const allowedOrigins = [config.uiSiteUrl];

    const options: cors.CorsOptions = { origin: allowedOrigins };
    app.use(cors(options));
    app.use('/gallery', galleryRouter);

    return app;
};
