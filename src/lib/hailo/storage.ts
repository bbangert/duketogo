import { Knex } from 'knex';
import * as R from 'ramda';

interface Info {
  attribute: string;
  text: string;
}

interface ExprOrdered {
  2: {
    id: number;
    token0_id: number;
    token1_id: number;
  };
  3: {
    id: number;
    token0_id: number;
    token1_id: number;
  };
  4: {
    id: number;
    token0_id: number;
    token1_id: number;
    token2_id: number;
    token3_id: number;
  };
  5: {
    id: number;
    token0_id: number;
    token1_id: number;
    token2_id: number;
    token3_id: number;
    token4_id: number;
  };
}

export async function setupDatabase(knex: Knex, order: 5): Promise<ExprOrdered[5]>;
export async function setupDatabase(
  knex: Knex,
  order: number
): Promise<ExprOrdered[keyof ExprOrdered]> {
  await createTables(knex, order);
  // return queries(knex, order);
  return { id: 1, token0_id: 1, token1_id: 2 };
}

async function createTables(knex: Knex, order: number) {
  // If we have our info table, verify the order match.
  if (await knex.schema.hasTable('info')) {
    const tableOrder = await knex<Info>('info').where('attribute', '=', 'order').first();
    if (!tableOrder) {
      // Assume if we don't have an order, we haven't gotten farther and hope for the best
      return;
    }
    if (tableOrder.text !== '5') {
      throw new Error(`Order desired is ${order}, but found ${tableOrder.text}.`);
    }
  }
  await knex.schema.createTable('info', (table) => {
    table.text('attribute').notNullable().primary();
    table.text('text').notNullable();
  });
  await knex.schema.createTable('token', (table) => {
    table.increments('id');
    table.integer('spacing').notNullable();
    table.text('text').notNullable();
    table.integer('count').notNullable();
    table.index('text', 'token_text');
  });
  await knex.schema.createTable('expr', (table) => {
    table.increments('id');
    for (const i of R.range(0, order)) {
      table.integer(`token${i}_id`).notNullable().references('token.id');
      table.index(`token${i}_id`, `expr_token${i}_id`);
    }
    table.index(
      R.range(0, order).map((i) => `token${i}_id`),
      'expr_token_ids'
    );
  });
  await knex.schema.createTable('next_token', (table) => {
    table.increments('id');
    table.integer('expr_id').notNullable().references('expr.id');
    table.integer('token_id').notNullable().references('token.id');
    table.integer('count').notNullable();
    table.index('expr_id', 'next_token_expr_id');
  });
  await knex.schema.createTable('prev_token', (table) => {
    table.increments('id');
    table.integer('expr_id').notNullable().references('expr.id');
    table.integer('token_id').notNullable().references('token.id');
    table.integer('count').notNullable();
    table.index('expr_id', 'prev_token_expr_id');
  });
}
