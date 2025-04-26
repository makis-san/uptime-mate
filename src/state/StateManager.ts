import fs from "fs";
import yaml from "yaml";
import path from "path";
import { MonitoredApp } from "../types/app";
import { MonitorAddon } from "../types/addon";

export class StateManager {
  public monitoredApps: MonitoredApp[] = [];
  public addons: MonitorAddon[] = [];
  private yamlFilePath: string;

  constructor() {
    this.yamlFilePath = path.resolve(process.cwd(), "monitored.yml");
    this.loadFromYaml();
  }

  public addApp(app: MonitoredApp): void {
    this.monitoredApps.push(app);
    this.saveToYaml();
  }

  public updateAppStatus(id: string, status: any): void {
    const app = this.monitoredApps.find((app) => app._id === id);
    const fIndex = this.monitoredApps.findIndex((app) => app._id === id);
    if (app) {
      app.lastStatus = status;
      this.monitoredApps[fIndex].lastStatus = status;
      this.saveToYaml();
    }
  }

  private loadFromYaml(): void {
    if (fs.existsSync(this.yamlFilePath)) {
      try {
        const yamlContent = fs.readFileSync(this.yamlFilePath, "utf8");
        this.monitoredApps = yaml.parse(yamlContent) || [];
      } catch (err) {
        console.error(`Failed to load YAML file: ${(err as Error).message}`);
      }
    }
  }

  public refresh() {
    this.loadFromYaml();
    return this.monitoredApps;
  }

  private saveToYaml(): void {
    try {
      const yamlContent = yaml.stringify(this.monitoredApps);
      fs.writeFileSync(this.yamlFilePath, yamlContent, "utf8");
    } catch (err) {
      console.error(`Failed to save YAML file: ${(err as Error).message}`);
    }
  }
}
