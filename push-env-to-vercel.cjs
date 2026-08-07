/**
 * push-env-to-vercel.cjs
 * 
 * Run this once to push all .env variables to Vercel Environment Variables.
 * Usage: node push-env-to-vercel.cjs
 * 
 * Requires: vercel CLI logged in (run `npx vercel login` first if needed)
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const envFile = path.join(__dirname, ".env");

if (!fs.existsSync(envFile)) {
  console.error("❌ .env file not found!");
  process.exit(1);
}

const lines = fs.readFileSync(envFile, "utf-8").split("\n");

const vars = [];
for (const line of lines) {
  const trimmed = line.trim();
  // Skip comments and empty lines
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.substring(0, eqIdx).trim();
  const value = trimmed.substring(eqIdx + 1).trim();
  if (key && value) {
    vars.push({ key, value });
  }
}

// Also add the server-side only alias (without VITE_ prefix) for the proxy function
const bunnyStorageKey = vars.find(v => v.key === "VITE_BUNNY_STORAGE_API_KEY");
const bunnyStorageZone = vars.find(v => v.key === "VITE_BUNNY_STORAGE_ZONE");

if (bunnyStorageKey) {
  vars.push({ key: "BUNNY_STORAGE_API_KEY", value: bunnyStorageKey.value });
  console.log("✅ Added server-side alias: BUNNY_STORAGE_API_KEY");
}
if (bunnyStorageZone) {
  vars.push({ key: "BUNNY_STORAGE_ZONE", value: bunnyStorageZone.value });
  console.log("✅ Added server-side alias: BUNNY_STORAGE_ZONE");
}

console.log(`\n📦 Pushing ${vars.length} environment variables to Vercel...\n`);

let successCount = 0;
let failCount = 0;

for (const { key, value } of vars) {
  try {
    // Use vercel env add with pipe to pass value
    // --force overwrites existing value
    const cmd = `echo ${JSON.stringify(value)} | npx vercel env add ${key} production --force`;
    execSync(cmd, { stdio: "pipe", shell: "cmd.exe" });
    console.log(`  ✅ ${key}`);
    successCount++;
  } catch (err) {
    // Try alternative approach
    try {
      const tmpFile = path.join(__dirname, "_tmp_env_val.txt");
      fs.writeFileSync(tmpFile, value, "utf-8");
      execSync(`npx vercel env rm ${key} production --yes 2>nul || true`, { stdio: "pipe", shell: "cmd.exe" });
      execSync(`npx vercel env add ${key} production < "${tmpFile}"`, { stdio: "pipe", shell: "cmd.exe" });
      fs.unlinkSync(tmpFile);
      console.log(`  ✅ ${key}`);
      successCount++;
    } catch (err2) {
      console.log(`  ⚠️  ${key} — skipped (may already exist or needs manual add)`);
      failCount++;
    }
  }
}

console.log(`\n🎉 Done! ${successCount} pushed, ${failCount} skipped.`);
console.log("\n👉 Now go to Vercel Dashboard → your project → Deployments → Redeploy");
