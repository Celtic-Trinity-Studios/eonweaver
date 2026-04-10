const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  
  // 1. Clear the GLOBAL state.vscdb trajectory summaries
  const globalDbPath = path.join(process.env.APPDATA, 'Antigravity', 'User', 'globalStorage', 'state.vscdb');
  console.log('Opening GLOBAL db:', globalDbPath);
  
  const globalBuf = fs.readFileSync(globalDbPath);
  const globalDb = new SQL.Database(globalBuf);
  
  // Delete trajectory summaries (the conversation list)
  globalDb.run("DELETE FROM ItemTable WHERE key = 'antigravityUnifiedStateSync.trajectorySummaries'");
  // Clear the chat session store  
  globalDb.run("UPDATE ItemTable SET value = '{\"version\":1,\"entries\":{}}' WHERE key = 'chat.ChatSessionStore.index'");
  // Clear sidebar workspaces conversation data
  globalDb.run("DELETE FROM ItemTable WHERE key = 'antigravityUnifiedStateSync.sidebarWorkspaces'");
  
  console.log('Cleared trajectory summaries, chat sessions, and sidebar workspaces from global DB');
  
  // Save the modified database
  const globalData = globalDb.export();
  const globalBuffer = Buffer.from(globalData);
  fs.writeFileSync(globalDbPath, globalBuffer);
  console.log('Saved global DB');
  globalDb.close();
  
  // 2. Clear the WORKSPACE state.vscdb for D&DSundays
  const wsDbPath = path.join(process.env.APPDATA, 'Antigravity', 'User', 'workspaceStorage', 'f9bce63fd068f222d164f75a040d72f6', 'state.vscdb');
  console.log('\nOpening WORKSPACE db:', wsDbPath);
  
  const wsBuf = fs.readFileSync(wsDbPath);
  const wsDb = new SQL.Database(wsBuf);
  
  // Clear chat sessions in workspace too
  wsDb.run("UPDATE ItemTable SET value = '{\"version\":1,\"entries\":{}}' WHERE key = 'chat.ChatSessionStore.index'");
  
  // List any trajectory/conversation keys
  const wsKeys = wsDb.exec("SELECT key FROM ItemTable WHERE key LIKE '%trajectory%' OR key LIKE '%conversation%'");
  if (wsKeys.length > 0) {
    console.log('Found workspace trajectory/conversation keys:');
    wsKeys[0].values.forEach(v => {
      console.log('  Deleting:', v[0]);
      wsDb.run(`DELETE FROM ItemTable WHERE key = ?`, [v[0]]);
    });
  }
  
  const wsData = wsDb.export();
  fs.writeFileSync(wsDbPath, Buffer.from(wsData));
  console.log('Saved workspace DB');
  wsDb.close();
  
  console.log('\nDone! Restart Antigravity to see the changes.');
}

main().catch(e => console.error(e));
