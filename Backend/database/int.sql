-- Additive initialization: existing tables and records are never removed.
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer', 'owner', 'admin') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY users_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vehicles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type ENUM('car', 'van', 'motorcycle') NOT NULL,
  location VARCHAR(100) NOT NULL,
  daily_rate DECIMAL(10, 2) NOT NULL,
  image_url VARCHAR(2048) NULL,
  description TEXT NULL,
  capacity INT UNSIGNED NOT NULL DEFAULT 4,
  fuel_type VARCHAR(50) NOT NULL DEFAULT 'Petrol',
  transmission VARCHAR(50) NOT NULL DEFAULT 'Automatic',
  available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_vehicles_type (type),
  KEY idx_vehicles_location (location),
  KEY idx_vehicles_available (available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO vehicles (id, name, type, location, daily_rate, image_url, description, capacity, fuel_type, transmission, available)
VALUES
  (1, 'Toyota Corolla Altis', 'car', 'Colombo', 14500.00, 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&auto=format&fit=crop&q=80', 'Reliable, fuel-efficient sedan perfect for city travel and coastal highway driving.', 5, 'Petrol', 'Automatic', TRUE),
  (2, 'Honda Civic RS', 'car', 'Kandy', 18000.00, 'https://images.unsplash.com/photo-1590362891988-37213e4b78c2?w=800&auto=format&fit=crop&q=80', 'Premium sporty sedan with leather upholstery, sunroof, and modern infotainment.', 5, 'Petrol', 'Automatic', TRUE),
  (3, 'Toyota HiAce Super GL', 'van', 'Galle', 28500.00, 'https://images.unsplash.com/photo-1559297434-fae8a1916a79?w=800&auto=format&fit=crop&q=80', 'Spacious dual AC passenger van suited for family trips and tour groups across Sri Lanka.', 10, 'Diesel', 'Manual', TRUE),
  (4, 'Nissan Caravan NV350', 'van', 'Colombo', 26000.00, 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80', 'High-roof luxury passenger van with reclining seats, extra luggage space, and dual climate control.', 9, 'Diesel', 'Automatic', TRUE),
  (5, 'Yamaha FZ-S V3', 'motorcycle', 'Matara', 6500.00, 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop&q=80', 'Agile 150cc bike with ABS, ideal for beach road exploration and scenic hill country tours.', 2, 'Petrol', 'Manual', TRUE),
  (6, 'Honda Dio 110', 'motorcycle', 'Mirissa', 4500.00, 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&auto=format&fit=crop&q=80', 'Lightweight, easy-handling automatic scooter with under-seat helmet storage.', 2, 'Petrol', 'Automatic', TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name);

CREATE TABLE IF NOT EXISTS reservations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT UNSIGNED NOT NULL,
  customer_id INT UNSIGNED NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('confirmed', 'cancelled', 'completed') NOT NULL DEFAULT 'confirmed',
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_reservations_vehicle_dates (vehicle_id, start_date, end_date, status),
  KEY idx_reservations_customer (customer_id),
  CONSTRAINT fk_reservations_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE RESTRICT,
  CONSTRAINT fk_reservations_customer FOREIGN KEY (customer_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


