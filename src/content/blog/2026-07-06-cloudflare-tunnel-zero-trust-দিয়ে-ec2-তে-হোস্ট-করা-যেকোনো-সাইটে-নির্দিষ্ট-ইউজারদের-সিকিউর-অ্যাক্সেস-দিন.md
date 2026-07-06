---
title: Cloudflare Tunnel + Zero Trust দিয়ে EC2-তে হোস্ট করা যেকোনো সাইটে
  নির্দিষ্ট ইউজারদের সিকিউর অ্যাক্সেস দিন
description: >+
  আপনার EC2 সার্ভারে একটা সার্ভিস চলছে — হতে পারে Gogs, কোনো অ্যাডমিন প্যানেল,
  Grafana, বা যেকোনো ওয়েব অ্যাপ। আপনি চান শুধুমাত্র নির্দিষ্ট কিছু মানুষ সেটা
  ব্যবহার করতে পারুক, বাকি পুরো ইন্টারনেট থেকে সেটা সম্পূর্ণ ব্লক থাকুক। সবচেয়ে
  বড় কথা — সার্ভারে কোনো পোর্ট ওপেন না করেই।


pubDate: 2025-07-06
tags:
  - Server
  - System Design
draft: false
---

এই পোস্টে আমরা দেখব কীভাবে **Cloudflare Tunnel** দিয়ে সার্ভিসটা ইন্টারনেটে এক্সপোজ করা যায় এবং **Cloudflare Zero Trust (Access)** দিয়ে শুধু নির্দিষ্ট ইউজারদের ইমেইল-ভিত্তিক পারমিশন দেওয়া যায়। পুরো সেটআপ ফ্রি প্ল্যানেই সম্ভব (৫০ ইউজার পর্যন্ত)।

---

## আর্কিটেকচার — কী ঘটবে

```
ইউজার → Cloudflare (Access লগইন চেক) → Tunnel → EC2 (localhost:3000)
```

- EC2-তে **cloudflared** নামের একটা ডেমন চলবে, যেটা Cloudflare-এর সাথে **outbound** কানেকশন বানায়। অর্থাৎ Security Group-এ কোনো inbound পোর্ট (80/443/3000) খোলার দরকার নেই।
- `a.example.com`-এ কেউ ঢুকলে প্রথমে Cloudflare Access একটা লগইন পেজ দেখাবে।
- আপনার Policy-তে যাদের ইমেইল আছে, শুধু তারাই পার হতে পারবে। বাকিরা সার্ভার পর্যন্ত পৌঁছাতেই পারবে না।

## যা যা লাগবে

- একটা ডোমেইন, যেটা Cloudflare-এ যুক্ত আছে (nameserver Cloudflare-এ পয়েন্ট করা)
- একটা EC2 ইনস্ট্যান্স (Ubuntu ধরে নিচ্ছি), যেখানে আপনার সার্ভিস `localhost:3000`-এ চলছে (আপনার পোর্ট ভিন্ন হলে সেটা বসাবেন)
- একটা ফ্রি Cloudflare অ্যাকাউন্ট

---

## ধাপ ১: EC2-তে cloudflared ইনস্টল

```bash
# Cloudflare-এর GPG key ও repository যোগ করুন
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null

echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list

sudo apt update
sudo apt install cloudflared

# ভার্সন চেক
cloudflared --version
```

## ধাপ ২: Cloudflare-এ লগইন ও কাস্টম টানেল তৈরি

```bash
cloudflared tunnel login
```

কমান্ডটা একটা URL দেবে — ব্রাউজারে খুলে Cloudflare-এ লগইন করে আপনার ডোমেইনটা সিলেক্ট করুন। এতে `~/.cloudflared/cert.pem` ফাইল তৈরি হবে (এটা ম্যানেজমেন্ট কমান্ডের জন্য লাগে)।

এবার টানেল তৈরি করুন:

```bash
cloudflared tunnel create my-tunnel
```

