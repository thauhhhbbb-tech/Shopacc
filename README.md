CREATE DATABASE IF NOT EXISTS accshop;
USE accshop;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    balance BIGINT DEFAULT 0,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game VARCHAR(50) NOT NULL,
    acc_username VARCHAR(100) NOT NULL,
    acc_password VARCHAR(100) NOT NULL,
    price INT NOT NULL,              -- giá gốc (VNĐ)
    discount_percent INT DEFAULT 0,  -- giảm giá %
    stock INT NOT NULL DEFAULT 1,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    total DECIMAL(15,2) NOT NULL,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE topup_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount BIGINT NOT NULL,
    card_code VARCHAR(50) NOT NULL,
    card_serial VARCHAR(50) NOT NULL,
    status ENUM('success', 'failed') DEFAULT 'success',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Thêm admin mặc định (mật khẩu: admin123)
INSERT INTO users (username, password, email, role) VALUES 
('admin', '$2a$10$WZ6z.Kb4hQjR6Xq8WZ6z.Kb4hQjR6Xq8WZ6z.Kb4hQjR6Xq8', 'admin@shop.com', 'admin');

-- Thêm sản phẩm mẫu (Blox Fruit giảm 70% như link)
INSERT INTO products (game, acc_username, acc_password, price, discount_percent, stock, description) VALUES
('Blox Fruit', 'acc_v4_001', 'pass123', 6200000, 70, 5, 'Full gear v4, tộc cyborg'),
('Blox Fruit', 'acc_v4_002', 'pass456', 6800000, 70, 3, 'Tộc mink v4, full sword');
