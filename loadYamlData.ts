import path from "path";
import yaml from "js-yaml";
import fs from "fs";
import { LogCommand } from "./getLogsBox";

const yamlFilePath = path.resolve(__dirname, "monitored.yml");

export const loadYamlData = (log: LogCommand) => {
  let monitoredApps: {
    address: string;
    addon: string;
    lastStatus?: {
      success: boolean;
      message: string;
      timestamp: string;
    };
  }[] = [];

  if (fs.existsSync(yamlFilePath)) {
    try {
      const yamlContent = fs.readFileSync(yamlFilePath, "utf8");
      monitoredApps = yaml.load(yamlContent) as {
        address: string;
        addon: string;
      }[];
      log.info("Loaded monitored apps from YAML file.");
    } catch (err) {
      log.error(`Failed to load YAML file: ${(err as Error).message}`);
    }
  }

  return monitoredApps;
};
