import net from "net";
import dns from "dns/promises";
import chalk, { ChalkInstance } from "chalk";

interface MinecraftStatusResponse {
  version: {
    name: string;
    protocol: number;
  };
  description: string;
  players: {
    max: number;
    online: number;
    sample?: { id: string; name: string }[];
  };
  favicon?: string;
}

const minecraftMonitor = {
  name: "Minecraft",
  description: "Monitor Minecraft servers and fetch their MOTD.",

  async monitor(
    address: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { hostname, port } = await resolveAddress(address);
      const status = await getStatus(hostname, port);

      const motdText = sanitizeMOTD(status.description);

      const playersText = `${chalk.white(
        `Players: ${chalk.yellow(status.players.online)}/${chalk.yellow(
          status.players.max
        )}`
      )}`;

      return {
        success: true,
        message: `${motdText}\n${playersText}`,
      };
    } catch (error) {
      const errorMessage = (error as Error).message;
      const logMessage = `${chalk.red("[Minecraft]")} ${chalk.cyan(
        address
      )} - ${chalk.red("FAILED")}\n${chalk.red("Reason:")} ${errorMessage}`;
      return { success: false, message: logMessage };
    }
  },
};

async function resolveAddress(
  address: string
): Promise<{ hostname: string; port: number }> {
  let [hostname, port] = address.split(":");
  let portNumber = port ? parseInt(port, 10) : 25565;

  if (!isIpAddress(hostname)) {
    try {
      const srvRecords = await dns.resolveSrv(`_minecraft._tcp.${hostname}`);
      if (srvRecords.length > 0) {
        hostname = srvRecords[0].name;
        portNumber = srvRecords[0].port;
      }
    } catch {}
  }

  return { hostname, port: portNumber };
}

function isIpAddress(host: string): boolean {
  const ipv4Regex =
    /^(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.((25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.){2}(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)$/;
  const ipv6Regex = /^[a-fA-F0-9:]+$/;
  return ipv4Regex.test(host) || ipv6Regex.test(host);
}

async function getStatus(
  hostname: string,
  port: number
): Promise<MinecraftStatusResponse> {
  return new Promise((resolve, reject) => {
    const client = net.createConnection({ host: hostname, port }, () => {
      const handshake = createHandshakePacket(hostname, port);
      const request = Buffer.from([0x01, 0x00]);

      client.write(handshake);
      client.write(request);
    });

    let dataBuffer = Buffer.alloc(0);

    client.on("data", (data) => {
      dataBuffer = Buffer.concat([dataBuffer, data]);

      try {
        const response = parseStatusResponse(dataBuffer);
        resolve(response);
      } catch {}
    });

    client.on("end", () => {
      try {
        const response = parseStatusResponse(dataBuffer);
        resolve(response);
      } catch (error) {
        reject(
          new Error(
            "Failed to parse server response: " + (error as Error).message
          )
        );
      }
    });

    client.on("error", () => {
      reject(new Error(`${hostname}:${port} is offline or unreachable.`));
    });
  });
}

function createHandshakePacket(host: string, port: number): Buffer {
  const hostBuffer = Buffer.from(host, "utf8");
  const portBuffer = Buffer.alloc(2);
  portBuffer.writeUInt16BE(port, 0);

  const handshakePacket = Buffer.concat([
    Buffer.from([0x00]), // Packet ID for handshake
    Buffer.from([0x04]), // Protocol version
    Buffer.from([hostBuffer.length]), // Host length
    hostBuffer, // Host
    portBuffer, // Port
    Buffer.from([0x01]), // Next state (status)
  ]);

  return Buffer.concat([
    Buffer.from([handshakePacket.length]),
    handshakePacket,
  ]);
}

function parseStatusResponse(data: Buffer): MinecraftStatusResponse {
  const jsonStartIndex = data.indexOf("{");
  if (jsonStartIndex === -1) {
    throw new Error("No JSON found in server response.");
  }

  const jsonString = data.toString("utf8", jsonStartIndex);
  return JSON.parse(jsonString);
}

function sanitizeMOTD(motd: string): string {
  const colorMap: { [key: string]: ChalkInstance } = {
    "0": chalk.hex("#000000"), // Black
    "1": chalk.hex("#0000AA"), // Dark Blue
    "2": chalk.hex("#00AA00"), // Dark Green
    "3": chalk.hex("#00AAAA"), // Dark Aqua
    "4": chalk.hex("#AA0000"), // Dark Red
    "5": chalk.hex("#AA00AA"), // Dark Purple
    "6": chalk.hex("#FFAA00"), // Gold
    "7": chalk.hex("#AAAAAA"), // Gray
    "8": chalk.hex("#555555"), // Dark Gray
    "9": chalk.hex("#5555FF"), // Blue
    a: chalk.hex("#55FF55"), // Green
    b: chalk.hex("#55FFFF"), // Aqua
    c: chalk.hex("#FF5555"), // Red
    d: chalk.hex("#FF55FF"), // Light Purple
    e: chalk.hex("#FFFF55"), // Yellow
    f: chalk.hex("#FFFFFF"), // White
  };

  const formatMap: {
    [key: string]: (current: ChalkInstance) => ChalkInstance;
  } = {
    k: (style) => style.hidden, // Obfuscated
    l: (style) => style.bold, // Bold
    m: (style) => style.strikethrough, // Strikethrough
    n: (style) => style.underline, // Underline
    o: (style) => style.italic, // Italic (simulated by chalk)
    r: () => chalk, // Reset
  };

  let styledMOTD = "";
  let currentStyle: ChalkInstance = chalk;

  motd.split(/(§[0-9a-fklmnor])/g).forEach((part) => {
    if (part.startsWith("§")) {
      const code = part[1];
      if (colorMap[code]) {
        currentStyle = colorMap[code];
      } else if (formatMap[code]) {
        currentStyle = formatMap[code](currentStyle);
      } else if (code === "r") {
        currentStyle = chalk;
      }
    } else {
      styledMOTD += currentStyle(part);
    }
  });

  return styledMOTD.replace(/\\n/g, "\n").trim();
}

export default minecraftMonitor;
