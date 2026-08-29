import { Config } from "@remotion/cli/config";

Config.setEntryPoint("remotion/index.ts");
// staticFile() reads from here, not the Next.js public/ folder: the tutorial
// captures are large, local-only working files and must never be deployed.
Config.setPublicDir("remotion/public");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
