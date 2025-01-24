import fs from "fs";
import { MonitorAddon } from "./types/addon";
import path from "path";
import { LogCommand } from "./getLogsBox";

const addonsDir = path.resolve(__dirname, "addons");

export const getAddons = (log: LogCommand) => {
  const loadedAddons: MonitorAddon[] = [];

  fs.readdirSync(addonsDir).forEach((addonFolder) => {
    const addonPath = path.join(addonsDir, addonFolder, "index.js");

    if (fs.existsSync(addonPath)) {
      try {
        const addon = require(addonPath);
        if (addon && addon.default) {
          loadedAddons.push({ ...addon.default, addonPath });
          log.info(`Loaded addon: ${addon.default.name}`);
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
