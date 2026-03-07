declare module "pg" {
  export interface QueryResult<Row = Record<string, unknown>> {
    rows: Row[];
  }

  export interface PoolClient {
    query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<QueryResult<Row>>;
    release(): void;
  }

  export class Pool {
    constructor(config?: Record<string, unknown>);
    query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<QueryResult<Row>>;
    connect(): Promise<PoolClient>;
  }
}
