import { describe, it } from 'node:test';
import assert from 'node:assert';

// Simple validation function extracted for testing purposes 
// (In a real scenario, we might export the validation logic or use a service)
function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

describe('Email Format Validation', () => {
  it('should accept valid emails', () => {
    assert.strictEqual(validateEmail('test@example.com'), true);
    assert.strictEqual(validateEmail('aluno.teste@universidade.edu'), true);
    assert.strictEqual(validateEmail('test@gmail.com'), true);
  });

  it('should reject invalid email structures', () => {
    assert.strictEqual(validateEmail(''), false);
    assert.strictEqual(validateEmail('not-an-email'), false);
    assert.strictEqual(validateEmail('test@'), false);
    assert.strictEqual(validateEmail('@domain.com'), false);
  });
});
