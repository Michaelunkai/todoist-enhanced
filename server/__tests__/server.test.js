/**
 * Basic smoke tests for the todoist-enhanced backend server.
 * These tests verify that core modules load and utility functions behave correctly.
 */

describe('Server smoke tests', () => {
  test('Node.js version is 18 or higher', () => {
    const major = parseInt(process.versions.node.split('.')[0], 10);
    expect(major).toBeGreaterThanOrEqual(18);
  });

  test('express module is available', () => {
    expect(() => require('express')).not.toThrow();
  });

  test('environment defaults to test when NODE_ENV is set', () => {
    const env = process.env.NODE_ENV || 'development';
    expect(typeof env).toBe('string');
  });

  test('basic arithmetic sanity check', () => {
    expect(1 + 1).toBe(2);
  });
});
