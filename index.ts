import blessed from "blessed";
import fs from "fs";
import { getLogsBox } from "./getLogsBox";
import { getAddons } from "./getAddons";
import { loadYamlData } from "./loadYamlData";
import yaml from "yaml";
import { Worker } from "worker_threads";
import path from "path";

const screen = blessed.screen({
  smartCSR: true,
  title: "Monitoring App",
});

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
  },
  keys: true,
  mouse: true,
  items: ["Add", "Check", "List", "Help", "Exit"],
});

const mainBox = blessed.box({
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
  },
  scrollable: true,
  alwaysScroll: true,
  scrollbar: {
    ch: " ",
    track: { bg: "grey" },
    style: { bg: "cyan" },
  },
});

const { log, node: logsBox } = getLogsBox();
const progress = blessed.progressbar({
  parent: screen,
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

screen.append(menu);
screen.append(mainBox);
screen.append(logsBox);
screen.append(progress);

const addons = getAddons(log);
const monitoredApps = loadYamlData(log);
let checkingInProgress = false;
let timeUntilNextCheck = 5;

const refreshMonitoredApps = () => {
  mainBox.children.forEach((child) => mainBox.remove(child));
  monitoredApps.forEach((app, index) => {
    let height = 3;
    if (app.lastStatus?.message) {
      const lineBreaks = app.lastStatus.message.split("\n").length - 1;
      height += lineBreaks;
    }
    const appBox = blessed.box({
      top: index * 3,
      left: 1,
      width: "95%",
      height,
      label: ` ${app.address} `,
      content: app.lastStatus?.message,
      border: { type: "line" },
      style: {
        border: { fg: app.lastStatus?.success ? "green" : "red" },
        fg: "white",
        bg: "black",
      },
    });
    mainBox.append(appBox);
  });
};

const writeStatusToYaml = () => {
  fs.writeFileSync("monitored.yml", yaml.stringify(monitoredApps));
};

const checkDomain = async (address: string, addonName: string) => {
  const data = await new Promise<string>((resolve) => {
    const addon_2 = addons.find((addon_1) => addon_1.name === addonName);
    if (!addon_2) {
      resolve(
        JSON.stringify({
          success: false,
          message: `[Error] Addon '${addonName}' is not loaded.`,
        })
      );
      return;
    }

    const { addonPath } = addon_2;

    if (!fs.existsSync(addonPath)) {
      resolve(
        JSON.stringify({
          success: false,
          message: `[Error] Addon '${addonName}' does not have a valid path.`,
        })
      );
      return;
    }

    const worker = new Worker(path.resolve(__dirname, "monitorWorker.js"), {
      workerData: { addonPath, address },
    });

    worker.on("message", (message) => {
      resolve(JSON.stringify(message));
    });

    worker.on("error", (err) => {
      resolve(JSON.stringify({ success: false, message: err }));
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        resolve(
          JSON.stringify({
            success: false,
            message: `[Error] '${address}' - Worker exited with code ${code}`,
          })
        );
      }
    });
  });
  return JSON.parse(data) as { success: boolean; message: string };
};

const performChecks = async () => {
  if (checkingInProgress) return;

  checkingInProgress = true;
  progress.style.bar.fg = "orange";
  progress.setLabel(`Checking ${monitoredApps.length} apps...`);

  for (const app of monitoredApps) {
    const result = await checkDomain(app.address, app.addon);
    app.lastStatus = {
      ...result,
      timestamp: new Date().toISOString(),
    };
  }

  refreshMonitoredApps();
  writeStatusToYaml();
  checkingInProgress = false;
  progress.style.bar.fg = "yellow";
  progress.setLabel("Next check: 5 seconds");
};

const updateProgressBar = () => {
  if (!checkingInProgress) {
    timeUntilNextCheck -= 1;
    progress.setProgress((5 - timeUntilNextCheck) * 20);
    progress.setLabel(`Next check: ${timeUntilNextCheck} seconds`);

    if (timeUntilNextCheck === 0) {
      timeUntilNextCheck = 5;
      performChecks();
    }
  } else {
    progress.setProgress(100);
  }
  screen.render();
};

setInterval(updateProgressBar, 1000);

menu.on("select", (item) => {
  const choice = item.getText();
  switch (choice) {
    case "Add":
      log.info("Add command selected.");
      break;
    case "Check":
      performChecks();
      break;
    case "Exit":
      log.info("Exiting application...");
      screen.destroy();
      process.exit(0);
      break;
    default:
      log.warn(`Unknown command: ${choice}`);
  }
});

screen.key(["C-c"], () => {
  screen.destroy();
  process.exit(0);
});

menu.focus();
refreshMonitoredApps();
screen.render();
