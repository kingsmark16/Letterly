import {
  chooseYourHeartTemplate,
  secretLetterTemplate,
} from "@letterly/templates";
import { disconnectPrisma, getPrismaClient } from "../src/index.js";

const prisma = getPrismaClient();

async function main(): Promise<void> {
  const category = await prisma.category.upsert({
    where: {
      key: "confession",
    },
    update: {
      name: "Confession",
      description: "Personal letters and heartfelt messages.",
      status: "ACTIVE",
      displayOrder: 1,
    },
    create: {
      key: "confession",
      name: "Confession",
      description: "Personal letters and heartfelt messages.",
      status: "ACTIVE",
      displayOrder: 1,
    },
  });

  const template = await prisma.template.upsert({
    where: {
      categoryId_key: {
        categoryId: category.id,
        key: "secret-letter",
      },
    },
    update: {
      name: "Secret Letter",
      description: "A romantic letter with optional interactive features.",
      status: "ACTIVE",
      displayOrder: 1,
    },
    create: {
      categoryId: category.id,
      key: "secret-letter",
      name: "Secret Letter",
      description: "A romantic letter with optional interactive features.",
      status: "ACTIVE",
      displayOrder: 1,
    },
  });

  const version = await prisma.templateVersion.upsert({
    where: {
      templateId_version: {
        templateId: template.id,
        version: secretLetterTemplate.version,
      },
    },
    update: {
      registryKey: secretLetterTemplate.registryKey,
      status: "ACTIVE",
    },
    create: {
      templateId: template.id,
      version: secretLetterTemplate.version,
      registryKey: secretLetterTemplate.registryKey,
      status: "ACTIVE",
    },
  });
  console.log({
    category: category.key,
    template: template.key,
    version: version.version,
  });

  const journeyTemplate = await prisma.template.upsert({
    where: {
      categoryId_key: {
        categoryId: category.id,
        key: "choose-your-heart",
      },
    },
    update: {
      name: "Choose Your Heart",
      description: "A guided branching journey with a personal result.",
      status: "ACTIVE",
      displayOrder: 2,
    },
    create: {
      categoryId: category.id,
      key: "choose-your-heart",
      name: "Choose Your Heart",
      description: "A guided branching journey with a personal result.",
      status: "ACTIVE",
      displayOrder: 2,
    },
  });

  const journeyVersion = await prisma.templateVersion.upsert({
    where: {
      templateId_version: {
        templateId: journeyTemplate.id,
        version: chooseYourHeartTemplate.version,
      },
    },
    update: {
      registryKey: chooseYourHeartTemplate.registryKey,
      status: "ACTIVE",
    },
    create: {
      templateId: journeyTemplate.id,
      version: chooseYourHeartTemplate.version,
      registryKey: chooseYourHeartTemplate.registryKey,
      status: "ACTIVE",
    },
  });

  console.log({
    category: category.key,
    template: journeyTemplate.key,
    version: journeyVersion.version,
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
