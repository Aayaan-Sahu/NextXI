// Learn more https://docs.expo.io/guides/customizing-metro
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// shared/ lives outside this project (it is imported by the Next.js app too),
// so Metro has to be told to watch it — otherwise `@shared/*` imports and
// `../shared/theme.css` resolve at build time but never trigger a rebuild,
// and edits appear to do nothing.
config.watchFolders = [path.join(repoRoot, "shared")];

// The app has its own complete node_modules — the repo root is not a Bun
// workspace and hoists nothing — so resolution is pinned here rather than
// left to walk up into the Next.js app's tree. `disableHierarchicalLookup`
// is deliberately NOT set: `expo doctor` fails the Metro config check on it,
// and it is unnecessary once this path is explicit.
config.resolver.nodeModulesPaths = [path.join(projectRoot, "node_modules")];

module.exports = config;
