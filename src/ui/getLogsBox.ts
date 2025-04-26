import blessed from "blessed";

export interface LogCommand {
  warn: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

export const getLogsBox = () => {
  const logsBox = blessed.box({
    bottom: 3,
    left: "10%",
    width: "90%",
    height: "25%",
    label: " Logs ",
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

  return {
    node: logsBox,
    log: {
      warn: (msg: string) => logsBox.insertBottom(msg),
      error: (msg: string) => logsBox.insertBottom(msg),
      info: (msg: string) => logsBox.insertBottom(msg),
    },
  };
};
