import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const npm = isWindows ? "npm.cmd" : "npm";

const children = [
  spawn(npm, ["run", "dev:frontend"], {
    stdio: "inherit",
    shell: false,
  }),
  spawn(npm, ["run", "dev:backend"], {
    stdio: "inherit",
    shell: false,
  }),
];

const shutdown = () => {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

for (const child of children) {
  child.on("error", (error) => {
    console.error("Failed to start process:", error);
  });
}