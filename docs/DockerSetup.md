# 🐳 Dockerized Playwright-BDD MCP Server

The Playwright-BDD MCP Server is fully dockerized. Using the official Playwright base image ensures that all necessary browser binaries (Chromium, Firefox, WebKit) and OS-level dependencies are Perfectly aligned and ready to run.

---

## 🛠️ 0. Prerequisites

Before you begin, ensure you have the following installed on your machine or deployment environment:
1. **GitHub Repository**: You need access to the `playwright-bdd-pom-mcp` source code.
2. **Docker Engine**: Installed and running (e.g., [Docker Desktop](https://www.docker.com/products/docker-desktop/)).
   * *Verify with:* `docker --version`
3. **Git**: Required to clone the codebase.
   * *Verify with:* `git --version`

---

## 🏗️ 1. Building the Image

Clone the repository and build the Docker image locally:

```bash
docker build -t mcp-playwright-bdd .
```

*Note: The image is quite large (~1.5GB - 2GB) because it contains the full Ubuntu Jammy OS and all Playwright browser binaries.*

---

## 🏠 2. Running Locally (Stdio for local codebases)

If you are running the MCP Server to analyze and generate code for a **local project on your machine**, you must run the container using `stdio` and **mount your local project** into the container as a volume.

### Example Run Command:
```bash
docker run -i --rm \
  -v /path/to/your/project:/project \
  mcp-playwright-bdd
```
*   `-i`: Keeps STDIN open even if not attached (Required for MCP `stdio` communication).
*   `-v`: Mounts your local project folder to `/project` inside the container.
*   **Important**: When using MCP tools on this container, ensure the `projectRoot` arguments you pass to the tools are matching the mounted path (e.g., `/project`).

### Configuring your Local MCP Client (Claude Desktop, Cursor, etc.):
To wire this up in an MCP client config (like `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "playwright-bdd-server": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v",
        "/Users/YOUR_NAME/Projects/my-web-app:/project",
        "mcp-playwright-bdd"
      ]
    }
  }
}
```

---

## 🌐 3. Running Remotely (SSE over HTTP)

If you are deploying this MCP server to a cloud provider (AWS, GCP, Railway) so your team can use it remotely, you should run it using the **SSE (Server-Sent Events)** transport.

The CLI has a built-in HTTP server for this. Just append `--port <number>` to the run command:

```bash
docker run -p 3000:3000 -d mcp-playwright-bdd --port 3000 --host 0.0.0.0
```

### Configuring a Remote MCP Client:
Most MCP clients support registering SSE endpoints. You would configure your client to point to the remote domain:

```json
{
  "mcpServers": {
    "remote-playwright": {
      "type": "sse",
      "url": "https://mcp.your-domain.com/sse"
    }
  }
}
```

---

## ☁️ 4. Deploying to AWS (ECS / Fargate)

Running this MCP server on AWS Fargate is an excellent way to provide your entire remote team with access to autonomous Playwright abilities without managing EC2 instances.

### ECS Setup Instructions:
1. **Push your Image**: Tag and push your built image to Amazon Elastic Container Registry (ECR).
2. **Task Definition**:
   * **Compute**: Playwright browsers consume memory. Set your Task Definition to at least **2vCPU** and **4GB RAM**.
   * **Network Mode**: `awsvpc`.
   * **Port Mappings**: Map Container Port `3000` to expose the SSE listener.
3. **Execution Command**: 
   Since the Dockerfile's `ENTRYPOINT` is `node dist/index.js`, configure the Task Definition's Entry point / Command overrides to start the SSE server:
   `--port`, `3000`, `--host`, `0.0.0.0`
4. **Persistent Codebase (EFS)**:
   If the server needs to *generate* test files or analyze a shared repository dynamically, you must mount an Amazon EFS (Elastic File System) volume to the task. 
   * Mount the EFS volume to `/project` inside the container.
   * Your team's MCP clients will use `"projectRoot": "/project"` in their tool call arguments.

### Connecting your Team:
Once the ECS Service is running (ideally behind an Application Load Balancer with HTTPS), team members can connect their local Cursor/Claude clients directly to your AWS instance:
```json
{
  "mcpServers": {
    "aws-playwright-mcp": {
      "type": "sse",
      "url": "https://mcp-alb.your-company.com/sse"
    }
  }
}
```

---

## 📂 5. Best Practices for Dockerized Testing

1.  **Output Artifacts**: If you want to view Playwright HTML reports or traces generated *inside* the container, ensure you mount the `playwright-report` folder to your local machine:
    `-v /path/to/project/playwright-report:/project/playwright-report`
2.  **Environment Secrets**: Pass secrets via Docker environment variables rather than committing them:
    `docker run -i -e TEST_USERNAME=admin -e TEST_PASSWORD=supersecret ...`
3.  **Permissions**: If you encounter file-write permission errors on Linux hosts when the MCP server generates test code, consider using `--user $(id -u):$(id -g)` in your `docker run` command.
