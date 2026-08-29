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

// With a watch folder above the project, Metro would otherwise also consider
// the repo root's node_modules (the Next.js app's) when resolving. The mobile
// app has its own dependency tree and must not reach into it.
config.resolver.nodeModulesPaths = [path.join(projectRoot, "node_modules")];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
