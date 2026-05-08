# 🥔 projects.potatogamer.uk

The central monorepo for all projects hosted at [projects.potatogamer.uk](https://projects.potatogamer.uk). Built with a modern React and Vite stack, organized as an efficient npm workspace.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🏗️ Architecture

This repository uses a monorepo structure to manage multiple applications and shared logic in one place.

### 📦 Apps
| Name | Description | Tech Stack | Status |
| :--- | :--- | :--- | :--- |
| **`apps/time`** | A high-performance, customizable school timetable and countdown app with dynamic themes (including the secret "Stars" theme). | React, Vite, GSAP | Live 🟢 |

### 🛠️ Packages
| Name | Description |
| :--- | :--- |
| **`packages/ui`** | Shared React components and universal loaders used across the ecosystem. |

## 💻 Tech Stack & Infrastructure

* **Frontend:** HTML, CSS, JavaScript, React, Vite.
* **Languages:** PHP, Python (for backend services and automation).
* **Development:** Primary development performed on **Windows 11**.

## 🚀 Local Development

To run this workspace locally, ensure you have **Node.js** and **fnm** (or npm) installed.

1.  **Clone the repository**
    ```powershell
    git clone [https://github.com/thepotatogamer0/projects.potatogamer.uk.git](https://github.com/thepotatogamer0/projects.potatogamer.uk.git)
    cd projects.potatogamer.uk
    ```

2.  **Install dependencies**
    This installs all packages for the root and every app in the `apps/` folder.
    ```powershell
    npm install
    ```

3.  **Start development mode**
    Run all projects simultaneously:
    ```powershell
    npm run dev
    ```

## 📄 License
This project is open-source and available under the **MIT License**. You are free to use, modify, and distribute the code, provided that original credit is given to the author. See the [LICENSE](./LICENSE) file for full details.

Created and maintained by **potatogamer**.
