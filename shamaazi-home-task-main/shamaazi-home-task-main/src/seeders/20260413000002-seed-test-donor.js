'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'donors',
      [
        {
          id: 'b2000000-0000-4000-8000-000000000001',
          name: 'Test Donor',
          email: 'test.donor@example.com',
          created_at: now,
          updated_at: now,
        },
      ],
      {},
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      'donors',
      { id: 'b2000000-0000-4000-8000-000000000001' },
      {},
    );
  },
};
