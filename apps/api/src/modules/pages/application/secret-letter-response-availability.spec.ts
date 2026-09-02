import {
  isValidSecretLetterQuestion,
  resolveSecretLetterResponseAvailability,
} from './secret-letter-response-availability';

const secretLetter = {
  registryKey: 'confession.secret-letter',
  version: 1,
  capabilities: ['questions', 'visitorMessage'] as const,
};

describe('Secret Letter response availability', () => {
  it('enables responses only for a trusted Secret Letter with valid questions', () => {
    expect(
      resolveSecretLetterResponseAvailability({
        template: secretLetter,
        validQuestionCount: 1,
      }),
    ).toBe(true);
    expect(
      resolveSecretLetterResponseAvailability({
        template: secretLetter,
        validQuestionCount: 0,
      }),
    ).toBe(false);
    expect(
      resolveSecretLetterResponseAvailability({
        template: {
          ...secretLetter,
          registryKey: 'confession.choose-your-heart',
        },
        validQuestionCount: 1,
      }),
    ).toBe(false);
  });

  it('rejects malformed choice questions before they affect availability', () => {
    expect(
      isValidSecretLetterQuestion({
        id: '11111111-1111-4111-8111-111111111111',
        type: 'CHOICE',
        prompt: 'Choose one',
        choices: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            label: 'Same',
          },
          {
            id: '33333333-3333-4333-8333-333333333333',
            label: ' same ',
          },
        ],
      }),
    ).toBe(false);
    expect(
      isValidSecretLetterQuestion({
        id: '44444444-4444-4444-8444-444444444444',
        type: 'PLAIN_MESSAGE',
        prompt: 'Tell me more',
        choices: [],
      }),
    ).toBe(true);
  });
});
