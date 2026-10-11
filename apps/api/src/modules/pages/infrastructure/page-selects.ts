export const ownerPageSelect = {
  id: true,
  creatorId: true,
  slug: true,
  displaySlug: true,
  status: true,
  contentVersion: true,
  content: true,
  settings: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  unpublishedAt: true,
  templateVersion: {
    select: {
      id: true,
      version: true,
      registryKey: true,
      template: {
        select: {
          id: true,
          key: true,
        },
      },
    },
  },
  images: {
    select: {
      id: true,
      state: true,
      attachedAt: true,
      sortOrder: true,
      caption: true,
      failureCode: true,
      expiresAt: true,
    },
    orderBy: { sortOrder: 'asc' },
  },
  currentAudio: {
    select: {
      id: true,
      state: true,
      displayTitle: true,
      sourceMimeType: true,
      sourceByteSize: true,
      durationMilliseconds: true,
      failureCode: true,
      createdAt: true,
    },
  },
  currentAudioLink: {
    select: {
      id: true,
      pageId: true,
      provider: true,
      videoId: true,
    },
  },
} as const;

export const ownerPageWithAudioRetrySelect = {
  ...ownerPageSelect,
  audioUploads: {
    where: {
      state: { in: ['FAILED', 'EXPIRED'] as Array<'FAILED' | 'EXPIRED'> },
    },
    select: {
      id: true,
      state: true,
      displayTitle: true,
      sourceMimeType: true,
      sourceByteSize: true,
      durationMilliseconds: true,
      failureCode: true,
      createdAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 1,
  },
} as const;

export const lifecyclePageSelect = {
  ...ownerPageSelect,
  publishedAt: true,
  unpublishedAt: true,
} as const;

export const publicPageSelect = {
  id: true,
  slug: true,
  displaySlug: true,
  content: true,
  settings: true,
  templateVersion: {
    select: {
      registryKey: true,
      version: true,
      template: {
        select: {
          key: true,
        },
      },
    },
  },
  currentAudio: {
    select: {
      state: true,
      displayTitle: true,
      durationMilliseconds: true,
    },
  },
  currentAudioLink: {
    select: {
      id: true,
      pageId: true,
      provider: true,
      videoId: true,
    },
  },
  images: {
    where: {
      state: 'READY',
      attachedAt: { not: null },
    },
    select: {
      id: true,
      caption: true,
    },
    orderBy: { sortOrder: 'asc' },
  },
  questions: {
    select: {
      id: true,
      type: true,
      prompt: true,
      displayOrder: true,
      choices: {
        select: {
          id: true,
          label: true,
          displayOrder: true,
        },
        orderBy: { displayOrder: 'asc' },
      },
    },
    orderBy: { displayOrder: 'asc' },
  },
  pageJourney: {
    select: {
      publishedRevision: {
        select: {
          revisionNumber: true,
          maxDepth: true,
          rootQuestion: { select: { key: true } },
          questions: {
            select: {
              key: true,
              prompt: true,
              displayOrder: true,
              choices: {
                select: {
                  key: true,
                  label: true,
                  displayOrder: true,
                  nextQuestion: { select: { key: true } },
                  outcome: { select: { key: true } },
                },
                orderBy: { displayOrder: 'asc' },
              },
            },
            orderBy: { displayOrder: 'asc' },
          },
          outcomes: {
            select: {
              key: true,
              title: true,
              resultMessage: true,
              displayOrder: true,
            },
            orderBy: { displayOrder: 'asc' },
          },
        },
      },
    },
  },
} as const;

export const draftSummarySelect = {
  id: true,
  content: true,
  status: true,
  contentVersion: true,
  createdAt: true,
  updatedAt: true,
  pageJourney: {
    select: {
      draftRevision: {
        select: {
          rootQuestion: {
            select: {
              prompt: true,
              choices: {
                select: { key: true, label: true },
                orderBy: { displayOrder: 'asc' },
              },
            },
          },
        },
      },
    },
  },
  templateVersion: {
    select: {
      id: true,
      version: true,
      registryKey: true,
      template: {
        select: {
          id: true,
          key: true,
        },
      },
    },
  },
} as const;
