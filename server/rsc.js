import { createServer } from "http";
import { readFile, readdir } from "fs/promises";
import ReactMarkdown from "react-markdown";
import a11yEmoji from "@fec/remark-a11y-emoji";
import sanitizeFilename from "sanitize-filename";

// This is a server to host data-local resources like databases and RSC.

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    await sendJSX(res, <Router url={url} />);
  } catch (err) {
    res.statusCode = err.statusCode ?? 500;
    res.end();
  }
}).listen(8081);

function Router({ url }) {
  let page;
  if (url.pathname === "/") {
    page = <BlogIndexPage />;
  } else {
    const postSlug = sanitizeFilename(url.pathname.slice(1));
    page = <BlogPostPage postSlug={postSlug} />;
  }
  return <BlogLayout>{page}</BlogLayout>;
}

async function BlogIndexPage() {
  const postFiles = await readdir("./posts");
  const postSlugs = postFiles.map((file) =>
    file.slice(0, file.lastIndexOf("."))
  );
  return (
    <section>
      <h1>Welcome to my blog</h1>
      <div>
        {postSlugs.map((slug) => (
          <Post key={slug} slug={slug} />
        ))}
      </div>
    </section>
  );
}

function BlogPostPage({ postSlug }) {
  return <Post slug={postSlug} />;
}

async function Post({ slug }) {
  let content;
  try {
    content = await readFile("./posts/" + slug + ".txt", "utf8");
  } catch (err) {
    throwNotFound(err);
  }
  return (
    <section>
      <h2>
        <a href={"/" + slug}>{slug}</a>
      </h2>
      <ReactMarkdown remarkPlugins={[a11yEmoji]}>{content}</ReactMarkdown>
    </section>
  );
}

function getRandomColor() {
  // Generate a random number between 0 and 16777215 (decimal representation of FFFFFF in hex)
  const randomColor = Math.floor(Math.random() * 16777216);

  // Convert the random number to hex format
  const hexColor = randomColor.toString(16);

  // Pad the hex color with zeros if needed
  const paddedHexColor = hexColor.padStart(6, "0");

  // Prepend the '#' symbol to the hex color
  const finalHexColor = "#" + paddedHexColor;

  return finalHexColor;
}

function BlogLayout({ children }) {
  const author = "Jae Doe";
  return (
    <html>
      <head>
        <meta charset="UTF-8" />
      </head>
      <body
        style={{ background: getRandomColor(), transition: "background 2s" }}
      >
        <nav>
          <a href="/">Home</a>
          <hr />
          <input />
          <hr />
        </nav>
        <main>{children}</main>
        <Footer author={author} />
      </body>
    </html>
  );
}

function Footer({ author }) {
  return (
    <footer>
      <hr />
      <p>
        <i>
          (c) {author} {new Date().getFullYear()}
        </i>
      </p>
      <FragmentExample1 />
    </footer>
  );
}

function FragmentExample1() {
  return (
    <>
      <div>FragmentExample1 Layer 1</div>
      FragmentExample1 Layer 2
      <FragmentExample2 />
    </>
  );
}

function FragmentExample2() {
  return (
    <>
      <div>FragmentExample2 Layer 1</div>
      FragmentExample2 Layer 2
    </>
  );
}

async function sendJSX(res, jsx) {
  const clientJSX = await renderJSXToClientJSX(jsx);
  const clientJSXString = JSON.stringify(clientJSX, stringifyJSX);
  res.setHeader("Content-Type", "application/json");
  res.end(clientJSXString);
}

function throwNotFound(cause) {
  const notFound = new Error("Not found.", { cause });
  notFound.statusCode = 404;
  throw notFound;
}

function stringifyJSX(key, value) {
  if (value === Symbol.for("react.element")) {
    return "$RE";
  } else if (typeof value === "string" && value.startsWith("$")) {
    return "$" + value;
  } else {
    return value;
  }
}

async function renderJSXToClientJSX(jsx) {
  if (
    typeof jsx === "string" ||
    typeof jsx === "number" ||
    typeof jsx === "boolean" ||
    jsx == null
  ) {
    return jsx;
  } else if (Array.isArray(jsx)) {
    return Promise.all(jsx.map((child) => renderJSXToClientJSX(child)));
  } else if (jsx != null && typeof jsx === "object") {
    console.log("jsx -->", jsx);
    if (jsx.$$typeof === Symbol.for("react.element")) {
      if (typeof jsx.type === "string") {
        return {
          ...jsx,
          props: await renderJSXToClientJSX(jsx.props),
        };
      } else if (typeof jsx.type === "function") {
        const Component = jsx.type;
        const props = jsx.props;
        const returnedJsx = await Component(props);
        return renderJSXToClientJSX(returnedJsx);
      } else if (jsx.type === Symbol.for("react.fragment")) {
        // Handle fragments
        return renderJSXToClientJSX(jsx.props.children || []);
      } else throw new Error("Not implemented.");
    } else {
      return Object.fromEntries(
        await Promise.all(
          Object.entries(jsx).map(async ([propName, value]) => [
            propName,
            await renderJSXToClientJSX(value),
          ])
        )
      );
    }
  } else {
    console.log("In the not implement block", jsx);
    throw new Error("Not implemented");
  }
}
