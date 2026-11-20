"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import {
  adminCreatorSearchSchema,
  adminPageSearchSchema,
  adminCreatorListQuerySchema,
  adminPageListQuerySchema,
  adminAppealListQuerySchema,
  type AdminCreatorSummary,
  type AdminPageRecord,
  type AdminAppealInboxItem,
} from "@letterly/contracts/admin-operations";
import {
  listAdminCreators,
  searchAdminCreators,
  listAdminPages,
  searchAdminPages,
  listAdminAppeals,
} from "./operations-api";
import { humanize } from "./moderation-presentation";
import styles from "./admin-theme.module.css";
import { AdminAppealIntake } from "./admin-appeal-intake";

type Kind = "creators" | "pages" | "appeals";
type RecordItem = AdminCreatorSummary | AdminPageRecord | AdminAppealInboxItem;
type Results = { items: RecordItem[]; nextCursor: string | null };
type Search = {
  field: string;
  value: string;
  token: string;
  cursor?: string;
  filters: string;
};
type Filters = {
  moderationStatus: string;
  status: string;
  templateKey: string;
  createdFrom: string;
  createdTo: string;
  targetType: string;
  targetId: string;
};
const selectClass =
  "min-h-11 w-full rounded-md border border-input bg-surface px-3 text-base";
