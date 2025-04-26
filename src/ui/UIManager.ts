import blessed from "blessed";
import { StateManager } from "../state/StateManager";
import { MonitorManager } from "../monitor/MonitorManager";
import { getLogsBox } from "./getLogsBox";

export class UIManager {
  private screen = blessed.screen({ smartCSR: true, title: "Monitoring App" });

  private menu: blessed.Widgets.ListElement;
  private mainBox: blessed.Widgets.ScrollableBoxElement;
  private logsBox: blessed.Widgets.BoxElement;
  private progressBar: blessed.Widgets.ProgressBarElement;
  private state: StateManager;
  private log: {
    warn: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
  };

  constructor(state: StateManager) {
    this.state = state;

    const { log, node: logsNode } = getLogsBox();
    this.logsBox = logsNode;
    this.log = log;

    this.menu = this.createMenu();
    this.mainBox = this.createMainBox();
    this.progressBar = this.createProgressBar();
  }

  public initialize() {
    this.screen.append(this.menu);
    this.screen.append(this.mainBox);
    this.screen.append(this.logsBox);
    this.screen.append(this.progressBar);

    // Render the screen after all components are appended
    this.screen.render();

    // Refresh monitored apps after UI is ready
    setTimeout(() => this.refreshMonitoredApps(), 100);

    // Handle screen resize events
    this.screen.on("resize", () => {
      this.refreshMonitoredApps();
      this.screen.render();
    });

    this.setupKeyBindings();

    return;
  }

  public getScreen(): blessed.Widgets.Screen {
    return this.screen;
  }

  public getProgressBar(): blessed.Widgets.ProgressBarElement {
    return this.progressBar;
  }

  private createMenu(): blessed.Widgets.ListElement {
    const menu = blessed.list({
      top: 0,
      left: 0,
      width: "10%",
      height: "95%",
      label: " Menu ",
      border: { type: "line" },
      style: {
        selected: { bg: "cyan", fg: "black" },
        item: { fg: "white" },
        border: { fg: "cyan" },
        focus: { border: { fg: "yellow" } },
      },
      keys: true,
      mouse: true,
      items: ["Add", "Check", "Exit"],
    });

    menu.on("select", (item) => {
      const choice = item.getText();
      if (choice === "Add") this.addNewApp();
      if (choice === "Exit") process.exit(0);
    });

    return menu;
  }

  private createMainBox(): blessed.Widgets.ScrollableBoxElement {
    return blessed.scrollablebox({
      top: 0,
      left: "10%",
      width: "90%",
      height: "70%",
      label: " Monitored Apps ",
      border: { type: "line" },
      style: {
        border: { fg: "cyan" },
        fg: "white",
        bg: "black",
        focus: { border: { fg: "yellow" } },
      },
      mouse: true,
      keyable: true,
      key: true,
      vi: true,
      scrollbar: {
        ch: " ",
        track: { bg: "grey" },
        style: { bg: "cyan" },
      },
    });
  }

  private createProgressBar(): blessed.Widgets.ProgressBarElement {
    return blessed.progressbar({
      border: "line",
      style: {
        fg: "blue",
        bg: "default",
        bar: {
          bg: "default",
          fg: "yellow",
        },
        border: {
          fg: "cyan",
          bg: "default",
        },
      },
      ch: "▉",
      width: "100%",
      bottom: 0,
      height: 3,
      left: 0,
      filled: 0,
      label: "Next check: 5 seconds",
    });
  }

