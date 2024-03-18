const dbVersionSql: string[] = [];

dbVersionSql.push(`
    CREATE TABLE IF NOT EXISTS db_version (
        version INTEGER PRIMARY KEY
    );

    INSERT INTO db_version (version)
    VALUES (2);
`);

dbVersionSql.push(`
    CREATE TABLE IF NOT EXISTS lookup_video_category (
        code VARCHAR(5) PRIMARY KEY,
        description VARCHAR(50) NOT NULL
    );

    INSERT INTO lookup_video_category (code, description)
    VALUES
        ('TV', 'TV Series'),
        ('TVD', 'TV Documentary'),
        ('MOV', 'Movie'),
        ('MOVD', 'Feature Length Documentary'),
        ('MUS', 'Music');

    CREATE TABLE IF NOT EXISTS lookup_video_media_type (
        code VARCHAR(5) PRIMARY KEY,
        description VARCHAR(50) NOT NULL
    );

    INSERT INTO lookup_video_media_type (code, description)
    VALUES
        ('DVD', 'DVD'),
        ('DVD1C', 'DVD 1:1 copy'),
        ('DVDS', 'DVD (shrunk)'),
        ('DVDR1', 'DVD (R1)'),
        ('BD', 'Blu Ray'),
        ('DL72', 'Download 720p'),
        ('DL10', 'Download 1080p'),
        ('DL21', 'Download 2160p'),
        ('DLSD', 'Download SD'),
        ('4K', '4K UHD');

    CREATE TABLE IF NOT EXISTS lookup_video_media_location (
        code VARCHAR(5) PRIMARY KEY,
        description VARCHAR(50) NOT NULL
    );

    INSERT INTO lookup_video_media_location (code, description)
    VALUES
        ('MW', 'Movies Wallet'),
        ('NAS', 'NAS'),
        ('DRW', 'Drama Wallet'),
        ('CW', 'Comedy Wallet'),
        ('DOCW', 'Documentary Wallet'),
        ('TVB', 'TV Series Box'),
        ('EXT', 'External Drive'),
        ('OTH', 'Other');

    CREATE TABLE IF NOT EXISTS video_media (
        video_id INTEGER NOT NULL,
        type VARCHAR(5) NOT NULL,
        location VARCHAR(5),
        watched INTEGER,
        notes VARCHAR(100),

        FOREIGN KEY (type)
            REFERENCES lookup_video_media_type (code),
        FOREIGN KEY (location)
            REFERENCES lookup_video_media_location (code)
    );

    CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY,
        name VARCHAR(200),
        category VARCHAR(5),
        director VARCHAR(100),
        length_mins INTEGER,
        to_watch_priority INTEGER,
        progress VARCHAR(50),

        FOREIGN KEY (category)
            REFERENCES lookup_video_category (code)
    );
`);

export { dbVersionSql };
