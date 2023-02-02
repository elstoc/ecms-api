import express, { Express, Router } from 'express';
import cors from 'cors';
import { Config } from './utils';

export const createExpressApp = (siteRouter: Router, galleryRouter: Router, markdownRouter: Router, authRouter: Router, config: Config): Express => {
    const app = express();
    const allowedOrigins = [config.uiUrl];

    const options: cors.CorsOptions = { origin: allowedOrigins };
    app.use(cors(options));
    app.use('/site', siteRouter);
    app.use('/gallery', galleryRouter);
    app.use('/markdown', markdownRouter);
    app.use('/auth', authRouter);

    return app;
};
