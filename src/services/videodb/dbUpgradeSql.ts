export const dbUpgradeSql: string[] = [];

dbUpgradeSql.push(`
    CREATE TABLE IF NOT EXISTS db_version (
        version INTEGER PRIMARY KEY
    );

    INSERT INTO db_version (version)
    VALUES (2);
`);

dbUpgradeSql.push(`
    CREATE TABLE IF NOT EXISTS l_categories (
        code VARCHAR(10) PRIMARY KEY,
        description VARCHAR(50) NOT NULL
    );

    INSERT INTO l_categories (code, description)
    VALUES
        ('TV', 'TV Series'),
        ('TVD', 'TV Documentary'),
        ('MOV', 'Movie'),
        ('MOVD', 'Feature Length Documentary'),
        ('MUS', 'Music');

    CREATE TABLE IF NOT EXISTS l_media_definition (
        code VARCHAR(10) PRIMARY KEY,
        description VARCHAR(50) NOT NULL,
        priority INTEGER NOT NULL
    );

    INSERT INTO l_media_definition (code, description, priority)
    VALUES
        ('SD', 'Standard Definition', 3),
        ('HD', 'High Definition', 2),
        ('UHD', 'Ultra High Definition', 1);

    CREATE TABLE IF NOT EXISTS l_media_types (
        code VARCHAR(10) PRIMARY KEY,
        description VARCHAR(50) NOT NULL,
        physical VARCHAR(1) NOT NULL,
        definition VARCHAR(5) NOT NULL,

        FOREIGN KEY (definition)
            REFERENCES l_media_definition (code)
    );

    INSERT INTO l_media_types (code, description, physical, definition)
    VALUES
        ('DVD', 'DVD', 'Y', 'SD'),
        ('DVD11', 'DVD (1:1 copy)', 'Y', 'SD'),
        ('DVDSH', 'DVD (shrunk)', 'Y', 'SD'),
        ('DVDR1', 'DVD (R1)', 'Y', 'SD'),
        ('BD', 'Blu Ray', 'Y', 'HD'),
        ('DL720', 'Download 720p', 'N', 'SD'),
        ('DL1080', 'Download 1080p', 'N', 'HD'),
        ('DL2160', 'Download 2160p', 'N', 'UHD'),
        ('DLSD', 'Download SD', 'N', 'SD'),
        ('BD4K', '4K UHD Blu Ray', 'Y', 'UHD');

    CREATE TABLE IF NOT EXISTS l_media_locations (
        code VARCHAR(5) PRIMARY KEY,
        description VARCHAR(50) NOT NULL
    );

    INSERT INTO l_media_locations (code, description)
    VALUES
        ('MOVW', 'Movies Wallet'),
        ('NAS', 'NAS'),
        ('TVDOW', 'Drama Wallet'),
        ('TVCOW', 'Comedy Wallet'),
        ('TVDRW', 'Documentary Wallet'),
        ('TVBOX', 'TV Series Box'),
        ('EXT', 'External Drive'),
        ('OTH', 'Other');

    CREATE TABLE IF NOT EXISTS l_watched_status (
        code VARCHAR(5) PRIMARY KEY,
        description VARCHAR(50) NOT NULL
    );

    INSERT INTO l_watched_status (code, description)
    VALUES
        ('Y', 'Yes'),
        ('N', 'No'),
        ('P', 'Partial');

    CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY,
        title VARCHAR(200),
        category VARCHAR(5),
        director VARCHAR(100),
        length_mins INTEGER,
        watched VARCHAR(1),
        to_watch_priority INTEGER,
        progress VARCHAR(50),

        FOREIGN KEY (category)
            REFERENCES l_categories (code),
        FOREIGN KEY (watched)
            REFERENCES l_watched_status (code)
    );

    CREATE TABLE IF NOT EXISTS video_media (
        video_id INTEGER NOT NULL,
        media_type VARCHAR(5) NOT NULL,
        media_location VARCHAR(5),
        watched VARCHAR(1),
        notes VARCHAR(100),

        PRIMARY KEY (video_id, media_type),
        FOREIGN KEY (media_type)
            REFERENCES l_media_types (code),
        FOREIGN KEY (media_location)
            REFERENCES l_media_locations (code),
        FOREIGN KEY (video_id)
            REFERENCES videos (id),
        FOREIGN KEY (watched)
            REFERENCES l_watched_status (code)
    );
`);
