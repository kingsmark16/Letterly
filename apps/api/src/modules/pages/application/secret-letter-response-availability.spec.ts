import {
  areValidSecretLetterQuestions,
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
        displayOrder: 0,
        choices: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            label: 'Same',
            displayOrder: 0,
          },
          {
            id: '33333333-3333-4333-8333-333333333333',
            label: ' same ',
            displayOrder: 1,
          },
        ],
      }),
    ).toBe(false);
    expect(
      isValidSecretLetterQuestion({
        id: '44444444-4444-4444-8444-444444444444',
        type: 'PLAIN_MESSAGE',
        prompt: 'Tell me more',
        displayOrder: 0,
        choices: [],
      }),
    ).toBe(true);
  });

  it('AC-7 rejects missing and non integral question order before availability', () => {
    const question = {
      id: '55555555-5555-4555-8555-555555555555',
      type: 'PLAIN_MESSAGE',
      prompt: 'Tell me more',
      choices: [],
    };

    for (const displayOrder of [undefined, -1, 0.5, Number.POSITIVE_INFINITY]) {
      expect(isValidSecretLetterQuestion({ ...question, displayOrder })).toBe(
        false,
      );
    }
  });

  it('AC-7 rejects a question collection with a gap or duplicate order', () => {
    const firstQuestion = {
      id: '66666666-6666-4666-8666-666666666666',
      type: 'PLAIN_MESSAGE' as const,
      prompt: 'First',
      displayOrder: 0,
      choices: [],
    };
    const secondQuestion = {
      id: '77777777-7777-4777-8777-777777777777',
      type: 'PLAIN_MESSAGE' as const,
      prompt: 'Second',
      displayOrder: 1,
      choices: [],
    };

    expect(
      areValidSecretLetterQuestions([
        firstQuestion,
        {
          ...secondQuestion,
          prompt: 'Second',
          displayOrder: 2,
        },
      ]),
    ).toBe(false);
    expect(
      areValidSecretLetterQuestions([
        firstQuestion,
        secondQuestion,
        {
          ...secondQuestion,
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          prompt: 'Third',
          displayOrder: 1,
        },
      ]),
    ).toBe(false);
  });

  it('AC-7 rejects a choice collection with a gap or duplicate order', () => {
    const firstChoice = {
      id: '99999999-9999-4999-8999-999999999999',
      label: 'First',
      displayOrder: 0,
    };
    const secondChoice = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      label: 'Second',
      displayOrder: 1,
    };

    expect(
      isValidSecretLetterQuestion({
        id: '88888888-8888-4888-8888-888888888888',
        type: 'CHOICE',
        prompt: 'Choose one',
        displayOrder: 0,
        choices: [
          firstChoice,
          {
            ...secondChoice,
            displayOrder: 2,
          },
        ],
      }),
    ).toBe(false);
    expect(
      isValidSecretLetterQuestion({
        id: '88888888-8888-4888-8888-888888888888',
        type: 'CHOICE',
        prompt: 'Choose one',
        displayOrder: 0,
        choices: [firstChoice, { ...secondChoice, displayOrder: 0 }],
      }),
    ).toBe(false);
  });
});
