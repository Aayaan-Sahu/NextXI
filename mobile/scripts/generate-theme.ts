import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateTheme, readThemeCss } from "./theme-codegen";

const out = join(import.meta.dir, "..", "lib", "theme.ts");
writeFileSync(out, generateTheme(readThemeCss()));
console.log(`wrote ${out}`);
