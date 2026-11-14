/// <reference types="bun-types" />

import { createRoot } from "react-dom/client"

import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from '../../../../../src/shared/schema';

function App() {

  
  const sqlite = new Database('C:/Users/91832/Projects/novelty/.sandbox/.cloud/.tmp/novelty_test.db');
  console.log('Mcpindex ');
  const db = drizzle(sqlite, { schema });

  return <div className="application">hello</div>
}

createRoot(document.getElementById('root')!).render(App())