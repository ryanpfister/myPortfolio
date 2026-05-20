#!/usr/bin/env node
// One-time migration — import the static blog-bacnet.html post into the DB
// so it can be edited from /admin.html like any other post.
//
// Run on the VPS as the same user that owns the DB:
//   cd /var/www/rdpfister.com/html/server
//   sudo -u www-data node migrate-bacnet.js
//
// Safe to re-run — it updates the row in place if it already exists.

require('dotenv').config();
const db = require('./db');

const BACNET_BODY_MD = `## What Is BACnet?

**BACnet** (Building Automation and Control Networks) is an open-standard communication protocol specifically designed for building automation systems. Developed by ASHRAE and ratified as an ISO standard in 2003, it's the common language that lets devices from different manufacturers — thermostats, air handlers, lighting controllers, fire panels, elevators — all communicate on a single network.

Before BACnet, building systems were siloed. Your HVAC controller from one vendor couldn't talk to the lighting system from another. You needed proprietary gateways and custom integrations for everything. BACnet changed that by providing a universal data model and communication protocol that any vendor could implement.

<div class="callout"><strong>Why it matters:</strong> A large commercial building might have hundreds of controllers from a dozen vendors. BACnet is what lets a building operator monitor and control all of them from a single workstation — or lets a modern BMS platform like Siemens Desigo integrate them into one coherent system.</div>

## The BACnet Object Model

BACnet represents everything in a building system as **objects** with **properties**. This is the core abstraction that makes the protocol so flexible.

The most common object types you'll encounter:

<div class="table-wrap">
<table>
  <thead><tr><th>Object Type</th><th>Abbreviation</th><th>Example</th></tr></thead>
  <tbody>
    <tr><td>Analog Input</td><td>AI</td><td>Temperature sensor reading (72.4°F)</td></tr>
    <tr><td>Analog Output</td><td>AO</td><td>Damper position command (0–100%)</td></tr>
    <tr><td>Analog Value</td><td>AV</td><td>Setpoint (70°F cooling setpoint)</td></tr>
    <tr><td>Binary Input</td><td>BI</td><td>Fan status (running / stopped)</td></tr>
    <tr><td>Binary Output</td><td>BO</td><td>Lights on/off command</td></tr>
    <tr><td>Binary Value</td><td>BV</td><td>Occupied mode flag</td></tr>
    <tr><td>Schedule</td><td>SCH</td><td>HVAC occupancy schedule</td></tr>
    <tr><td>Trend Log</td><td>TL</td><td>Historical temperature data</td></tr>
  </tbody>
</table>
</div>

Every object has a set of properties. The most important one is the **Present Value** — the current reading or command state of that object. When you're commissioning a system, you spend a lot of time reading and writing Present Values to verify that controllers are responding correctly.

\`\`\`
// Reading a BACnet object via BACnet/IP
ReadProperty-Request {
  object-identifier: (analog-input, 1)   // AI-1
  property-identifier: present-value
}

ReadProperty-ACK {
  object-identifier: (analog-input, 1)
  property-identifier: present-value
  property-value: 72.4  // 72.4°F
}
\`\`\`

## BACnet Transport Options

BACnet can run over several different physical and network layers, which is one reason it's so widely deployed:

- **BACnet/IP** — The most common today. BACnet messages carried over standard Ethernet/IP networks. Easy to integrate with IT infrastructure.
- **BACnet MS/TP** — Master-Slave/Token-Passing over RS-485. A serial protocol common for field-level devices like VAV controllers. Very cost-effective for large deployments.
- **BACnet/Ethernet** — Direct Ethernet framing without IP. Less common now.
- **BACnet/MSTP over Arcnet** — Legacy, rarely seen anymore.

In practice at Siemens, we typically see a hybrid: BACnet/IP for controllers at the floor or building level, MS/TP for the field devices (VAV boxes, fan coil units) hanging off those controllers. A BACnet router bridges between the two.

## Change of Value (COV) Subscriptions

Polling every device every few seconds to check its current value would create enormous network traffic in a large building. BACnet solves this elegantly with **Change of Value (COV) subscriptions**.

Instead of asking "what's the temperature?" every 30 seconds, a supervisor subscribes to a sensor object and only receives a notification when the value changes beyond a defined increment. This dramatically reduces network load while keeping the BMS current.`;

const post = {
  slug: 'bacnet',
  title: 'BACnet: The Protocol That Makes Smart Buildings Talk',
  date: '2025-05-15',
  category: 'building-automation',
  excerpt: "Every time you walk into a modern office building and the lights adjust automatically, the HVAC knows the room is occupied, or the access control logs your badge swipe — BACnet is probably involved. Here's how it works and why it matters.",
  intro: "Every time you walk into a modern office building and the lights adjust automatically, the HVAC knows the room is occupied, or the access control logs your badge swipe — BACnet is probably involved. Here's what it is, how it works, and what I've learned working with it firsthand at Siemens.",
  body_md: BACNET_BODY_MD,
  tags: 'BACnet, BAS, Networking, Smart Buildings, Siemens',
  published: 1,
};

const existing = db.getPost(post.slug);
if (existing) {
  console.log(`Post "${post.slug}" already in DB — updating in place...`);
  db.updatePost(post.slug, post);
  console.log('✓ Updated.');
} else {
  db.createPost(post);
  console.log('✓ BACnet post imported into DB.');
}

console.log('\nNext steps:');
console.log('  1. Open https://rdpfister.com/admin.html');
console.log('  2. In "Posts on the server", click Edit on the BACnet post');
console.log('  3. Tweak content as desired, then Publish');
console.log('\nLive at: https://rdpfister.com/blog/bacnet');
console.log('Note: the legacy https://rdpfister.com/blog-bacnet.html still serves the static file.');
console.log('Once you confirm the DB-backed version looks right, you can delete blog-bacnet.html');
console.log('or add an nginx redirect (see server/README.md).');
