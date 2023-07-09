import { createServer } from "http";
import { readFile } from "fs/promises";
import { renderToString } from "react-dom/server";
import fetch from "node-fetch";
// This is a server to host CDN distributed resources like static files and SSR.

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === "/client.js") {
      const content = await readFile("./client.js", "utf8");
      res.setHeader("Content-Type", "text/javascript");
      res.end(content);
      return;
    }

    let response;

    if (req.method === "GET") {
      response = await fetch("http://127.0.0.1:8081" + url.pathname);
      if (!response.ok) {
        res.statusCode = response.status;
        res.end();
        return;
      }
      const clientJSXString = await response.text();
      processClientJSXFromRSC({ res, clientJSXString, url });
    } else if (req.method === "POST") {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", async () => {
        try {
          console.log("data -->", data);
          response = await fetch("http://127.0.0.1:8081" + url.pathname, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: data,
          });
          if (!response.ok) {
            res.statusCode = response.status;
            res.end();
            return;
          }

          // Handle the response as needed
          // For example, you can send the response back to the original client

          // res.statusCode = response.status;
          // res.setHeader("Content-Type", response.headers.get("Content-Type"));
          // response.body.pipe(res); // Pipe the response from the next server to the original client
          const clientJSXString = await response.text();
          processClientJSXFromRSC({ res, clientJSXString, url });
        } catch (err) {
          res.statusCode = 500;
          res.end();
        }
      });
    } else {
      res.statusCode = 405; // Method Not Allowed
      res.end();
    }
  } catch (err) {
    console.error(err);
    res.statusCode = err.statusCode ?? 500;
    res.end();
  }
  // const response = await fetch("http://127.0.0.1:8081" + url.pathname);
}).listen(8080);

function processClientJSXFromRSC({ res, clientJSXString, url }) {
  if (url.searchParams.has("jsx")) {
    res.setHeader("Content-Type", "application/json");
    res.end(clientJSXString);
  } else {
    const clientJSX = JSON.parse(clientJSXString, parseJSX);
    let html = renderToString(clientJSX);
    html += `<script>window.__INITIAL_CLIENT_JSX_STRING__ = `;
    html += JSON.stringify(clientJSXString).replace(/</g, "\\u003c");
    html += `</script>`;
    html += `
      <script type="importmap">
        {
          "imports": {
            "react": "https://esm.sh/react@canary",
            "react-dom/client": "https://esm.sh/react-dom@canary/client"
          }
        }
      </script>
      <script type="module" src="/client.js"></script>
    `;
    res.setHeader("Content-Type", "text/html");
    res.end(html);
  }
}

function parseJSX(key, value) {
  if (value === "$RE") {
    return Symbol.for("react.element");
  } else if (typeof value === "string" && value.startsWith("$$")) {
    return value.slice(1);
  } else {
    return value;
  }
}
