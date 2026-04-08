CREATE TABLE users 
(
    id SERIAL PRIMARY KEY,
    username VARCHAR(120) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL, 
    role VARCHAR(120) NOT NULL            
);

CREATE TABLE IF NOT EXISTS orders 
(
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    worker_id INTEGER,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(120) DEFAULT 'open',
    task_type VARCHAR(120),
    description TEXT,
    classes TEXT
);

CREATE TABLE IF NOT EXISTS images 
(
    id SERIAL PRIMARY KEY,
    order_id INTEGER ON DELETE CASCADE,
    file_path TEXT NOT NULL,
	FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS annotations 
(
    id SERIAL PRIMARY KEY,
    image_id INTEGER ON DELETE CASCADE,
    order_id INTEGER ON DELETE CASCADE,
    worker_id INTEGER,
    label_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (image_id) REFERENCES images(id),
	FOREIGN KEY (order_id) REFERENCES orders(id)
);
