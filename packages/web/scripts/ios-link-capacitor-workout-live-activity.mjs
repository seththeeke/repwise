/**
 * After `cap sync ios`, CapApp-SPM points at ../../../../capacitor-workout-live-activity while
 * App.xcodeproj uses CapacitorWorkoutLiveActivity/. SwiftPM then treats them as two packages and
 * the WorkoutActivityKit product disappears from the Xcode target. This script:
 * 1) Symlinks ios/App/CapacitorWorkoutLiveActivity -> ../../../capacitor-workout-live-activity
 * 2) Rewrites CapApp-SPM/Package.swift to use ../CapacitorWorkoutLiveActivity (same path as Xcode).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, '..');
const appDir = path.join(webRoot, 'ios', 'App');
const linkName = path.join(appDir, 'CapacitorWorkoutLiveActivity');
const targetDir = path.join(webRoot, '..', 'capacitor-workout-live-activity');
const capAppSpm = path.join(appDir, 'CapApp-SPM', 'Package.swift');

const rel = path.relative(appDir, targetDir);
try {
  fs.rmSync(linkName, { recursive: true, force: true });
} catch {
  /* ignore */
}
fs.symlinkSync(rel, linkName, 'dir');

let pkg = fs.readFileSync(capAppSpm, 'utf8');
pkg = pkg.replace(
  /\.package\(name: "CapacitorWorkoutLiveActivity", path: "[^"]+"\)/,
  '.package(name: "CapacitorWorkoutLiveActivity", path: "../CapacitorWorkoutLiveActivity")'
);
// Match capacitor-workout-live-activity Package.swift (ActivityKit); cap sync resets to .v16.
pkg = pkg.replace(/platforms: \[[^\]]+\]/, 'platforms: [.iOS("16.2")]');

fs.writeFileSync(capAppSpm, pkg);

console.log('[ios-link] CapacitorWorkoutLiveActivity ->', rel);
console.log('[ios-link] CapApp-SPM CapacitorWorkoutLiveActivity path + iOS 16.2 unified');
