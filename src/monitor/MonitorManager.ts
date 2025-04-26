import { Worker } from "worker_threads";
import { StateManager } from "../state/StateManager";
import { AddonManager } from "../addons/AddonManager";
import { Widgets } from "blessed";
import path from "path";
import { UIManager } from "../ui/UIManager";

export class MonitorManager {
  private state: StateManager;
  private addons: AddonManager;
  private progressBar: Widgets.ProgressBarElement;
  private checkingInProgress: boolean = false;
  private timeUntilNextCheck: number = 5;
  private UIManager: UIManager;

  constructor(state: StateManager, addons: AddonManager, UIManager: UIManager) {
    this.state = state;
    this.addons = addons;
    this.progressBar = UIManager.getProgressBar();
    this.UIManager = UIManager;
  }

  public startPeriodicChecks(): void {
    setInterval(() => {
      if (!this.checkingInProgress) {
        this.timeUntilNextCheck -= 1;

        this.progressBar.setProgress((5 - this.timeUntilNextCheck) * 20);
        this.progressBar.setLabel(
          `Next check: ${this.timeUntilNextCheck} seconds`
        );
        this.UIManager.getScreen().render();

        if (this.timeUntilNextCheck <= 0) {
          this.timeUntilNextCheck = 5;
          this.performChecks();
        }
      }
    }, 1000);
  }

  public async performChecks(): Promise<void> {
    if (this.checkingInProgress) {
      return;
    }

    this.checkingInProgress = true;
    this.progressBar.setLabel(
      `Checking ${this.state.monitoredApps.length} apps...`
    );
    this.progressBar.style.bar.fg = "orange";
    this.UIManager.getScreen().render();

    const totalApps = this.state.monitoredApps.length;
    let completedCount = 0;

    const updateProgress = () => {
      completedCount += 1;
      const progressPercentage = (completedCount / totalApps) * 100;
      this.progressBar.setProgress(progressPercentage);
      this.progressBar.setLabel(
        `Pending: ${totalApps - completedCount}, Completed: ${completedCount}`
      );
      this.UIManager.getScreen().render();
    };

    const promises = this.state.monitoredApps.map(async (app) => {
      const addon = this.state.addons.find((addon) => addon.name === app.addon);
      if (!addon) {
        this.state.updateAppStatus(app._id, {
          success: false,
          message: "Addon not found.",
        });
        updateProgress();
        return;
      }

      try {
        const result = await this.runWorker(addon.addonPath, app.address);
        this.state.updateAppStatus(app._id, {
          ...result,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        this.state.updateAppStatus(app._id, {
          success: false,
          message: `Error: ${(err as Error).message}`,
        });
      } finally {
        updateProgress();
      }
    });

    await Promise.allSettled(promises);

    this.progressBar.style.bar.fg = "yellow";
    this.progressBar.setLabel("Next check: 5 seconds");
    this.checkingInProgress = false;
  }

  private runWorker(addonPath: string, address: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        path.resolve(process.cwd(), "monitorWorker.js"),
        { workerData: { addonPath, address } }
      );

      worker.on("message", (message) => resolve(message));
      worker.on("error", (err) => reject(err));
      worker.on("exit", (code) => {
        if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
      });
    });
  }
}
