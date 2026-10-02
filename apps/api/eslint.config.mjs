// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@nestjs/common',
              importNames: [
                'BadRequestException',
                'UnauthorizedException',
                'ForbiddenException',
                'NotFoundException',
                'ConflictException',
                'TooManyRequestsException',
                'PayloadTooLargeException',
                'ServiceUnavailableException',
              ],
              message:
                'Use ApiException for expected API failures outside shared HTTP infrastructure.',
            },
          ],
        },
      ],
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  {
    files: [
      'src/modules/pages/application/**/*.ts',
      'src/modules/pages/domain/**/*.ts',
    ],
    ignores: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(@letterly/database|@prisma/client)(?:$|/)',
              message:
                'Keep Prisma and database imports in infrastructure. Application and domain code use plain values and repository ports.',
            },
            {
              regex: '(?:^|/)infrastructure/database(?:/|$)',
              message:
                'Application and domain code use repository error contracts, not database infrastructure helpers.',
            },
            {
              regex: '(?:^|/)infrastructure/storage(?:/|$)|^@aws-sdk(?:/|$)',
              message:
                'Application and domain code use media storage ports, not concrete storage infrastructure or provider SDKs.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/modules/pages/infrastructure/templates/*draft-persistence*.ts',
    ],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex:
                '^(?!node:crypto$|@letterly/(?:templates|database)(?:$|/)|\\./[^/]+$|\\.\\./\\.\\./application/pages\\.repository$).+',
              message:
                'Draft persistence adapters use shared template schemas, transaction types, UUID generation, repository port types, and local adapter files. Keep framework, client ownership, and shared page writes in the repository.',
            },
          ],
          paths: [
            {
              name: '@letterly/database',
              importNames: ['PrismaClient'],
              message: 'Use the supplied transaction, never a Prisma client.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/modules/pages/infrastructure/templates/*owner*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex:
                '^(?!@letterly/templates(?:$|/)|\\./[^/]+$|\\.\\./\\.\\./(?:domain/page\\.types|application/pages\\.repository)$).+',
              message:
                'Owner projection adapters import only template schemas, plain page types, repository port types, and local mapping files. Keep framework, clients, and queries in the repository.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/modules/pages/application/projections/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex:
                '^(?!@letterly/(?:contracts|templates)(?:$|/)|\\./[^/]+$|\\.\\./\\.\\./domain/page\\.types$).+',
              message:
                'Public projection adapters import only contracts, template definitions, plain page types, and local mapping files. Keep framework, services, and persistence in the orchestrator.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/modules/pages/application/templates/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(?!@letterly/templates(?:$|/)|\\./[^/]+$).+',
              message:
                'Template policies import only shared template definitions and local policy files. Keep services, framework, persistence, and telemetry in the orchestrator.',
            },
          ],
        },
      ],
    },
  },
);
