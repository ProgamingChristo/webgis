import { spawn } from "node:child_process";

const npmCommand =
  process.platform === "win32"
    ? "npm.cmd"
    : "npm";

const services = [
  {
    name: "backend",
    args: ["run", "dev", "-w", "backend"],
  },
  {
    name: "frontend",
    args: ["run", "dev", "-w", "frontend"],
  },
];

const children = new Set();
let shuttingDown = false;

function prefixOutput(serviceName, stream, chunk) {
  for (const line of chunk.toString().split(/\r?\n/)) {
    if (line.trim().length > 0) {
      stream.write(`[${serviceName}] ${line}\n`);
    }
  }
}

function stopChildren() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    child.kill("SIGINT");
  }
}

for (const service of services) {
  const command =
    process.platform === "win32"
      ? `${npmCommand} ${service.args.join(" ")}`
      : npmCommand;
  const args =
    process.platform === "win32"
      ? []
      : service.args;

  const child = spawn(
    command,
    args,
    {
      cwd: process.cwd(),
      env: process.env,
      shell: process.platform === "win32",
      stdio: ["inherit", "pipe", "pipe"],
    },
  );

  children.add(child);

  child.stdout.on("data", (chunk) =>
    prefixOutput(service.name, process.stdout, chunk),
  );

  child.stderr.on("data", (chunk) =>
    prefixOutput(service.name, process.stderr, chunk),
  );

  child.on("exit", (code) => {
    children.delete(child);

    if (!shuttingDown && code !== 0) {
      console.error(
        `[GETRA] ${service.name} dev server exited with code ${code}.`,
      );
      stopChildren();
      process.exitCode = code ?? 1;
    }
  });
}

process.on("SIGINT", stopChildren);
process.on("SIGTERM", stopChildren);
