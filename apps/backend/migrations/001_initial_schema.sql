-- Initial schema for insurance module
CREATE TABLE IF NOT EXISTS schema_migrations (
  id VARCHAR(255) NOT NULL PRIMARY KEY,
  run_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_policy (
  employee_policy_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  employee_code VARCHAR(50) NOT NULL,
  employee_name VARCHAR(255) NULL,
  policy_no VARCHAR(100) NOT NULL,
  policy_type ENUM('GIS','SLI') NOT NULL,
  premium DECIMAL(12,2) DEFAULT NULL,
  maturity_date DATE DEFAULT NULL,
  status TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY ux_policy_no (policy_no),
  INDEX idx_employee_code (employee_code),
  INDEX idx_policy_type (policy_type)
);

CREATE TABLE IF NOT EXISTS policy_cheque (
  policy_cheque_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  encashment_date DATE NOT NULL,
  receipt_no VARCHAR(100) NOT NULL,
  salary_month DATE NOT NULL,
  policy_type ENUM('GIS','SLI') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY ux_receipt_no (receipt_no),
  INDEX idx_salary_month (salary_month),
  INDEX idx_policy_type (policy_type)
);

CREATE TABLE IF NOT EXISTS policy_remittance (
  policy_remittance_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  employee_policy_id INT NOT NULL,
  salary_month DATE NOT NULL,
  due_month DATE NOT NULL,
  amount_deducted DECIMAL(12,2) NOT NULL,
  policy_cheque_id INT DEFAULT NULL,
  receipt_no VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY ux_emp_salary (employee_policy_id, salary_month),
  INDEX idx_employee_policy_id (employee_policy_id),
  INDEX idx_salary_month (salary_month),
  CONSTRAINT fk_policy_remittance_employee_policy FOREIGN KEY (employee_policy_id)
    REFERENCES employee_policy(employee_policy_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_policy_remittance_cheque FOREIGN KEY (policy_cheque_id)
    REFERENCES policy_cheque(policy_cheque_id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Fulltext/trigram suggestion: for employee_name searches consider adding FULLTEXT or ngram indexes depending on MySQL version
