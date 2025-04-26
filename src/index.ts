import { StateManager } from "./state/StateManager";
import { AddonManager } from "./addons/AddonManager";
import { UIManager } from "./ui/UIManager";
import { MonitorManager } from "./monitor/MonitorManager";

class ApplicationManager {
  private stateManager = new StateManager();
  private uiManager = new UIManager(this.stateManager);
  private addonManager = new AddonManager(this.stateManager);
  private monitorManager = new MonitorManager(
    this.stateManager,
    this.addonManager,
    this.uiManager
  );

  constructor() {
    this.uiManager.initialize();
    this.uiManager.getScreen().render();
  }

  public start(): void {
    this.monitorManager.startPeriodicChecks();
  }
}

// Start the application
const app = new ApplicationManager();
app.start();
