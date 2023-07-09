import { hydrateRoot } from "react-dom/client";

const root = hydrateRoot(document, getInitialClientJSX());
let currentPathname = window.location.pathname;

async function navigate(pathname) {
  currentPathname = pathname;
  const clientJSX = await fetchClientJSX(pathname);
  if (pathname === currentPathname) {
    root.render(clientJSX);
  }
}

function getInitialClientJSX() {
  const clientJSX = JSON.parse(window.__INITIAL_CLIENT_JSX_STRING__, parseJSX);
  return clientJSX;
}

async function fetchClientJSX(pathname) {
  const response = await fetch(pathname + "?jsx");
  const clientJSXString = await response.text();
  const clientJSX = JSON.parse(clientJSXString, parseJSX); // Notice the second argument
  //
  console.log("clientJSX -->", clientJSX);
  return clientJSX;
}

function parseJSX(key, value) {
  if (value === "$RE") {
    // This is our special marker we added on the server.
    // Restore the Symbol to tell React that this is valid JSX.
    return Symbol.for("react.element");
  } else if (typeof value === "string" && value.startsWith("$$")) {
    // This is a string starting with $. Remove the extra $ added by the server.
    return value.slice(1);
  } else {
    return value;
  }
}

window.addEventListener(
  "click",
  (e) => {
    console.log("e -->", e);
    if (e.target.tagName === "BUTTON" && e.target.type === "submit") {
      handleCommentSubmit(e);
      return;
    }
    if (e.target.tagName !== "A") {
      return;
    }
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    const href = e.target.getAttribute("href");
    if (!href.startsWith("/")) {
      return;
    }
    e.preventDefault();
    window.history.pushState(null, null, href);
    navigate(href);
  },
  true
);

window.addEventListener("popstate", () => {
  navigate(window.location.pathname);
});

async function handleCommentSubmit(event) {
  event.preventDefault();
  const comment = document.getElementById("comment").value;

  if (!comment) return;
  // Create an object with the form data

  const currentURL = new URL(window.location.href);
  const slug = currentURL.pathname.substring(1);
  const formData = {
    comment: comment,
    slug,
  };

  console.log("formData", formData);

  try {
    const response = await fetch(`/update_comment?jsx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const clientJSXString = await response.text();
    const clientJSX = JSON.parse(clientJSXString, parseJSX); // Notice the second argument
    //
    // console.log("clientJSX -->", clientJSX);
    // return clientJSX;
    // if (pathname === currentPathname) {
    root.render(clientJSX);
    // }
  } catch (error) {
    console.error("Error updating comment:", error);
  }
}
