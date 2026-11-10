'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('recurring_schedules', {
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
      amount_gbp: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      frequency: {
        type: Sequelize.ENUM('weekly', 'monthly'),
        allowNull: false,
      },
      /** 0 = Sunday … 6 = Saturday (JavaScript Date.getDay) */
      day_of_week: { type: Sequelize.SMALLINT, allowNull: true },
      /** 1–28 (avoids end-of-month ambiguity) */
      day_of_month: { type: Sequelize.SMALLINT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      next_scheduled_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('recurring_schedules', ['donor_id']);
    await queryInterface.addIndex('recurring_schedules', ['next_scheduled_at'], {
      name: 'recurring_schedules_next_scheduled_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('recurring_schedules');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_recurring_schedules_frequency";');
  },
};
