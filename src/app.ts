import express, { Express, Router } from 'express';
import cors from 'cors';

export const createExpressApp = (galleryRouter: Router): Express => {
    const app = express();
    const allowedOrigins = ['http://localhost:3000'];

    const options: cors.CorsOptions = { origin: allowedOrigins };
    app.use(cors(options));
    app.use('/gallery', galleryRouter);

    return app;
};
