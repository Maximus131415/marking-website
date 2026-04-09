-- Define element of table "users"
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(60) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL, 
    role VARCHAR(60) NOT NULL,
    accuracy FLOAT DEFAULT 1.0
);

-- Define element of table "orders"
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'open',
    task_type VARCHAR(50),
    description TEXT,
    classes TEXT,
    overlap_count INTEGER DEFAULT 1
);

-- Define element of table "order_workers" (or authors)
CREATE TABLE IF NOT EXISTS order_workers (
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    worker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (order_id, worker_id)
);

-- Define element of table "images"
CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    is_honeypot BOOLEAN DEFAULT FALSE,
    true_label TEXT
);

-- Define element of table "annotations"
CREATE TABLE IF NOT EXISTS annotations (
    id SERIAL PRIMARY KEY,
    image_id INTEGER REFERENCES images(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    worker_id INTEGER,
    label_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
