import { getTableName, type Table } from "drizzle-orm";

export type Row = Record<string, unknown>;

export type SelectCall = {
  kind: "select";
  table: string;
  joins: string[];
  where: unknown[];
  ordered: boolean;
  limit?: number;
};

export type InsertCall = {
  kind: "insert";
  table: string;
  values: Row;
};

export type UpdateCall = {
  kind: "update";
  table: string;
  set: Row;
  where: unknown[];
};

export type DbCall = SelectCall | InsertCall | UpdateCall;

/** Bound values of an `eq()`/`and()` condition, in the order they appear. */
function conditionValues(node: unknown): unknown[] {
  if (node === null || typeof node !== "object") {
    return [];
  }
  const candidate = node as { value?: unknown; queryChunks?: unknown[] };
  if (Array.isArray(candidate.queryChunks)) {
    return candidate.queryChunks.flatMap(conditionValues);
  }
  // A bound parameter holds a single value; the SQL fragments around it hold
  // arrays of strings.
  return "value" in candidate && !Array.isArray(candidate.value)
    ? [candidate.value]
    : [];
}

class SelectQuery implements PromiseLike<Row[]> {
  constructor(
    private readonly call: SelectCall,
    private readonly rows: () => Row[],
  ) {}

  from(table: Table): this {
    this.call.table = getTableName(table);
    return this;
  }

  innerJoin(table: Table): this {
    this.call.joins.push(getTableName(table));
    return this;
  }

  where(condition: unknown): this {
    this.call.where = conditionValues(condition);
    return this;
  }

  orderBy(): this {
    this.call.ordered = true;
    return this;
  }

  limit(rows: number): this {
    this.call.limit = rows;
    return this;
  }

  then<Fulfilled = Row[], Rejected = never>(
    onfulfilled?:
      | ((value: Row[]) => Fulfilled | PromiseLike<Fulfilled>)
      | null,
    onrejected?: ((reason: unknown) => Rejected | PromiseLike<Rejected>) | null,
  ): PromiseLike<Fulfilled | Rejected> {
    return Promise.resolve(this.rows()).then(onfulfilled, onrejected);
  }
}

class InsertQuery implements PromiseLike<Row[]> {
  constructor(
    private readonly call: InsertCall,
    private readonly rows: () => Row[],
  ) {}

  values(values: Row): this {
    this.call.values = values;
    return this;
  }

  returning(): this {
    return this;
  }

  then<Fulfilled = Row[], Rejected = never>(
    onfulfilled?:
      | ((value: Row[]) => Fulfilled | PromiseLike<Fulfilled>)
      | null,
    onrejected?: ((reason: unknown) => Rejected | PromiseLike<Rejected>) | null,
  ): PromiseLike<Fulfilled | Rejected> {
    return Promise.resolve(this.rows()).then(onfulfilled, onrejected);
  }
}

class UpdateQuery implements PromiseLike<Row[]> {
  constructor(
    private readonly call: UpdateCall,
    private readonly rows: () => Row[],
  ) {}

  set(values: Row): this {
    this.call.set = values;
    return this;
  }

  where(condition: unknown): this {
    this.call.where = conditionValues(condition);
    return this;
  }

  returning(): this {
    return this;
  }

  then<Fulfilled = Row[], Rejected = never>(
    onfulfilled?:
      | ((value: Row[]) => Fulfilled | PromiseLike<Fulfilled>)
      | null,
    onrejected?: ((reason: unknown) => Rejected | PromiseLike<Rejected>) | null,
  ): PromiseLike<Fulfilled | Rejected> {
    return Promise.resolve(this.rows()).then(onfulfilled, onrejected);
  }
}

/**
 * Stand-in for the Drizzle client: records the queries an action runs and hands
 * back queued rows in order, so action tests need no database.
 */
export class FakeDb {
  readonly calls: DbCall[] = [];
  private readonly results: Row[][] = [];

  /** Rows for the next queries; a query with nothing queued resolves to `[]`. */
  queue(...results: Row[][]): this {
    this.results.push(...results);
    return this;
  }

  callsOfKind<Kind extends DbCall["kind"]>(
    kind: Kind,
  ): Extract<DbCall, { kind: Kind }>[] {
    return this.calls.filter(
      (call): call is Extract<DbCall, { kind: Kind }> => call.kind === kind,
    );
  }

  select(): SelectQuery {
    const call: SelectCall = {
      kind: "select",
      table: "",
      joins: [],
      where: [],
      ordered: false,
    };
    this.calls.push(call);
    return new SelectQuery(call, () => this.take());
  }

  insert(table: Table): InsertQuery {
    const call: InsertCall = {
      kind: "insert",
      table: getTableName(table),
      values: {},
    };
    this.calls.push(call);
    return new InsertQuery(call, () => this.take());
  }

  update(table: Table): UpdateQuery {
    const call: UpdateCall = {
      kind: "update",
      table: getTableName(table),
      set: {},
      where: [],
    };
    this.calls.push(call);
    return new UpdateQuery(call, () => this.take());
  }

  private take(): Row[] {
    return this.results.shift() ?? [];
  }
}