  private refreshMonitoredApps(): void {
    if (!this.mainBox.width) {
      this.log.warn("MainBox width is not initialized. Skipping refresh.");
      return;
    }

    this.mainBox.children.forEach((child) => this.mainBox.remove(child));

    this.state.refresh();
    const monitoredApps = this.state.monitoredApps;
    const gap = 2;
    const availableWidth = this.mainBox.width as number;
    let currentRowWidth = 0;
    let currentRow = 0;
    let maxRowHeight = 0;

    monitoredApps.forEach((app) => {
      const label = app.address;
      const content =
        app.lastStatus?.message + `\n ${app?.lastStatus?.timestamp}` ||
        "No Status";

      const lines = content.split("\n").map((line) => line.trim());
      const longestLine = Math.max(...lines.map((line) => line.length));

      const labelWidth = label.length + 4;
      const contentWidth = longestLine + 4;
      const boxWidth = Math.min(
        Math.max(labelWidth, contentWidth),
        availableWidth - gap
      );
      const boxHeight = lines.length + 2;

      maxRowHeight = Math.max(maxRowHeight, boxHeight);

      if (currentRowWidth + boxWidth + gap > availableWidth) {
        currentRow++;
        currentRowWidth = 0;
        maxRowHeight = Math.max(maxRowHeight, boxHeight);
      }

      const left = currentRowWidth;
      const top = currentRow * (maxRowHeight + gap);
      currentRowWidth += boxWidth + gap;

      const appBox = blessed.box({
        parent: this.mainBox,
        top,
        left,
        width: boxWidth,
        height: boxHeight,
        label: ` ${label} `,
        border: { type: "line" },
        style: {
          border: { fg: app.lastStatus?.success ? "green" : "red" },
          fg: "white",
          bg: "black",
        },
      });

      lines.forEach((line, index) => {
        blessed.text({
          parent: appBox,
          top: index,
          left: 1,
          content: line,
          style: { fg: "white", bg: "black" },
        });
      });

      this.mainBox.append(appBox);
    });

    this.screen.render();
  }

  private addNewApp(): void {
    const form = blessed.form({
      parent: this.screen,
      top: "center",
      left: "center",
      width: "50%",
      height: "50%",
      border: { type: "line" },
      style: {
        border: { fg: "cyan" },
      },
      keys: true,
      vi: true,
    });

    // Domain/IP input
    blessed.text({
      parent: form,
      content: "Domain/IP:",
      top: "5%",
      left: "5%",
      style: { fg: "cyan" },
    });
    const domainInput = blessed.textbox({
      parent: form,
      top: "10%",
      left: "5%",
      width: "90%",
      height: 3,
      border: { type: "line" },
      inputOnFocus: true,
      style: {
        fg: "white",
        bg: "black",
        border: { fg: "cyan" },
        focus: { border: { fg: "yellow" } },
      },
    });

    // Addon list
    blessed.text({
      parent: form,
      content: "Choose an addon:",
      top: "30%",
      left: "5%",
      style: { fg: "cyan" },
    });
    const methodList = blessed.list({
      parent: form,
      top: "35%",
      left: "5%",
      width: "90%",
      height: "50%",
      keys: true,
      mouse: true,
      items: this.state.addons.map((addon) => addon.name),
      border: { type: "line" },
      style: {
        selected: { bg: "cyan" },
        item: { fg: "white" },
        border: { fg: "cyan" },
        focus: { border: { fg: "yellow" } },
      },
    });

    let selectedIndex: number | null = null;
    methodList.on("select", (_, index) => {
      selectedIndex = index;
    });

    // Submit button
    blessed
      .button({
        parent: form,
        bottom: 1,
        left: "center",
        width: "30%",
        height: 3,
        content: "Submit",
        align: "center",
        border: { type: "line" },
        style: {
          fg: "white",
          bg: "blue",
          border: { fg: "cyan" },
          hover: { bg: "green" },
          focus: { border: { fg: "yellow" } },
        },
        mouse: true,
      })
      .on("press", () => {
        const domain = domainInput.getValue().trim();
        const addon =
          selectedIndex !== null
            ? methodList.getItem(selectedIndex).getText()
            : null;
        if (domain && addon) {
          this.log.info(`Added Domain/IP: ${domain}, Addon: ${addon}`);
          this.state.addApp({ _id: `${Date.now()}`, address: domain, addon });
          this.refreshMonitoredApps();
        } else {
          this.log.warn("Please fill out all fields.");
        }
        form.detach();
        this.screen.render();
      });

    // Cancel logic
    form.key(["escape"], () => {
      form.detach();
      this.screen.render();
    });

    domainInput.focus();
    this.screen.render();
  }

  private setupKeyBindings(): void {
    this.screen.key(["C-c"], () => process.exit(0));

    const focusOrder = [this.menu, this.mainBox];
    let focusedIndex = 0;

    this.screen.key(["tab"], () => {
      focusedIndex = (focusedIndex + 1) % focusOrder.length;
      focusOrder[focusedIndex].focus();
    });
  }
}
