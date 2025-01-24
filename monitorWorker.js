const { parentPort, workerData } = require("worker_threads");

(async () => {
  try {
    const { addonPath, address } = workerData;
    const addon = require(addonPath).default;

    if (!addon || typeof addon.monitor !== "function") {
      throw new Error(`Invalid addon at ${addonPath}`);
    }

    const status = await addon.monitor(address);
    parentPort.postMessage(status);
  } catch (err) {
    parentPort.postMessage(err.message);
  }
})();
