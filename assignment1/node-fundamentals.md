# Node.js Fundamentals

An overview of how we can repurpose a **high-performance racing engine** (the browser) for powering a **high-capacity generator** for our house (the server).

## What is Node.js?

Node.js is a tool that lets us run **JavaScript** directly on a computer or server, taking it **"off-road"** and away from the web browser. In some ways, it is like taking an engine from a car or truck and bolting it up to our house. While we no longer have wheels and the vehicle can no longer "drive" (move around a web page), we are still using the same **controls and internal components** (*syntax*) to power something much larger.

If we think of it this way, then we can imagine still using the **engine alternator** to generate power to all electrical components in our house. This allows us to do things that would otherwise be impossible if the vehicle was on the road—like connecting to the **house's plumbing** (the *file system*), to our **phone lines** (*HTTP/Internet*), or even a **radio** to listen for feedback (*API Requests*) from other vehicles around the world. 


## How does Node.js differ from running JavaScript in the browser?

Think of running JavaScript in a browser like driving this vehicle on a **public road**. We are limited by the **rules of the road** (*security restrictions*) and can only go where roads exist (*the browser window*). We cannot drive our car everywhere, and even when we get there, we can only see what is exposed to a browser, limiting what code written in JavaScript can even do. 

In Node.js, we can take the same car into our own **private garage**. Because we own the garage, we can ignore all of these rules. We can hook up directly to the house (the *server*) and gain **unmitigated access** to all of its otherwise hidden parts—like the storage or phone lines—allowing us to build some very powerful applications all while using the same **steering wheel / dashboard** we are familiar with using.

```js
console.log(__dirname);        // absolute path to this file's folder
console.log(__filename);       // absolute path to this file
console.log(process.platform); // 'darwin', 'win32', 'linux', etc.
console.log(process.pid);      // the running process ID
```

## What is the V8 engine, and how does Node use it?

It is no surprise that Google decided to call their workhorse behind their browser an **Engine**. And it's only fitting for it to be called **V8** as well; it goes perfectly with this analogy. The V8 Engine is the actual **physical engine** under the hood that makes everything move and work together. Originally, it was built specifically for the road (*Google Chrome*) and intended to win races on the web. It is exceptional at turning **"gasoline"** (*JavaScript*) into **"mechanical energy"** (*machine code*) breathtakingly fast.

Since the V8 Engine is **open source**, Node.js basically swapped the engine from Google Chrome and put it in our house, since it was already the fastest, most capable tool at making power. While the engine still processes **fuel** (*code*) the exact same way that the browser does, Node provides us with new **"outlets"** so that the engine's power can be transferred to handling hard drive or network requests instead of just turning wheels.

## What are some key use cases for Node.js?

Since the engine is now a **high-speed generator** for our house, it excels at tasks that require constant, fast energy.

*   **Real-time Power (Streaming & Chat):** Imagine the engine powering a constant stream of water or electricity. Because it is so fast, Node is perfect at doing things like **Netflix** (*streaming data*) or **Slack** (*instant messaging*), where we need the "alternator" to keep pumping energy without a flicker.
*   **The Smart-Home Hub (APIs):** Since we have connected our vehicle to our phone lines, it is great at being a **"concierge."** It is able to listen for hundreds of requests from other "vehicles" (users) at once, grab a specific "item" from storage (*a database*), and send it back out instantly.
*   **Heavy-Duty Tools (CLI Tools):** Sometimes we just need the engine's **raw torque** to run a massive power saw in the garage. Developers can use Node to build tools that **automate** boring tasks, like organizing thousands of files or "painting" (*building*) a website before it goes live.

## Explain the difference between CommonJS and ES Modules. Give a code example of each.

We can think of these as the **blueprints** or **instruction manuals** for how we bolt new parts onto our engine. Even though the engine is the same, there are two different "standards" for how parts should connect.

*   **CommonJS (The Classic Manual):** This is very much like the original, heavy-duty repair manual that comes with the car. It uses a very direct approach (*require*). It is reliable and has been used in garages for years, but it is a bit **old-school** and was designed specifically for our "private garage" (Node.js).

**CommonJS (default in Node.js):**
```js
const fs = require('fs');
module.exports = { greet: () => console.log('Hello!') };
```

*   **ES Modules (The Modern Universal Blueprint):** This is the newer and sleeker set of instructions (*import/export*) that works for **both** cars on the road (the browser) and our engines in the house. It is like a **universal adapter kit**. While the "classic manual" is still found everywhere, the industry is moving towards these "universal blueprints" so that the same parts can be easily swapped between the road and the garage without needing a different toolkit.

**ES Modules (supported in modern Node.js):**
```js
import fs from 'fs';
export const greet = () => console.log('Hello!');
```