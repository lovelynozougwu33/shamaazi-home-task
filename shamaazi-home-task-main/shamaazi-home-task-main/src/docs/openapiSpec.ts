/**
 * OpenAPI 3.0 document for Swagger UI. Kept in one module so routes and examples stay in sync.
 */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Shamaazi donations API',
    version: '1.0.0',
    description:
      'Donor enrolment, one-off and recurring donations, and simulated payment processing. Amounts are GBP.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Overridden at runtime by getOpenApiSpec()' }],
  tags: [
    { name: 'Health' },
    { name: 'Donors' },
    { name: 'Products' },
    { name: 'Donations' },
    { name: 'Recurring schedules' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Liveness',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthOk' },
                example: { ok: true },
              },
            },
          },
        },
      },
    },
    '/donors': {
      get: {
        tags: ['Donors'],
        summary: 'List donors',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
          },
        ],
        responses: {
          '200': {
            description: 'List',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DonorListResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Donors'],
        summary: 'Register donor',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DonorCreate' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Donor' } } },
          },
          '409': { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorBody' } } } },
        },
      },
    },
    '/donors/{donorId}/donations': {
      get: {
        tags: ['Donors'],
        summary: 'List donations for a donor',
        parameters: [{ $ref: '#/components/parameters/DonorIdPath' }],
        responses: {
          '200': {
            description: 'Donations with product summary',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/DonorDonationsResponse' } } },
          },
          '404': { description: 'Donor not found' },
        },
      },
    },
    '/donors/{id}': {
      get: {
        tags: ['Donors'],
        summary: 'Get donor by id',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Donor' } } } },
          '404': { description: 'Not found' },
        },
      },
      patch: {
        tags: ['Donors'],
        summary: 'Update donor',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DonorUpdate' } } },
        },
        responses: {
          '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Donor' } } } },
          '404': { description: 'Not found' },
          '409': { description: 'Email conflict' },
        },
      },
      delete: {
        tags: ['Donors'],
        summary: 'Delete donor (cascades donations)',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: { '204': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'List products',
        responses: {
          '200': {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductListResponse' } } },
          },
        },
      },
      post: {
        tags: ['Products'],
        summary: 'Create product',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductCreate' } } },
        },
        responses: {
          '201': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
          '409': { description: 'Code taken' },
        },
      },
    },
    '/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get product',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
          '404': { description: 'Not found' },
        },
      },
      patch: {
        tags: ['Products'],
        summary: 'Update product',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductUpdate' } } },
        },
        responses: {
          '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
          '404': { description: 'Not found' },
          '409': { description: 'Code conflict' },
        },
      },
      delete: {
        tags: ['Products'],
        summary: 'Delete product if unused',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '204': { description: 'Deleted' },
          '404': { description: 'Not found' },
          '409': { description: 'Product has donations' },
        },
      },
    },
    '/donations': {
      get: {
        tags: ['Donations'],
        summary: 'List donations',
        parameters: [
          { name: 'donorId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'productId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['scheduled', 'processing', 'succeeded', 'failed'] },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
          },
        ],
        responses: {
          '200': {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/DonationListResponse' } } },
          },
        },
      },
    },
    '/donations/one-off': {
      post: {
        tags: ['Donations'],
        summary: 'Create one-off donation',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DonationOneOffCreate' } } },
        },
        responses: {
          '201': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Donation' } } } },
          '400': { description: 'Donor or product missing' },
        },
      },
    },
    '/donations/recurring': {
      post: {
        tags: ['Donations'],
        summary: 'Create recurring schedule (same as POST /recurring-schedules)',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RecurringScheduleCreate' } },
          },
        },
        responses: {
          '201': {
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/RecurringSchedule' } },
            },
          },
          '400': { description: 'Invalid references' },
        },
      },
    },
    '/donations/{id}': {
      get: {
        tags: ['Donations'],
        summary: 'Get donation',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/DonationDetail' } } } },
          '404': { description: 'Not found' },
        },
      },
      patch: {
        tags: ['Donations'],
        summary: 'Reschedule (scheduled state only)',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DonationUpdate' } } },
        },
        responses: {
          '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Donation' } } } },
          '404': { description: 'Not found' },
          '409': { description: 'Not in scheduled state' },
        },
      },
      delete: {
        tags: ['Donations'],
        summary: 'Delete scheduled donation only',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '204': { description: 'Deleted' },
          '404': { description: 'Not found' },
          '409': { description: 'Not deletable' },
        },
      },
    },
    '/recurring-schedules': {
      get: {
        tags: ['Recurring schedules'],
        summary: 'List recurring schedules',
        parameters: [
          { name: 'donorId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
          },
        ],
        responses: {
          '200': {
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/RecurringScheduleListResponse' } },
            },
          },
        },
      },
      post: {
        tags: ['Recurring schedules'],
        summary: 'Create recurring schedule',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RecurringScheduleCreate' } },
          },
        },
        responses: {
          '201': {
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/RecurringSchedule' } },
            },
          },
          '400': { description: 'Invalid references' },
        },
      },
    },
    '/recurring-schedules/{id}': {
      get: {
        tags: ['Recurring schedules'],
        summary: 'Get recurring schedule',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '200': {
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/RecurringSchedule' } },
            },
          },
          '404': { description: 'Not found' },
        },
      },
      patch: {
        tags: ['Recurring schedules'],
        summary: 'Update schedule',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        requestBody: {
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RecurringScheduleUpdate' } },
          },
        },
        responses: {
          '200': {
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/RecurringSchedule' } },
            },
          },
          '404': { description: 'Not found' },
          '400': { description: 'Invalid cadence fields' },
        },
      },
      delete: {
        tags: ['Recurring schedules'],
        summary: 'Delete schedule',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: { '204': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },
  },
  components: {
    parameters: {
      IdPath: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      },
      DonorIdPath: {
        name: 'donorId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      },
    },
    schemas: {
      HealthOk: {
        type: 'object',
        properties: { ok: { type: 'boolean' } },
      },
      ErrorBody: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
        },
      },
      Donor: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      DonorCreate: {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
        },
      },
      DonorUpdate: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
        },
        description: 'At least one field required',
      },
      DonorListResponse: {
        type: 'object',
        properties: {
          donors: { type: 'array', items: { $ref: '#/components/schemas/Donor' } },
        },
      },
      ProductSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          code: { type: 'string' },
          name: { type: 'string' },
        },
      },
      DonorDonationsResponse: {
        type: 'object',
        properties: {
          donorId: { type: 'string', format: 'uuid' },
          donations: {
            type: 'array',
            items: { $ref: '#/components/schemas/DonationWithProductSummary' },
          },
        },
      },
      DonationWithProductSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          product: { nullable: true, allOf: [{ $ref: '#/components/schemas/ProductSummary' }] },
          amountGbp: { type: 'string', example: '25.00' },
          donationType: { type: 'string', enum: ['one_off', 'recurring'] },
          status: { type: 'string', enum: ['scheduled', 'processing', 'succeeded', 'failed'] },
          scheduledAt: { type: 'string', format: 'date-time' },
          processedAt: { nullable: true, type: 'string', format: 'date-time' },
          attemptCount: { type: 'integer' },
          lastError: { nullable: true, type: 'string' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          code: { type: 'string' },
          name: { type: 'string' },
          description: { nullable: true, type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ProductCreate: {
        type: 'object',
        required: ['code', 'name'],
        properties: {
          code: { type: 'string', pattern: '^[a-z0-9-]+$' },
          name: { type: 'string' },
          description: { type: 'string' },
        },
      },
      ProductUpdate: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          description: { nullable: true, type: 'string' },
        },
      },
      ProductListResponse: {
        type: 'object',
        properties: {
          products: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
        },
      },
      Donation: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          donorId: { type: 'string', format: 'uuid' },
          productId: { type: 'string', format: 'uuid' },
          recurringScheduleId: { nullable: true, type: 'string', format: 'uuid' },
          donationType: { type: 'string', enum: ['one_off', 'recurring'] },
          amountGbp: { type: 'string' },
          status: { type: 'string', enum: ['scheduled', 'processing', 'succeeded', 'failed'] },
          scheduledAt: { type: 'string', format: 'date-time' },
          processedAt: { nullable: true, type: 'string', format: 'date-time' },
          attemptCount: { type: 'integer' },
          lastError: { nullable: true, type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      DonationDetail: {
        allOf: [
          { $ref: '#/components/schemas/Donation' },
          {
            type: 'object',
            properties: {
              product: {
                nullable: true,
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  code: { type: 'string' },
                  name: { type: 'string' },
                  description: { nullable: true, type: 'string' },
                },
              },
            },
          },
        ],
      },
      DonationListResponse: {
        type: 'object',
        properties: {
          donations: {
            type: 'array',
            items: {
              allOf: [
                { $ref: '#/components/schemas/Donation' },
                {
                  type: 'object',
                  properties: {
                    product: { nullable: true, allOf: [{ $ref: '#/components/schemas/ProductSummary' }] },
                  },
                },
              ],
            },
          },
        },
      },
      DonationOneOffCreate: {
        type: 'object',
        required: ['donorId', 'productId', 'amountGbp'],
        properties: {
          donorId: { type: 'string', format: 'uuid' },
          productId: { type: 'string', format: 'uuid' },
          amountGbp: { type: 'number', minimum: 0, exclusiveMinimum: true },
          scheduledAt: { type: 'string', format: 'date-time', description: 'Optional; defaults to now' },
        },
      },
      DonationUpdate: {
        type: 'object',
        required: ['scheduledAt'],
        properties: {
          scheduledAt: { type: 'string', format: 'date-time' },
        },
      },
      RecurringSchedule: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          donorId: { type: 'string', format: 'uuid' },
          productId: { type: 'string', format: 'uuid' },
          amountGbp: { type: 'string' },
          frequency: { type: 'string', enum: ['weekly', 'monthly'] },
          dayOfWeek: { nullable: true, type: 'integer', minimum: 0, maximum: 6 },
          dayOfMonth: { nullable: true, type: 'integer', minimum: 1, maximum: 28 },
          isActive: { type: 'boolean' },
          nextScheduledAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      RecurringScheduleCreate: {
        type: 'object',
        required: ['donorId', 'productId', 'amountGbp', 'frequency'],
        properties: {
          donorId: { type: 'string', format: 'uuid' },
          productId: { type: 'string', format: 'uuid' },
          amountGbp: { type: 'number' },
          frequency: { type: 'string', enum: ['weekly', 'monthly'] },
          dayOfWeek: { type: 'integer', minimum: 0, maximum: 6, description: 'Required if weekly (0=Sun … 6=Sat)' },
          dayOfMonth: { type: 'integer', minimum: 1, maximum: 28, description: 'Required if monthly' },
        },
      },
      RecurringScheduleUpdate: {
        type: 'object',
        properties: {
          amountGbp: { type: 'number' },
          isActive: { type: 'boolean' },
          nextScheduledAt: { type: 'string', format: 'date-time' },
          frequency: { type: 'string', enum: ['weekly', 'monthly'] },
          dayOfWeek: { nullable: true, type: 'integer' },
          dayOfMonth: { nullable: true, type: 'integer' },
        },
        description: 'At least one field required',
      },
      RecurringScheduleListResponse: {
        type: 'object',
        properties: {
          recurringSchedules: { type: 'array', items: { $ref: '#/components/schemas/RecurringSchedule' } },
        },
      },
    },
  },
} as const;

/** Resolves `servers` from `PORT` so “Try it out” targets the running app. */
export function getOpenApiSpec(): Record<string, unknown> {
  const port = process.env.PORT || '3000';
  const spec = openApiSpec as unknown as Record<string, unknown>;
  return {
    ...spec,
    servers: [{ url: `http://localhost:${port}`, description: 'This process (PORT env)' }],
  };
}
