import { ISite } from '../../services';
import { RequestHandler } from '../RequestHandler';

export const createGetSiteConfigHandler = (site: ISite): RequestHandler => async (req, res) => {
    res.json(site.getConfig()).status(200);
};
