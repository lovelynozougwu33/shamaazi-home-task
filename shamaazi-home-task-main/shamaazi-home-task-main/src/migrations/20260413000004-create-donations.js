'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('donations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      donor_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'donors', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      recurring_schedule_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'recurring_schedules', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      donation_type: {
        type: Sequelize.ENUM('one_off', 'recurring'),
        allowNull: false,
      },
      amount_gbp: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      status: {
        type: Sequelize.ENUM('scheduled', 'processing', 'succeeded', 'failed'),
        allowNull: false,
      },
      /** When this donation should be attempted (first attempt or retry after backoff) */
      scheduled_at: { type: Sequelize.DATE, allowNull: false },
      /** When processing finished successfully or terminally failed */
      processed_at: { type: Sequelize.DATE, allowNull: true },
      /** Number of charge attempts completed (used for retry cap and backoff) */
      attempt_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      last_error: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('donations', ['donor_id']);
    await queryInterface.addIndex('donations', ['status', 'scheduled_at'], {
      name: 'donations_status_scheduled_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('donations');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_donations_donation_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_donations_status";');
  },
};
