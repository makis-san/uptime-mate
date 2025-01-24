# Uptime Mate 🚀

![Uptime Mate](https://img.shields.io/github/license/makis-san/uptime-mate) ![Issues](https://img.shields.io/github/issues/makis-san/uptime-mate) ![Stars](https://img.shields.io/github/stars/makis-san/uptime-mate)

**Uptime Mate** is a terminal-based monitoring tool to track the uptime and status of your servers and applications. With its interactive interface, dynamic layout, and real-time monitoring, it's your go-to solution for server health checks in the terminal! 🌟

---

## Features ✨

- **🖥 Monitor Multiple Services**  
  Track the uptime, status, and performance of multiple servers and applications.
- **🧩 Dynamic Mosaic Layout**  
  Displays monitoring data in an organized, visually appealing format.
- **🛠 Customizable Add-ons**  
  Extend the tool's functionality with plugins tailored to your needs.
- **📜 Real-Time Logs**  
  Get live logs and server feedback directly in the terminal.
- **🎛 Interactive Interface**  
  User-friendly, keyboard-driven terminal UI for easy navigation.

---

## Demo 🎥

![Demo Gif](https://github.com/makis-san/uptime-mate/raw/main/assets/demo.gif)

---

## Installation ⚙️

### Prerequisites 📋

- **Node.js** (v16 or newer)
- **npm** or **yarn**

### Steps to Install

1. Clone the repository:
   ```bash
   git clone https://github.com/makis-san/uptime-mate.git
   ```
2. Navigate to the project directory:
   ```bash
   cd uptime-mate
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the app:
   ```bash
   npm start
   ```

---

## Usage 🚀

Once you start the application, you'll see an interactive terminal interface. From here, you can:

- **Add new servers** to monitor.
- **Check server statuses** in real time.
- View **logs** for insights.
- Monitor all your applications in a **mosaic-style layout**.

---

## Configuration ⚙️

All monitored servers and their configurations are stored in a YAML file named `monitored.yml`. Here's an example of the structure:

```yaml
- _id: unique-server-id
  address: https://example.com
  addon: HTTPS
  lastStatus:
    success: true
    message: "Server is UP"
    timestamp: 2025-01-24T19:46:40.489Z
- _id: another-server-id
  address: mc.example.net
  addon: Minecraft
  lastStatus:
    success: false
    message: "Server is DOWN"
    timestamp: 2025-01-24T19:47:12.123Z
```

Modify the file to add, update, or remove servers.

---

## Keyboard Shortcuts ⌨️

| Key            | Action                      |
| -------------- | --------------------------- |
| **Tab**        | Move focus between sections |
| **Arrow Keys** | Navigate options            |
| **Enter**      | Select or interact          |
| **Escape**     | Return to the main menu     |
| **Ctrl + C**   | Exit the application        |

---

## Add-ons 🛠

Add-ons allow Uptime Mate to monitor different types of services (e.g., HTTP, Minecraft). The default add-ons include:

- **HTTPS Monitoring**
- **Minecraft Server Monitoring**

To add a custom add-on:

1. Place your add-on file in the `addons` directory.
2. Implement your monitoring logic using the provided API.

---

## Contributing 🤝

We welcome contributions! Here's how you can help:

1. Fork the repository. 🍴
2. Create a feature branch: `git checkout -b feature-name` 🚀
3. Commit your changes: `git commit -m "Add feature"` ✅
4. Push to your fork: `git push origin feature-name` 📤
5. Open a pull request. 📨

---

## License 📜

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Support 💬

If you encounter any issues or have questions, feel free to open an [issue](https://github.com/makis-san/uptime-mate/issues) or contact us via email.

---

Enjoy using **Uptime Mate** to simplify your server monitoring! 🎉

---
