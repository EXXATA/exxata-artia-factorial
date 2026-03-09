/**
 * MySQL Client - Conexão direta com Artia MySQL usando Deno
 */

import { Client } from 'https://deno.land/x/mysql@v2.12.1/mod.ts';

let client: Client | null = null;

/**
 * Obtém ou cria conexão MySQL
 */
export async function getMySQLClient(): Promise<Client> {
  if (client) {
    return client;
  }

  client = await new Client().connect({
    hostname: Deno.env.get('ARTIA_DB_HOST') || 'exxata.db.artia.com',
    port: parseInt(Deno.env.get('ARTIA_DB_PORT') || '3306'),
    username: Deno.env.get('ARTIA_DB_USER') || 'cliente-9115',
    password: Deno.env.get('ARTIA_DB_PASSWORD') || '',
    db: Deno.env.get('ARTIA_DB_NAME') || 'artia',
  });

  return client;
}

/**
 * Fecha conexão MySQL
 */
export async function closeMySQLClient() {
  if (client) {
    await client.close();
    client = null;
  }
}

/**
 * Executa query e retorna resultados
 */
export async function executeQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
  const mysqlClient = await getMySQLClient();
  const result = await mysqlClient.query(query, params);
  return result as T[];
}
