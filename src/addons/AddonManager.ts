import { MonitorAddon } from "../types/addon";
import fs from "fs";
import path from "path";
import { StateManager } from "../state/StateManager";

export class AddonManager {
  private addonsDir = path.resolve(process.cwd(), "addons");
  private state: StateManager;

  constructor(state: StateManager) {
    this.state = state;
    this.loadAddons();
  }

  public loadAddons(): void {
    const loadedAddons: MonitorAddon[] = [];

    fs.readdirSync(this.addonsDir).forEach((folder) => {
      const addonPath = path.join(this.addonsDir, folder, "index.js");
      if (fs.existsSync(addonPath)) {
        try {
          const addon = require(addonPath);
          loadedAddons.push({ ...addon.default, addonPath });
        } catch (err) {
          console.error(`Failed to load addon at ${addonPath}: ${err}`);
        }
      }
    });

    this.state.addons = loadedAddons;
  }
}
