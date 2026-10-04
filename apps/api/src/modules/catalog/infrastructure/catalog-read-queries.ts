import type {
  CatalogTemplateLookupRead,
  CatalogTemplatePageRead,
} from '../application/catalog.repository';

export interface CatalogReadQuery {
  text: string;
  values: Array<string | number>;
}

const latestVersion = `
  SELECT version."id", version."version", version."registryKey"
  FROM "TemplateVersion" version
  WHERE version."templateId" = t."id" AND version."status" = 'ACTIVE'
  ORDER BY version."version" DESC
  LIMIT 1
`;

function columns(versionField: 'currentVersion' | 'selectedVersion'): string {
  return `
    t."id", t."key", t."name", t."description", t."displayOrder",
    jsonb_build_object('key', c."key") AS "category",
    CASE WHEN v."id" IS NULL THEN NULL ELSE
      jsonb_build_object('id', v."id", 'version', v."version", 'registryKey', v."registryKey")
    END AS "${versionField}"
  `;
}

export const catalogOverviewSql = `
  SELECT c."key", c."name", c."description", c."displayOrder", previews."templates"
  FROM "Category" c
  CROSS JOIN LATERAL (
    SELECT COALESCE(jsonb_agg(row_to_json(family) ORDER BY family."displayOrder", family."id"), '[]'::jsonb) AS "templates"
    FROM (
      SELECT ${columns('currentVersion')}
      FROM "Template" t
      JOIN LATERAL (${latestVersion}) v ON TRUE
      WHERE t."categoryId" = c."id" AND t."status" = 'ACTIVE'
      ORDER BY t."displayOrder" ASC, t."id" ASC
      LIMIT $1::integer
    ) family
  ) previews
  WHERE c."status" = 'ACTIVE'
  ORDER BY c."displayOrder" ASC, c."id" ASC
`;

export function buildCatalogPageQuery(
  input: CatalogTemplatePageRead,
): CatalogReadQuery {
  const values: CatalogReadQuery['values'] = [];
  const bind = (value: string | number) => {
    values.push(value);
    return `$${values.length}`;
  };
  const conditions = [`t."status" = 'ACTIVE'`, `c."status" = 'ACTIVE'`];
  if (input.categoryId)
    conditions.push(`t."categoryId" = ${bind(input.categoryId)}::uuid`);
  if (input.query) {
    const search = bind(`%${input.query}%`);
    conditions.push(
      `(t."name" ILIKE ${search} OR t."description" ILIKE ${search} OR c."name" ILIKE ${search})`,
    );
  }
  const before = input.direction === 'before';
  if (input.position) {
    conditions.push(
      `(t."displayOrder", t."id") ${before ? '<' : '>'} (${bind(input.position.displayOrder)}::integer, ${bind(input.position.id)}::uuid)`,
    );
  }
  const limit = bind(input.size + 1);
  const order = before ? 'DESC' : 'ASC';
  return {
    text: `
      SELECT ${columns('currentVersion')}
      FROM "Template" t
      JOIN "Category" c ON c."id" = t."categoryId"
      JOIN LATERAL (${latestVersion}) v ON TRUE
      WHERE ${conditions.join(' AND ')}
      ORDER BY t."displayOrder" ${order}, t."id" ${order}
      LIMIT ${limit}::integer
    `,
    values,
  };
}

export function buildCatalogLookupQuery(
  input: CatalogTemplateLookupRead,
): CatalogReadQuery {
  const values: CatalogReadQuery['values'] = [input.key];
  const conditions = [
    `t."key" = $1`,
    `t."status" = 'ACTIVE'`,
    `c."status" = 'ACTIVE'`,
  ];
  if (input.categoryKey) {
    values.push(input.categoryKey);
    conditions.push(`c."key" = $${values.length}`);
  }
  let versionCondition = '';
  if (input.version !== undefined) {
    values.push(input.version);
    versionCondition = `AND version."version" = $${values.length}::integer`;
  }
  return {
    text: `
      SELECT ${columns('selectedVersion')}
      FROM "Template" t
      JOIN "Category" c ON c."id" = t."categoryId"
      LEFT JOIN LATERAL (
        SELECT version."id", version."version", version."registryKey"
        FROM "TemplateVersion" version
        WHERE version."templateId" = t."id" AND version."status" = 'ACTIVE' ${versionCondition}
        ORDER BY version."version" DESC LIMIT 1
      ) v ON TRUE
      WHERE ${conditions.join(' AND ')}
      ORDER BY t."displayOrder" ASC, t."id" ASC
      LIMIT 2
    `,
    values,
  };
}
