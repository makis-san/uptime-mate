import fs from "fs";
import { MonitorAddon } from "./types/addon";
import path from "path";
import { LogCommand } from "./src/ui/getLogsBox";

const addonsDir = path.resolve(__dirname, "addons");

export const getAddons = (log: LogCommand) => {
  const loadedAddons: MonitorAddon[] = [];

  fs.readdirSync(addonsDir).forEach((addonFolder) => {
    const addonPath = path.join(addonsDir, addonFolder, "index.js");

    if (fs.existsSync(addonPath)) {
      try {
        const addon = require(addonPath); // Dynamically load the addon
        const addonExport = addon.default || addon; // Handle default or named exports

        if (addonExport) {
          loadedAddons.push({ ...addonExport, addonPath });
          log.info(`Loaded addon: ${addonExport.name}`);
        } else {
          log.warn(
            `Addon at ${addonPath} does not export a default MonitorAddon.`
          );
        }
      } catch (err) {
        log.error(
          `Failed to load addon at ${addonPath}: ${(err as Error).message}`
        );
      }
    } else {
      log.warn(`No index.js found in ${addonFolder}. Skipping.`);
    }
  });

  return loadedAddons;
};
