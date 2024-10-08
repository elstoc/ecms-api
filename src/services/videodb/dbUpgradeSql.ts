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
        ('TV', 'TV'),
        ('DOC', 'Documentary'),
        ('MOV', 'Movie'),
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
        ('TVDRW', 'Doc Wallet'),
        ('TVBOX', 'TV Box'),
        ('EXT', 'Ext Drive'),
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
        num_episodes INTEGER,
        length_mins INTEGER,
        watched VARCHAR(1),
        priority_flag INTEGER,
        progress VARCHAR(50),
        imdb_id VARCHAR(50),
        image_url VARCHAR(500),
        year INTEGER,
        actors VARCHAR(200),
        plot VARCHAR(5000),
        primary_media_type VARCHAR(5),
        primary_media_location VARCHAR(5),
        primary_media_watched VARCHAR(1),
        other_media_type VARCHAR(5),
        other_media_location VARCHAR(5),
        media_notes VARCHAR(100),

        FOREIGN KEY (category)
            REFERENCES l_categories (code),
        FOREIGN KEY (watched)
            REFERENCES l_watched_status (code),
        FOREIGN KEY (primary_media_type)
            REFERENCES l_media_types (code),
        FOREIGN KEY (primary_media_location)
            REFERENCES l_media_locations (code),
        FOREIGN KEY (primary_media_watched)
            REFERENCES l_watched_status (code),
        FOREIGN KEY (other_media_type)
            REFERENCES l_media_types (code),
        FOREIGN KEY (other_media_location)
            REFERENCES l_media_locations (code)
    );

    CREATE TABLE IF NOT EXISTS video_tags (
        video_id INTEGER NOT NULL,
        tag VARCHAR(100) NOT NULL,

        PRIMARY KEY (video_id, tag),
        FOREIGN KEY (video_id)
            REFERENCES videos (id)
    );
`);
