CREATE TABLE users 
(
    id SERIAL PRIMARY KEY,
    username VARCHAR(60) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL, 
    role VARCHAR(60) NOT NULL            
);

CREATE TABLE IF NOT EXISTS orders 
(
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    worker_id INTEGER,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'open',
    task_type VARCHAR(50),
    description TEXT,
    classes TEXT
);

CREATE TABLE IF NOT EXISTS images 
(
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS annotations 
(
    id SERIAL PRIMARY KEY,
    image_id INTEGER REFERENCES images(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    worker_id INTEGER,
    label_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
