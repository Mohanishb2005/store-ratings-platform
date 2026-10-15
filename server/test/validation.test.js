import test from 'node:test';
import assert from 'node:assert/strict';
import { validateName, validateAddress, validateEmail, validatePassword, validateUserInput } from '../src/validation.js';

test('name length is inclusive from 20 to 60 characters', () => {
  assert.equal(validateName('12345678901234567890'), null);
  assert.equal(validateName('short'), 'Name must be between 20 and 60 characters.');
  assert.equal(validateName('x'.repeat(61)), 'Name must be between 20 and 60 characters.');
});
test('address must not exceed 400 characters', () => {
  assert.equal(validateAddress('a'.repeat(400)), null);
  assert.ok(validateAddress('a'.repeat(401)));
});
test('email validation rejects malformed addresses', () => {
  assert.equal(validateEmail('user@example.com'), null);
  assert.ok(validateEmail('no-at-symbol'));
});
test('password requires 8-16 chars, uppercase and special character', () => {
  assert.equal(validatePassword('StrongPass!1'), null);
  assert.ok(validatePassword('lowercase!1'));
  assert.ok(validatePassword('NoSpecial123'));
  assert.ok(validatePassword('Aa!1234'));
  assert.ok(validatePassword('WayTooLongPassword!123'));
});
test('user input aggregates validation errors', () => {
  assert.equal(validateUserInput({name:'Valid Name That Is Long Enough',email:'a@b.com',address:'',password:'StrongPass!1'}).length, 0);
});
