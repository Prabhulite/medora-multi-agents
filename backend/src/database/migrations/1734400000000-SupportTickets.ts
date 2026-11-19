import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SupportTickets1734400000000 implements MigrationInterface {
  name = 'SupportTickets1734400000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE \`support_tickets\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`created_by_id\` int UNSIGNED NOT NULL, \`issue_title\` varchar(180) NOT NULL, \`description\` text NOT NULL, \`status\` varchar(20) NOT NULL DEFAULT 'Open', \`priority\` varchar(20) NOT NULL DEFAULT 'Medium', \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_ticket_creator_date\` (\`created_by_id\`, \`created_at\`), INDEX \`IDX_ticket_status_date\` (\`status\`, \`created_at\`), PRIMARY KEY (\`id\`), CONSTRAINT \`FK_ticket_creator\` FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT) ENGINE=InnoDB`);
    await q.query(`CREATE TABLE \`support_ticket_responses\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`ticket_id\` int UNSIGNED NOT NULL, \`responded_by_id\` int UNSIGNED NOT NULL, \`message\` text NOT NULL, \`responded_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_ticket_response_date\` (\`ticket_id\`, \`responded_at\`), PRIMARY KEY (\`id\`), CONSTRAINT \`FK_ticket_response_ticket\` FOREIGN KEY (\`ticket_id\`) REFERENCES \`support_tickets\`(\`id\`) ON DELETE CASCADE, CONSTRAINT \`FK_ticket_response_user\` FOREIGN KEY (\`responded_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT) ENGINE=InnoDB`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE `support_ticket_responses`');
    await q.query('DROP TABLE `support_tickets`');
  }
}
