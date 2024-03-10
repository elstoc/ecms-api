const dbVersionSql: string[] = [];

dbVersionSql.push(`
    CREATE TABLE IF NOT EXISTS db_version (
        version INTEGER PRIMARY KEY
    );

    INSERT INTO db_version (version)
    VALUES (2);
`);

dbVersionSql.push(`
    CREATE TABLE IF NOT EXISTS media_types (
        code CHAR(1) PRIMARY KEY,
        description VARCHAR(50) NOT NULL);

    INSERT INTO media_types (code, description) VALUES ('V', 'Video');
`);

export { dbVersionSql };
