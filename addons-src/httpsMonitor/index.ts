import axios from "axios";
import chalk from "chalk";

const httpsMonitor = {
  name: "HTTPS",
  description: "Monitor HTTPS services.",
  monitor: async (
    address: string
  ): Promise<{ success: boolean; message: string }> => {
    const startTime = Date.now();
    try {
      const response = await axios.head(
        address.startsWith("http") ? address : `https://${address}`,
        {
          timeout: 5000,
        }
      );
      const elapsedTime = Date.now() - startTime;

      const log = chalk.green(
        `[HTTPS] ${chalk.white(
          `'${address}' - UP (Status: ${response.status}, Time: ${elapsedTime}ms)`
        )}`
      );

      return {
        success: true,
        message: log,
      };
    } catch (error) {
      const log = chalk.red(
        `[HTTPS] ${chalk.white(`'${address}' - DOWN or Unreachable.`)}`
      );
      return {
        success: false,
        message: log,
      };
    }
  },
};

export default httpsMonitor;
