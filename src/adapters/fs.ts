// This trivial utility allows fs to be mocked in the LocalFileStorageAdapter unit tests
// without breaking imports of other modules (e.g. sqlite3), which rely on fs for initialisation
import fs from 'fs';

export default {
    existsSync: fs.existsSync,
    statSync: fs.statSync,
    mkdirSync: fs.mkdirSync,
    chownSync: fs.chownSync,
    promises: {
        readFile: fs.promises.readFile,
        writeFile: fs.promises.writeFile,
        readdir: fs.promises.readdir,
        rm: fs.promises.rm
    }
};
