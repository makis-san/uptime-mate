import blessed from "blessed";
import fs from "fs";
import { getLogsBox } from "./getLogsBox";
import { getAddons } from "./getAddons";
import { loadYamlData } from "./loadYamlData";
import yaml from "yaml";
import { Worker } from "worker_threads";
import path from "path";
import { v4 as uuidv4 } from "uuid";

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
    focus: { border: { fg: "yellow" } },
  },
  keys: true,
  mouse: true,
  items: ["Add", "Check", "Exit"],
});

const mainBox = blessed.scrollablebox({
  parent: screen,
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
screen.append(logsBox);
screen.append(progress);

const addons = getAddons(log);
const monitoredApps = loadYamlData(log);
let checkingInProgress = false;
let timeUntilNextCheck = 5;

const refreshMonitoredApps = () => {
  mainBox.children.forEach((child) => mainBox.remove(child));

  const gap = 2;
  const availableWidth = mainBox.width as number;
  let currentRowWidth = 0;
  let currentRow = 0;
  let maxRowHeight = 0;

  monitoredApps.forEach((app) => {
    const label = app.address;
    let content = app.lastStatus?.message || "No Status";

    const lines = content.split("\n").map((line) => line.trim());
    const cleanLines = lines.map((line) => line.replace(/\x1b\[[0-9;]*m/g, ""));
    const longestLine = Math.max(...cleanLines.map((line) => line.length));

    const labelWidth = label.length + 4;
    const contentWidth = longestLine + 4;
    const boxWidth = Math.min(
      Math.max(labelWidth, contentWidth),
      availableWidth - gap
    );
    const boxHeight = lines.length + 2;

    // Update maximum row height
    maxRowHeight = Math.max(maxRowHeight, boxHeight);

    if (currentRowWidth + boxWidth + gap > availableWidth) {
      currentRow++;
      currentRowWidth = 0;

      // Use maxRowHeight for consistent row positioning
      maxRowHeight = Math.max(maxRowHeight, boxHeight); // Reset for the new row
    }

    const left = currentRowWidth;
    const top = currentRow * (maxRowHeight + gap); // Use maxRowHeight for row alignment
    currentRowWidth += boxWidth + gap;

    const appBox = blessed.box({
      parent: mainBox,
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
        style: {
          fg: "white",
          bg: "black",
        },
      });
    });

    mainBox.append(appBox);
  });

  screen.render();
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
  progress.setLabel(`Checking ${monitoredApps?.length} apps...`);

  let pendingCount = monitoredApps?.length;
  let completedCount = 0;

  const updateProgress = () => {
    progress.setLabel(`Pending: ${pendingCount}, Completed: ${completedCount}`);
    progress.setProgress((completedCount / monitoredApps?.length) * 100);
    screen.render();
    refreshMonitoredApps();
  };

  const promises = monitoredApps.map(async (app) => {
    const result = await checkDomain(app.address, app.addon);
    app.lastStatus = {
      ...result,
      timestamp: new Date().toISOString(),
    };
    pendingCount -= 1;
    completedCount += 1;
    updateProgress();
  });

  await Promise.allSettled(promises);

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
  }
  screen.render();
};

setInterval(updateProgressBar, 1000);

menu.on("select", (item) => {
  const choice = item.getText();
  switch (choice) {
    case "Add":
      log.info("Add command selected.");

      menu.setItems([" "]);
      menu.style.item.fg = "black";
      menu.style.selected.fg = "black";

      const blessed = require("blessed");

      const form = blessed.form({
        parent: screen,
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
        clickable: true,
        style: {
          fg: "white",
          bg: "black",
          border: { fg: "cyan" },
          focus: { border: { fg: "yellow" } },
        },
      });

      blessed.text({
        parent: form,
        content: "Choose an option:",
        top: "30%",
        left: "5%",
        style: {
          fg: "cyan",
        },
      });

      const methodList = blessed.list({
        parent: form,
        top: "35%",
        left: "5%",
        width: "90%",
        height: "50%",
        keys: true,
        mouse: true,
        clickable: true,
        items: addons.map((data) => data.name),
        border: { type: "line" },
        style: {
          selected: { bg: "cyan" },
          item: { fg: "white", bg: "black" },
          border: { fg: "cyan" },
          focus: { border: { fg: "yellow" } },
        },
      });

      let selectedIndex: number | null = null;
      let isNavigatingList = false;

      function updateItemStyles() {
        methodList?.items?.forEach((item: any, index: number) => {
          if (index === selectedIndex) {
            item.style.bg = "green";
          } else if (methodList.focused) {
            item.style.bg = index === methodList.selected ? "cyan" : "black";
          } else {
            item.style.bg = "black";
          }
        });
      }

      methodList.on("select", (item: any, index: number) => {
        if (isNavigatingList) {
          selectedIndex = index;
          updateItemStyles();
        }
      });

      methodList.on("focus", () => {
        updateItemStyles();
        screen.render();
      });

      methodList.on("blur", () => {
        if (!isNavigatingList) {
          updateItemStyles();
          screen.render();
        }
      });

      screen.key(["enter"], () => {
        if (methodList.focused) {
          isNavigatingList = true;
          updateItemStyles();
          screen.render();
        }
      });

      screen.key(["escape"], () => {
        if (isNavigatingList) {
          isNavigatingList = false;
          updateItemStyles();
          screen.render();
        }
      });

      screen.key(["tab", "up", "down"], (ch, key) => {
        if (isNavigatingList) {
          return;
        }
        screen.focusNext();
      });

      const submitButton = blessed.button({
        parent: form,
        bottom: 1,
        left: "center",
        width: "30%",
        height: 3,
        border: { type: "line" },
        content: "Submit",
        align: "center",
        valign: "middle",
        focusable: true,
        mouse: true,
        clickable: true,
        style: {
          fg: "white",
          bg: "blue",
          border: { fg: "cyan" },
          hover: { bg: "green" },
          focus: { border: { fg: "yellow" } },
        },
      });

      submitButton.on("press", () => {
        const domain = domainInput.getValue().trim();
        const method =
          selectedIndex !== null
            ? methodList.getItem(selectedIndex).getText()
            : null;

        if (domain && method) {
          log.info(`Added Domain/IP: ${domain}, Method: ${method}`);
          monitoredApps.push({
            _id: uuidv4(),
            address: domain,
            addon: method,
          });
          refreshMonitoredApps();
          writeStatusToYaml();
        } else {
          log.warn("Please fill out all fields.");
        }

        form.detach();
        menu.style.item.fg = "white";
        menu.style.selected.fg = "cyan";
        menu.setItems(["Add", "Check", "List", "Help", "Exit"]);
        menu.focus();
        screen.render();
      });
      form.key(["escape"], () => {
        form.detach();
        menu.style.item.fg = "white";
        menu.style.selected.fg = "cyan";
        menu.setItems(["Add", "Check", "List", "Help", "Exit"]);
        menu.focus();
        screen.render();
      });

      domainInput.focus();
      screen.render();
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

const focusOrder = [menu, mainBox];
let focusedIndex = 0;

screen.key(["tab"], () => {
  if (focusedIndex === focusOrder.length - 1) {
    focusedIndex = 0;
  } else {
    focusedIndex++;
  }
  focusOrder[focusedIndex].focus();
});

menu.focus();
refreshMonitoredApps();
screen.render();
