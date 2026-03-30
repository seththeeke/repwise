/**
 * After `cap sync`, merge our custom native plugin into packageClassList so NSClassFromString can load it.
 * Module name matches the Xcode target product module (App).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '../ios/App/App/capacitor.config.json');
const json = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const extra = 'App.KeychainPasswordPlugin';
if (!json.packageClassList.includes(extra)) {
  json.packageClassList.push(extra);
}
fs.writeFileSync(configPath, JSON.stringify(json, null, '\t') + '\n');
