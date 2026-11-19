import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FixedAssets1795200001000 implements MigrationInterface {
  name = 'FixedAssets1795200001000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`INSERT IGNORE INTO permissions (code,module,action,description) VALUES ('fixed_assets.view','fixed_assets','view','View fixed assets and maintenance'),('fixed_assets.manage','fixed_assets','manage','Register and manage fixed assets')`);
    await q.query(`INSERT IGNORE INTO role_permissions (role_id,permission_id) SELECT r.id,p.id FROM roles r JOIN permissions p ON p.code IN ('fixed_assets.view','fixed_assets.manage') WHERE r.code IN ('finance_officer','hospital_manager')`);
    await q.query(`INSERT IGNORE INTO role_permissions (role_id,permission_id) SELECT r.id,p.id FROM roles r JOIN permissions p ON p.code = 'fixed_assets.view' WHERE r.code = 'inventory_clerk'`);
    await q.query(`CREATE TABLE fixed_assets (id int UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, code varchar(40) NOT NULL, name varchar(160) NOT NULL, category varchar(80) NOT NULL, location varchar(120) NULL, serial_number varchar(100) NULL, purchase_date date NOT NULL, purchase_cost decimal(14,2) NOT NULL, salvage_value decimal(14,2) NOT NULL DEFAULT 0, useful_life_months int UNSIGNED NULL, status enum('active','in_maintenance','disposed') NOT NULL DEFAULT 'active', disposal_date date NULL, disposal_value decimal(14,2) NULL, notes varchar(500) NULL, created_by_user_id int UNSIGNED NULL, created_at timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), updated_at timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE KEY uq_fixed_assets_code (code), INDEX idx_fixed_assets_status (status), CONSTRAINT fk_fixed_assets_user FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL) ENGINE=InnoDB`);
    await q.query(`CREATE TABLE fixed_asset_maintenance (id int UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, asset_id int UNSIGNED NOT NULL, performed_on date NOT NULL, description varchar(160) NOT NULL, cost decimal(14,2) NOT NULL DEFAULT 0, provider varchar(120) NULL, notes varchar(500) NULL, created_by_user_id int UNSIGNED NULL, created_at timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX idx_fixed_asset_maintenance_asset_date (asset_id,performed_on), CONSTRAINT fk_fixed_asset_maintenance_asset FOREIGN KEY (asset_id) REFERENCES fixed_assets(id) ON DELETE RESTRICT, CONSTRAINT fk_fixed_asset_maintenance_user FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL) ENGINE=InnoDB`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE fixed_asset_maintenance');
    await q.query('DROP TABLE fixed_assets');
    await q.query(`DELETE rp FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id WHERE p.code IN ('fixed_assets.view','fixed_assets.manage')`);
    await q.query(`DELETE FROM permissions WHERE code IN ('fixed_assets.view','fixed_assets.manage')`);
  }
}
