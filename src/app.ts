import express, { Express, Router } from 'express';

export const createExpressApp = (galleryRouter: Router): Express => {
    const app = express();

    app.set('port', 3012);
    app.set('host', 'localhost');

    app.use('/gallery', galleryRouter);

    return app;
};
