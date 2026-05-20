# ✨ Orion 2.0: The Sovereign AI Operating Layer

> A production-grade, voice-first, personal AI co-founder that lives locally, sees your screen, remembers everything, and predicts your needs.

Orion is not just another chatbot wrapper. It is a persistent **Live Cognitive Loop** that fuses multimodal perception (voice + screen), an event-driven world model, dynamic evolving memories, and autonomous multi-agent orchestration into a seamless intelligence system.

---

## 🧠 Core Systems Architecture

*   **Presence Layer (Neural UI)**: A cinematic, reactive 3D volumetric orb (Canvas/WebGPU) that visualizes Orion's internal cognitive state. It fragments on low confidence, glows stably on high confidence, and distorts erratically during security alerts.
*   **Perception Layer (Voice & Vision)**: Continuous wake-word monitoring (`"Hey Orion"`), high-fidelity text-to-speech, and automatic screen frame extraction (Vision) that routes your environment directly into the AI's context.
*   **Live Cognitive Kernel**: A unified event bus and world state store tracking CPU load, memory consumption, operator emotional sentiment, and predicting next user actions.
*   **Multi-Agent Orchestrator**: User queries are pipelined through 8 specialized agents (Sentinel, Architect, Researcher, Coding, Optimizer, Creative, Curator, Deployment) before a response is returned.
*   **Relational Thought-Graph Memory**: An enterprise-grade SQLite hybrid engine tracking cognitive vectors (emotional, workflow, behavioral) with dynamic memory gravity decay formulas. Features a local fallback TF-IDF hashing vectorizer for offline embedding processing.
*   **Trust Firewall V2**: Prompt injection interception, credential scanning (AWS, Google, DB URIs), and active hallucination constraints.

---

## 🚀 Running Orion Locally

Orion is built as a highly optimized Node Express + React monorepo. 

### Prerequisites
*   [Node.js](https://nodejs.org/en/) (v18+)
*   npm or yarn

### Installation
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/YOUR_USERNAME/orion.git
    cd orion
    ```
2.  **Install Dependencies:**
    ```bash
    npm run install:all
    ```
3.  **Start the Development Servers:**
    ```bash
    npm run dev
    ```
    *The frontend will be available at `http://localhost:5173` and the backend telemetry stream on port `3001`.*

---

## 🌍 Global Cloud Deployment (Render / Railway)

Orion is engineered for global deployment with cross-platform Linux build scripts and persistent database volume support. Since Orion utilizes **Server-Sent Events (SSE)** for real-time telemetry, serverless environments (like Vercel) are not recommended. Use full runtime hosts like **Render** or **Railway**.

### Deployment Steps
1.  Push this codebase to a GitHub repository.
2.  Connect your repository to [Render.com](https://render.com) (Web Service) or [Railway.app](https://railway.app).
3.  Configure the build settings:
    *   **Build Command**: `npm run build`
    *   **Start Command**: `npm start`
4.  **Crucial Setup — Persistent Memory Volumes**:
    Because cloud hosts use ephemeral file systems, your SQLite memory database will erase on reboot unless mounted to a persistent volume.
    *   Add a **Persistent Disk/Volume** (e.g., 1GB) and mount it to the path `/data`.
    *   Set the Environment Variable `DATABASE_PATH = /data/orion.db`. Orion will automatically detect this and securely save your thought-graph data permanently.

---

*Designed for the next generation of cognitive computing.*
