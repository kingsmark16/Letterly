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
              regex: '(?:^|/)infrastructure/(?:database|http)(?:/|$)',
              message:
                'Application and domain code use plain inputs and repository error contracts. Keep database and HTTP helpers in infrastructure.',
            },
            {
              regex: '(?:^|/)infrastructure/storage(?:/|$)|^@aws-sdk(?:/|$)',
              message:
                'Application and domain code use media storage ports, not concrete storage infrastructure or provider SDKs.',
            },
            {
              regex:
                '(?:^|/)infrastructure/image-processor(?:\\.[cm]?[jt]s)?$|^(sharp|file-type)(?:$|/)',
              message:
                'Application and domain code use the image processing port. Keep concrete processors and image libraries in infrastructure.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/modules/pages/application/page-password.service.ts',
      'src/modules/pages/application/page-questions.service.ts',
      'src/modules/pages/application/page-reports.service.ts',
      'src/modules/pages/application/page-analytics.service.ts',
      'src/modules/pages/application/page-submissions.service.ts',
      'src/modules/pages/application/page-journeys.service.ts',
      'src/modules/pages/application/page-journey-submissions.service.ts',
      'src/modules/pages/application/page-audio-link.service.ts',
      'src/modules/pages/application/page-audio.service.ts',
      'src/modules/pages/application/media-cleanup.service.ts',
      'src/modules/pages/application/media-cleanup.ts',
      'src/modules/pages/application/page-media.service.ts',
      'src/modules/pages/application/page-media-failure-logger.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(@nestjs(?:$|/)|express(?:$|/))',
              message:
                'Keep migrated service framework wiring in PagesModule. Application services use plain constructor inputs.',
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
