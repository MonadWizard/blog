---
title: Monitoring Hub (Prometheus + Loki + Grafana)
description: Here is your complete, consolidated documentation for setting up a
  production-ready **Monitoring Hub** on Amazon Linux 2023. This guide includes
  the exact configurations we tested and fixed.
pubDate: 2025-07-08
tags:
  - Backend
  - Server
draft: true
---


### **1. The Architecture: How It Works**

Before running commands, it is important to understand **Why** we need these tools and **What** they do:

| Tool | Role | Analogy | What it answers |
| --- | --- | --- | --- |
| **Prometheus** | **Metrics** Collector | The **"Check Engine Light"** | *Is the server slow? Is CPU usage high? Is the site down?* |
| **Loki** | **Log** Aggregator | The **"Black Box Recorder"** | *What happened? What was the specific error message? Who logged in?* |
| **Grafana** | **Visualization** | The **"Dashboard"** | *Show me a graph of my traffic. Show me the errors from last night.* |
| **Node Exporter** | **Metric Agent** | The **"Sensor"** | *Installed on your FastAPI/Redis servers. It reads CPU/RAM stats and sends them to Prometheus.* |
| **Promtail** | **Log Agent** | The **"Courier"** | *Installed on your FastAPI/Redis servers. It reads log files (`error.log`) and ships them to Loki.* |

---

### **2. Server Preparation (The Monitoring Hub)**

*Run these commands on your dedicated Monitoring EC2 Instance.*

```bash
# 1. Update the system
sudo dnf update -y

# 2. Install basic utilities
sudo dnf install unzip -y

# 3. Create secure system users (so tools don't run as root)
sudo useradd --no-create-home --shell /bin/false prometheus
sudo useradd --no-create-home --shell /bin/false loki

```

---

### **3. Setting Up Prometheus (The Metrics Engine)**

**Why:** It pulls numbers (CPU %, Memory usage, Request count) from your servers every 15 seconds.

**A. Install:**

```bash
cd /tmp
# Download Prometheus (LTS Version 3.5.0)
wget https://github.com/prometheus/prometheus/releases/download/v3.5.0/prometheus-3.5.0.linux-amd64.tar.gz
tar xvf prometheus-3.5.0.linux-amd64.tar.gz

# Move Binaries
cd prometheus-3.5.0.linux-amd64
sudo mv prometheus /usr/local/bin/
sudo mv promtool /usr/local/bin/

# Set Permissions
sudo chown prometheus:prometheus /usr/local/bin/prometheus
sudo chown prometheus:prometheus /usr/local/bin/promtool

# Create Directories
sudo mkdir -p /etc/prometheus /var/lib/prometheus
sudo chown -R prometheus:prometheus /etc/prometheus /var/lib/prometheus

```

**B. Configure (`/etc/prometheus/prometheus.yml`):**

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  # 1. Monitor the Monitoring Server itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # 2. Monitor your other Server (Connects to Node Exporter)

```

**C. Systemd Service (`/etc/systemd/system/prometheus.service`):**

```ini
[Unit]
Description=Prometheus
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/prometheus \
    --config.file /etc/prometheus/prometheus.yml \
    --storage.tsdb.path /var/lib/prometheus/

[Install]
WantedBy=multi-user.target

```

**D. Start:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now prometheus

```

---

### **4. Setting Up Loki (The Log Engine)**

**Why:** It receives text logs (errors, warnings) and indexes them efficiently so you can search "Show me all errors from 10:00 AM".

**A. Install:**

```bash
cd /tmp
# Download Loki (v3.0.0)
wget https://github.com/grafana/loki/releases/download/v3.0.0/loki-linux-amd64.zip
unzip loki-linux-amd64.zip

# Move Binary
sudo mv loki-linux-amd64 /usr/local/bin/loki
sudo chmod a+x /usr/local/bin/loki
sudo chown loki:loki /usr/local/bin/loki

# Create Data Directory
sudo mkdir -p /var/lib/loki
sudo chown -R loki:loki /var/lib/loki

```

**B. Configure (`/etc/loki/loki-config.yaml`):**
*This is the fixed configuration that supports v3 features and retention without crashing.*

```yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  instance_addr: 127.0.0.1
  path_prefix: /var/lib/loki
  storage:
    filesystem:
      chunks_directory: /var/lib/loki/chunks
      rules_directory: /var/lib/loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

compactor:
  working_directory: /var/lib/loki/compactor
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  delete_request_store: filesystem

limits_config:
  retention_period: 336h   # Keep logs for 14 Days

```

**C. Systemd Service (`/etc/systemd/system/loki.service`):**

```ini
[Unit]
Description=Loki Log Aggregator
After=network.target

[Service]
User=loki
ExecStart=/usr/local/bin/loki -config.file=/etc/loki/loki-config.yaml
Restart=always

[Install]
WantedBy=multi-user.target

```

**D. Start:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now loki

```

---

### **5. Setting Up Grafana (The Dashboard)**

**Why:** It connects to Prometheus and Loki to display the data in charts.

**A. Install:**

```bash
# Install directly from the official repository
sudo dnf install -y https://dl.grafana.com/grafana-enterprise/release/12.3.1/grafana-enterprise_12.3.1_20271043721_linux_amd64.rpm

```

**B. Start:**

```bash
sudo systemctl enable --now grafana-server

```

**C. Access:**

* Open browser: `http://YOUR_SERVER_PUBLIC_IP:3000`
* Login: `admin` / `admin`

---
