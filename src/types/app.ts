export interface MonitoredApp {
  _id: string;
  address: string;
  addon: string;
  lastStatus?: {
    success: boolean;
    message: string;
    timestamp: string;
  };
  style?: Record<string, any>;
}