আউটপুটে একটা **Tunnel UUID** পাবেন এবং `~/.cloudflared/<UUID>.json` নামে ক্রেডেনশিয়াল ফাইল তৈরি হবে। UUID-টা নোট করে রাখুন।

```bash
# টানেল লিস্ট দেখে নিশ্চিত হন
cloudflared tunnel list
```

## ধাপ ৩: কনফিগ ফাইল ও DNS রুট

systemd সার্ভিস `/etc/cloudflared/config.yml` থেকে কনফিগ পড়ে, তাই ফাইলগুলো ওখানে রাখাই সবচেয়ে নিরাপদ অভ্যাস:

```bash
sudo mkdir -p /etc/cloudflared
sudo cp ~/.cloudflared/<UUID>.json /etc/cloudflared/
sudo chmod 600 /etc/cloudflared/<UUID>.json
sudo nano /etc/cloudflared/config.yml
```

কনফিগ ফাইলে লিখুন:

```yaml
tunnel: <UUID>
credentials-file: /etc/cloudflared/<UUID>.json
protocol: http2

ingress:
  - hostname: a.example.com
    service: http://localhost:3000
  - service: http_status:404
```

> **টিপ:** `protocol: http2` লাইনটা রাখুন। cloudflared ডিফল্টে QUIC (UDP পোর্ট 7844) ব্যবহার করে, যেটা অনেক EC2 সেটআপে ব্লক থাকে এবং লগে বারবার `Failed to dial a quic connection` এরর দেখায়। http2 শুধু outbound TCP 443 ব্যবহার করে, যা প্রায় সবসময় খোলা থাকে।

এবার DNS রেকর্ড তৈরি করুন (এটা `a.example.com`-কে টানেলের দিকে CNAME করে দেয়):

```bash
cloudflared tunnel route dns my-tunnel a.example.com
```

> **সতর্কতা:** এই কমান্ডটা `sudo` ছাড়া সাধারণ ইউজার হিসেবে চালাবেন, কারণ `cert.pem` আপনার হোম ডিরেক্টরিতে আছে। sudo দিলে root-এর হোমে খুঁজে `Cannot determine default origin certificate path` এরর দেবে।

কনফিগ ভ্যালিডেট করে টেস্ট রান দিন:

```bash
cloudflared tunnel --config /etc/cloudflared/config.yml ingress validate
cloudflared tunnel --config /etc/cloudflared/config.yml run my-tunnel
```

ব্রাউজারে `https://a.example.com` খুলে দেখুন সাইট লোড হচ্ছে কি না। হলে `Ctrl+C` দিয়ে বন্ধ করুন।

## ধাপ ৪: systemd সার্ভিস হিসেবে চালু (২৪/৭)

ফোরগ্রাউন্ডে চালালে SSH সেশন বন্ধ হলেই টানেল মরে যাবে এবং ভিজিটররা **Error 1033** দেখবে। তাই সার্ভিস হিসেবে ইনস্টল করুন:

```bash
sudo cloudflared --config /etc/cloudflared/config.yml service install
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
```

লগে সফলতার চিহ্ন:

```bash
sudo journalctl -u cloudflared -n 20 --no-pager
```

`Registered tunnel connection` লেখা কয়েকটা লাইন দেখলে বুঝবেন টানেল কানেক্টেড। `cloudflared tunnel list` চালালে CONNECTIONS কলামে `2xbom, 2xsin`-এর মতো এন্ট্রি দেখাবে।

---

## ধাপ ৫: Zero Trust — Application ও Team সেটআপ

এতক্ষণ সাইটটা পাবলিক ছিল। এবার আসল কাজ — শুধু নির্দিষ্ট ইউজারদের ঢুকতে দেওয়া।

১. যান **https://one.dash.cloudflare.com** — প্রথমবার হলে একটা **Team name** বেছে নিতে বলবে (যেমন `myteam` → লগইন পেজ হবে `myteam.cloudflareaccess.com`)। ফ্রি প্ল্যানে ৫০ ইউজার পর্যন্ত ফ্রি।

## ধাপ ৬: Access Group তৈরি (রোল হিসেবে ব্যবহার করুন)

