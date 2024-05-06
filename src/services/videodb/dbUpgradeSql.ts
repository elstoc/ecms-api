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

    CREATE TABLE IF NOT EXISTS l_media_types (
        code VARCHAR(10) PRIMARY KEY,
        description VARCHAR(50) NOT NULL,
        priority INTEGER NOT NULL
    );

    INSERT INTO l_media_types (code, description, priority)
    VALUES
        ('BD4K', '4K Blu Ray', 10),
        ('DL2160', '2160p Download', 20),
        ('BD', 'Blu Ray', 30),
        ('DL1080', '1080p Download', 40),
        ('DL720', '720p Download', 50),
        ('DVD', 'DVD', 60),
        ('DVD11', 'DVD 1:1', 70),
        ('DVDSH', 'DVD shrunk', 80),
        ('DVDR1', 'DVD R1', 90),
        ('DLSD', 'SD Download', 100);

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
        imdb_id VARCHAR(50),
        image_url VARCHAR(500),
        year INTEGER,
        actors VARCHAR(200),
        plot VARCHAR(5000),

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

    CREATE TABLE IF NOT EXISTS video_tags (
        video_id INTEGER NOT NULL,
        tag VARCHAR(100) NOT NULL,

        PRIMARY KEY (video_id, tag),
        FOREIGN KEY (video_id)
            REFERENCES videos (id)
    );
`);
