export interface MonitorAddon {
  name: string;
  description: string;
  monitor: (address: string) => Promise<string>;
  addonPath: string;
}