আলাদা আলাদা ইউজার গ্রুপ (রোল) বানিয়ে রাখলে পরে একাধিক অ্যাপে রিইউজ করা যায়:

১. **Access → Access Groups → Add a Group**

**Group: admins**
- Include → Selector: **Emails** → `you@yourmail.com`

**Group: developers**
- Include → Selector: **Emails** → `dev1@mail.com`, `dev2@mail.com`

চাইলে **Emails ending in** সিলেক্টর দিয়ে পুরো কোম্পানি ডোমেইন (`@yourcompany.com`) অ্যালাও করতে পারেন।

## ধাপ ৭: Application তৈরি ও Multiple Policy যুক্ত করা

১. **Access → Applications → Add an application → Self-hosted**

২. কনফিগার করুন:
   - **Application name:** My App
   - **Session duration:** 24 hours (আপনার পছন্দমতো)
   - **Public hostname:** subdomain `a`, domain `example.com`

৩. **Policy যোগ করুন** — এখানেই মাল্টিপল পলিসির খেলা:

**Policy 1 — Admins**
- Action: **Allow**
- Include → Selector: **Access groups** → `admins`

**Policy 2 — Developers**
- Action: **Allow**
- Include → Selector: **Access groups** → `developers`

**Policy 3 — বাকি সবাইকে ব্লক (ঐচ্ছিক)**
- Action: **Block**
- Include: **Everyone**

> পলিসিগুলো উপর থেকে নিচে চেক হয়, প্রথম যেটা ম্যাচ করে সেটাই প্রযোজ্য হয়। কোনো Allow পলিসি ম্যাচ না করলে Access এমনিতেই ডিফল্টে ব্লক করে — Policy 3 শুধু অডিটের জন্য স্পষ্টতা দেয়।

৪. **Authentication:** ডিফল্টে **One-Time PIN** চালু থাকে — ইউজারের ইমেইলে ৬ ডিজিটের কোড যায়, কোনো এক্সট্রা সেটআপ লাগে না। চাইলে **Settings → Authentication → Login methods**-এ Google বা GitHub লগইনও যোগ করতে পারেন।

৫. Save করুন।

**ব্যস!** এখন `https://a.example.com`-এ যে-ই ঢুকুক, আগে Cloudflare-এর লগইন পেজ পাবে। পলিসিতে থাকা ইমেইল ছাড়া কেউ ভেতরে যেতে পারবে না — রিকোয়েস্ট আপনার EC2 পর্যন্ত পৌঁছাবেই না।

## ধাপ ৮: EC2 Security Group লক ডাউন

যেহেতু সব ট্রাফিক এখন টানেল দিয়ে আসে (cloudflared নিজে outbound কানেকশন বানায়), inbound পোর্ট খোলা রাখার আর দরকার নেই:

- EC2 Security Group থেকে **পোর্ট 3000, 80, 443-এর inbound রুল মুছে দিন** (যদি শুধু এই সার্ভিসের জন্য খোলা থাকে)।
- SSH-এর জন্য 22 রাখুন, বা আরও ভালো — AWS SSM Session Manager ব্যবহার করুন।

এটাই এই আর্কিটেকচারের সবচেয়ে বড় সুবিধা: আপনার সার্ভারের কোনো পোর্টই ইন্টারনেট থেকে সরাসরি দেখা যায় না।

---

## নতুন ইউজার যোগ করা (রিপিটেবল প্রসেস)

নতুন কেউ টিমে এলে:

১. **Access → Access Groups** → সঠিক গ্রুপে (যেমন `developers`) তার ইমেইল যোগ করুন → Save
২. তাকে বলুন `https://a.example.com` খুলতে → ইমেইল দিতে → OTP কোড দিয়ে ঢুকতে

কাউকে বাদ দিতে হলে:

১. গ্রুপ থেকে ইমেইল মুছুন (নতুন লগইন বন্ধ হয়ে যাবে)
২. **My Team → Users** → ইউজার খুঁজে → **Revoke sessions** (চলমান সেশনও সাথে সাথে বাতিল হবে)