export function adminTargetHref(type: string | null, id: string | null) {
  if (!id) return null;
  const path =
    type === "USER"
      ? "/admin/creators/"
      : type === "PAGE"
        ? "/admin/pages/"
        : type === "REPORT"
          ? "/admin/moderation/reports/"
          : type === "APPEAL"
            ? "/admin/moderation/appeals/"
            : null;
  return path ? `${path}${encodeURIComponent(id)}` : null;
}
export function AdminDate({ value }: { value: string | null }) {
  return value ? (
    <time dateTime={value}>
      {new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(new Date(value))}{" "}
      UTC
    </time>
  ) : (
    <>Not recorded</>
  );
}
export function DirectoryRecords({
  items,
  kind,
}: {
  items: RecordItem[];
  kind: Kind;
}) {
  function cells(item: RecordItem) {
    const href =
      kind === "creators"
        ? `/admin/creators/${encodeURIComponent(item.id)}`
        : kind === "pages"
          ? `/admin/pages/${item.id}`
          : `/admin/moderation/appeals/${item.id}`;
    return [
      <Link
        key="record"
        href={href}
        className="inline-flex min-h-11 items-center break-all font-semibold text-wine underline"
      >
        {"name" in item
          ? item.name || item.id
          : "slug" in item
            ? item.slug
            : item.id}
      </Link>,
      <span key="state">
        {"moderationStatus" in item
          ? `${humanize(item.moderationStatus)}${"slug" in item ? ` · ${humanize(item.status)}` : ""}`
          : humanize(item.status)}
      </span>,
      <span key="context">
        {"email" in item ? (
          <>
            {item.email}
            <span className="mt-1 block text-ink-muted">
              {item.pageCount} {item.pageCount === 1 ? "page" : "pages"}
            </span>
          </>
        ) : "templateKey" in item ? (
          `${item.templateKey} · Version ${item.templateVersion}`
        ) : (
          humanize(item.reasonCode)
        )}
      </span>,
      <span key="date">
        <AdminDate value={item.createdAt} />
      </span>,
    ];
  }
  const labels = [
    kind === "creators" ? "Creator" : kind === "pages" ? "Page" : "Appeal",
    "State",
    kind === "creators" ? "Email" : kind === "pages" ? "Template" : "Reason",
    "Created (UTC)",
  ];
  return (
    <>
      <table className="hidden w-full table-fixed text-left text-sm md:table">
        <caption className="sr-only">{humanize(kind)} results</caption>
        <thead>
          <tr>
            {labels.map((label) => (
              <th
                key={label}
                scope="col"
                className="border-b border-[var(--admin-divider)] px-3 py-4 font-semibold"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              {cells(item).map((cell, index) => (
                <td
                  key={labels[index]}
                  className="break-words border-b border-[var(--admin-divider)] px-3 py-4 align-top [overflow-wrap:anywhere]"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="grid gap-4 md:hidden">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-md border border-[var(--admin-divider)] p-4"
          >
            <dl className="grid gap-3">
              {cells(item).map((cell, index) => (
                <div key={labels[index]}>
                  <dt className="text-sm text-ink-muted">{labels[index]}</dt>
                  <dd className="break-all">{cell}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

export function AdminDirectory({
  kind,
  creatorId,
  embedded = false,
}: {
  kind: Kind;
  creatorId?: string;
  embedded?: boolean;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState<Search | null>(null);
  const [ownedCursor, setOwnedCursor] = useState<string | undefined>();
  const filterValues: Filters = {
    moderationStatus: params.get("moderationStatus") ?? "",
    status: params.get("status") ?? "",
    templateKey: params.get("templateKey") ?? "",
    createdFrom: params.get("createdFrom") ?? "",
    createdTo: params.get("createdTo") ?? "",
    targetType: kind === "appeals" ? (params.get("targetType") ?? "") : "",
    targetId: kind === "appeals" ? (params.get("targetId") ?? "") : "",
  };
  const filters = embedded
    ? {}
    : Object.fromEntries(
        Object.entries(filterValues).filter(([, value]) => value),
      );
  const filtersKey = JSON.stringify(filters);
  const currentCursor = search
    ? search.filters === filtersKey
      ? search.cursor
      : undefined
    : embedded
      ? ownedCursor
      : (params.get("cursor") ?? undefined);
  const query = useQuery<Results>({
    queryKey: [
      "admin-directory",
      kind,
      creatorId ?? null,
      filtersKey,
      search?.token ?? null,
      currentCursor ?? null,
    ],
    queryFn: ({ signal }) => {
      const input = {
        ...filters,
        ...(creatorId ? { creatorId } : {}),
        cursor: currentCursor,
        size: 25,
      };
      if (kind === "creators")
        return search
          ? searchAdminCreators(
              adminCreatorSearchSchema.parse({
                ...input,
                field: search.field,
                value: search.value,
              }),
              { signal },
            )
          : listAdminCreators(input, { signal });
      if (kind === "pages")
        return search
          ? searchAdminPages(
              adminPageSearchSchema.parse({
                ...input,
                field: search.field,
                value: search.value,
              }),
              { signal },
            )
          : listAdminPages(input, { signal });
      return listAdminAppeals(input, { signal });
    },
  });
  const searchForm = useForm<{ field: string; value: string }>({
    defaultValues: { field: "id", value: "" },
  });
  const filterForm = useForm<Filters>({ values: filterValues });
  function update(values: Record<string, string>) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(values))
      if (value) next.set(key, value);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`);
  }
  function nextPage() {
    const cursor = query.data?.nextCursor;
    if (!cursor) return;
    if (embedded) setOwnedCursor(cursor);
    else if (search) setSearch({ ...search, cursor, filters: filtersKey });
    else update({ ...filters, cursor });
  }
  const body = (
    <>
      {!embedded ? (
        <header>
          <h1 className="text-3xl font-semibold">{humanize(kind)}</h1>
          <p className="mt-2 text-ink-muted">
            {kind === "appeals"
              ? "Review external support appeals and follow their decisions."
              : kind === "creators"
                ? "Find creator accounts and review their status and owned pages."
                : "Find pages and review their publication and moderation state."}
          </p>
        </header>
      ) : (
        <h2 className="text-xl font-semibold">Owned pages</h2>
      )}
      {kind === "appeals" ? <AdminAppealIntake /> : null}
      {!embedded && kind !== "appeals" ? (
        <section className={styles.panel} aria-label="Record search">
          <form
            className="grid items-end gap-4 md:grid-cols-[10rem_minmax(0,1fr)_auto]"
            noValidate
            onSubmit={searchForm.handleSubmit((values) => {
              const parsed = (
                kind === "creators"
                  ? adminCreatorSearchSchema
                  : adminPageSearchSchema
              ).safeParse({ ...filters, ...values });
              if (!parsed.success) {
                searchForm.setError("value", {
                  message:
                    kind === "creators" && values.field === "email"
                      ? "Enter a conventional email address of up to 254 characters after trimming."
                      : "Enter a valid value and check the filters.",
                });
                return;
              }
              setSearch({
                field: parsed.data.field,
                value: parsed.data.value,
                token: crypto.randomUUID(),
                filters: filtersKey,
              });
            })}
          >
            <label className="grid gap-2 font-medium">
              Search by
              <select className={selectClass} {...searchForm.register("field")}>
                <option value="id">ID</option>
                {kind === "creators" ? (
                  <>
                    <option value="name">Name prefix</option>
                    <option value="email">Email address</option>
                  </>
                ) : (
                  <option value="slug">Slug</option>
                )}
              </select>
            </label>
            <label className="grid gap-2 font-medium">
              {searchForm.watch("field") === "email"
                ? "Email address"
                : "Search value"}
              <Input
                {...searchForm.register("value")}
                aria-invalid={Boolean(searchForm.formState.errors.value)}
                aria-describedby="directory-search-error directory-search-help"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <Button type="submit">Search {kind}</Button>
            <p
              className="text-sm text-ink-muted md:col-span-3"
              id="directory-search-help"
            >
              Use an exact ID
              {kind === "creators"
                ? ", a name prefix of 2 to 100 characters, or a conventional email address of up to 254 characters after trimming."
                : " or an exact lowercase slug."}
            </p>
            <p
              id="directory-search-error"
              role={searchForm.formState.errors.value ? "alert" : undefined}
              className="text-sm text-error md:col-span-3"
            >
              {searchForm.formState.errors.value?.message}
            </p>
          </form>
          {search ? (
            <Button
              className="mt-4"
              variant="secondary"
              onClick={() => {
                setSearch(null);
                searchForm.reset({
                  field: searchForm.getValues("field"),
                  value: "",
                });
                update(filters);
              }}
            >
              Clear search
            </Button>
          ) : null}
        </section>
      ) : null}
      {!embedded ? (
        <section className={styles.panel} aria-label="Record filters">
          <form
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            onSubmit={filterForm.handleSubmit((values) => {
              const next = Object.fromEntries(
                Object.entries(values).filter(([, value]) => value),
              );
              const parsed = (
                kind === "creators"
                  ? adminCreatorListQuerySchema
                  : kind === "pages"
                    ? adminPageListQuerySchema
                    : adminAppealListQuerySchema
              ).safeParse(next);
              if (!parsed.success) {
                filterForm.setError("root", {
                  message:
                    "Check the filters. Use valid UTC instants with a positive interval of at most 366 days, and supply a target type with any target ID.",
                });
                return;
              }
              update(next);
            })}
          >
            {kind !== "appeals" ? (
              <label className="grid gap-2 text-sm font-medium">
                Moderation state
                <select
                  className={selectClass}
                  {...filterForm.register("moderationStatus")}
                >
                  <option value="">All states</option>
                  <option value="ACTIVE">Active</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              </label>
            ) : null}
            {kind !== "creators" ? (
              <label className="grid gap-2 text-sm font-medium">
                {kind === "pages" ? "Publication state" : "Appeal state"}
                <select
                  className={selectClass}
                  {...filterForm.register("status")}
                >
                  <option value="">All states</option>
                  {(kind === "pages"
                    ? ["DRAFT", "PUBLISHED", "UNPUBLISHED", "ARCHIVED"]
                    : ["REQUESTED", "ACCEPTED", "REJECTED"]
                  ).map((value) => (
                    <option key={value} value={value}>
                      {humanize(value)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {kind === "pages" ? (
              <label className="grid gap-2 text-sm font-medium">
                Template key
                <Input {...filterForm.register("templateKey")} />
              </label>
            ) : null}
            {kind !== "appeals" ? (
              <>
                <label className="grid gap-2 text-sm font-medium">
                  Created from (UTC instant)
                  <Input
                    {...filterForm.register("createdFrom")}
                    placeholder="2026-11-01T00:00:00Z"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Created before (UTC instant)
                  <Input
                    {...filterForm.register("createdTo")}
                    placeholder="2026-12-01T00:00:00Z"
                  />
                </label>
              </>
            ) : null}
            {kind === "appeals" ? (
              <>
                <label className="grid gap-2 text-sm font-medium">
                  Target type
                  <select
                    className={selectClass}
                    {...filterForm.register("targetType")}
                  >
                    <option value="">All targets</option>
                    {["USER", "PAGE", "REPORT", "APPEAL"].map((value) => (
                      <option key={value} value={value}>
                        {value === "USER" ? "Creator account" : humanize(value)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Target ID
                  <Input {...filterForm.register("targetId")} maxLength={200} />
                </label>
              </>
            ) : null}
            {filterForm.formState.errors.root ? (
              <p role="alert" className="text-error">
                {filterForm.formState.errors.root.message}
              </p>
            ) : null}
            <div className="flex flex-wrap items-end gap-3">
              <Button type="submit">Apply filters</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => update({})}
              >
                Reset filters
              </Button>
            </div>
          </form>
        </section>
      ) : null}
      <section className={styles.panel} aria-label={`${kind} results`}>
        {query.error ? (
          <div role="alert">
            <h2 className="text-lg font-semibold">Could not load {kind}</h2>
            <p className="mt-2 text-ink-muted">
              Check the filters or retry when the service is available.
            </p>
            <Button
              className="mt-4"
              loading={query.isFetching}
              onClick={() => void query.refetch()}
            >
              Retry results
            </Button>
          </div>
        ) : query.data ? (
          query.data.items.length ? (
            <DirectoryRecords items={query.data.items} kind={kind} />
          ) : (
            <p role="status">No {kind} match these filters.</p>
          )
        ) : (
          <p role="status" aria-busy="true">
            Loading {kind}…
          </p>
        )}
        {query.data?.nextCursor ? (
          <Button
            className="mt-5"
            variant="secondary"
            onClick={nextPage}
            loading={query.isFetching}
          >
            Next results
          </Button>
        ) : null}
        {currentCursor ? (
          <Button
            className="ml-3 mt-5"
            variant="secondary"
            onClick={() =>
              embedded
                ? setOwnedCursor(undefined)
                : search
                  ? setSearch({
                      ...search,
                      cursor: undefined,
                      filters: filtersKey,
                    })
                  : update(filters)
            }
          >
            First results
          </Button>
        ) : null}
      </section>
    </>
  );
  return embedded ? (
    <div className="grid min-w-0 gap-5">{body}</div>
  ) : (
    <main
      id="main-content"
      className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 p-4 md:p-6 lg:p-8"
    >
      {body}
    </main>
  );
}
