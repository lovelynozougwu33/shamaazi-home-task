'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'products',
      [
        {
          id: 'a1000000-0000-4000-8000-000000000001',
          code: 'schools-build',
          name: 'Schools Build Fund',
          description: 'Capital projects for schools in partner regions.',
          created_at: now,
          updated_at: now,
        },
        {
          id: 'a1000000-0000-4000-8000-000000000002',
          code: 'emergency-relief',
          name: 'Emergency Relief',
          description: 'Rapid response when crises hit.',
          created_at: now,
          updated_at: now,
        },
      ],
      {},
    );
  },

  async down(queryInterface) {
    const { Op } = require('sequelize');
    await queryInterface.bulkDelete(
      'products',
      {
        id: {
          [Op.in]: [
            'a1000000-0000-4000-8000-000000000001',
            'a1000000-0000-4000-8000-000000000002',
          ],
        },
      },
      {},
    );
  },
};