## অডিট ও ভেরিফাই

- **My Team → Users** — কে কে লগইন করেছে তার তালিকা
- **Logs → Access** — প্রতিটা Allow/Block ইভেন্টের লগ
- টেস্ট: পলিসির বাইরের কোনো ইমেইল দিয়ে ঢোকার চেষ্টা করুন — "That account does not have access" দেখাবে

টার্মিনাল থেকে দ্রুত চেক:

```bash
curl -sI https://a.example.com | head -5
```

- `302` + `location: ...cloudflareaccess.com...` → টানেল চালু, Access পাহারা দিচ্ছে ✅
- `530` / Error 1033 → টানেল কানেক্টেড না, cloudflared লগ দেখুন
- `502` → টানেল ঠিক আছে কিন্তু `localhost:3000`-এ সার্ভিস সাড়া দিচ্ছে না

---

## কমন সমস্যা ও সমাধান

**Error 1033 (Cloudflare Tunnel error)**
টানেলের কোনো কানেক্টর Cloudflare-এ কানেক্টেড নেই। `sudo systemctl status cloudflared` চেক করুন — সার্ভিস বন্ধ থাকলে চালু করুন। ফোরগ্রাউন্ডে `tunnel run` দিয়ে টেস্ট করে SSH বন্ধ করলে এই এরর আসবেই — systemd সার্ভিস বাধ্যতামূলক।

**`Failed to dial a quic connection` (লগে বারবার)**
UDP 7844 outbound ব্লকড। সমাধান: কনফিগে `protocol: http2` যোগ করে রিস্টার্ট, অথবা Security Group-এ UDP 7844 egress খুলে দিন।

**`Cannot determine default origin certificate path`**
`cloudflared tunnel list` বা `route dns`-এর মতো ম্যানেজমেন্ট কমান্ড `sudo` দিয়ে চালালে root-এর হোমে `cert.pem` খোঁজে, পায় না। সাধারণ ইউজার হিসেবে চালান, অথবা `TUNNEL_ORIGIN_CERT=/home/ubuntu/.cloudflared/cert.pem` এনভায়রনমেন্ট ভেরিয়েবল দিন।

**সার্ভিস চলছে কিন্তু ক্রেডেনশিয়াল ফাইল পাচ্ছে না**
systemd সার্ভিস `/etc/cloudflared/config.yml` পড়ে — সেখানে `credentials-file` পাথ যেন `/etc/cloudflared/<UUID>.json`-এ পয়েন্ট করে এবং ফাইলটা আসলেই সেখানে থাকে।

---

## nginx থাকলে?

যদি সার্ভারে nginx রিভার্স প্রক্সি হিসেবে থাকে, ingress-এ শুধু nginx-এর পোর্ট দিন:

```yaml
ingress:
  - hostname: a.example.com
    service: http://localhost:80
  - service: http_status:404
```

আর nginx কনফিগে `client_max_body_size 512m;` দিতে ভুলবেন না — বড় ফাইল আপলোড বা git push-এ ডিফল্ট 1MB লিমিটে HTTP 413 এরর আসে।

## শেষ কথা

এই সেটআপের সৌন্দর্য হলো — এটা **যেকোনো সাইটে** কাজ করে। Gogs, Jenkins, Portainer, ডেভ সার্ভার, ইন্টারনাল ড্যাশবোর্ড — যা-ই `localhost`-এ চলুক, একই রেসিপি:

১. টানেল বানান → hostname-কে লোকাল পোর্টে ম্যাপ করুন
২. Zero Trust-এ Application বানান → Access Group দিয়ে পলিসি সাজান
৩. Security Group-এর inbound পোর্ট বন্ধ করুন

কোনো VPN নেই, কোনো পাবলিক IP এক্সপোজার নেই, কোনো সার্টিফিকেট ম্যানেজমেন্ট নেই — আর অ্যাক্সেস কন্ট্রোল পুরোটাই এক জায়গা থেকে, ইমেইল ধরে ধরে।

হ্যাপি সেলফ-হোস্টিং! 🚀
