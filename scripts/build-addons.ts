import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const addonsSrcDir = path.resolve(__dirname, "../addons-src");
const addonsDestDir = path.resolve(__dirname, "../addons");

if (!fs.existsSync(addonsDestDir)) {
  fs.mkdirSync(addonsDestDir);
}

const createTempTsConfig = (addonPath: string, addonName: string) => {
  const addonOutputDir = path.join(addonsDestDir, addonName);

  if (!fs.existsSync(addonOutputDir)) {
    fs.mkdirSync(addonOutputDir);
  }

  const tsConfig = {
    compilerOptions: {
      target: "ES2020",
      module: "CommonJS",
      strict: true,
      esModuleInterop: true,
      rootDir: addonPath,
      outDir: addonOutputDir,
    },
    include: ["**/*.ts"],
  };

  const tsConfigPath = path.join(addonPath, "tsconfig.temp.json");
  fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
  return tsConfigPath;
};

console.log("Building addons...");

fs.readdirSync(addonsSrcDir).forEach((addon) => {
  const addonPath = path.join(addonsSrcDir, addon);

  if (fs.lstatSync(addonPath).isDirectory()) {
    console.log(`Building addon: ${addon}`);

    try {
      execSync("npm install", { cwd: addonPath, stdio: "inherit" });

      const tempTsConfigPath = createTempTsConfig(addonPath, addon);

      execSync(`npx tsc --project ${tempTsConfigPath}`, {
        cwd: addonPath,
        stdio: "inherit",
      });

      fs.unlinkSync(tempTsConfigPath);

      console.log(`Successfully built ${addon}`);
    } catch (err) {
      console.log(`Failed to build ${addon}: ${(err as Error).message}`);
    }
  }
});

console.log("Addons built successfully.");
