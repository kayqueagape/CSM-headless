process.env['DB_DRIVER'] = 'in-memory';
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-secret-key-for-integration-tests-32ch';

import 'reflect-metadata';

jest.setTimeout(15000);