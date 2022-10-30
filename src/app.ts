import express, { Express, Router } from 'express';

export const createExpressApp = (galleryRouter: Router): Express => {
    const app = express();

    app.use('/gallery', galleryRouter);

    return app;
};
