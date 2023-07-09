import { createServer } from "http";
import { readFile, readdir, writeFile } from "fs/promises";
import ReactMarkdown from "react-markdown";
import a11yEmoji from "@fec/remark-a11y-emoji";
import sanitizeFilename from "sanitize-filename";

// This is a server to host data-local resources like databases and RSC.

createServer(async (req, res) => {
  // console.log("req --> 1 ->", req);
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    console.log("url.pathname  1 -->", url.pathname, req.method);

    if (req.method === "POST" && url.pathname === "/update_comment") {
      let data = "";

      req.on("data", (chunk) => {
        data += chunk;
      });

      req.on("end", async () => {
        try {
          const commentData = JSON.parse(data);
          const { comment, slug } = commentData;

          // console.log("path to read from ", `./data/${slug}-comments.json`);
          // Read the file
          const fileData = await readFile(
            `./data/${slug}-comments.json`,
            "utf8"
          );

          const jsonData = JSON.parse(fileData);

          // Update the comments array with the new comment
          jsonData.comments.push({
            comment: comment,
            time: new Date().toLocaleString(),
          });

          // console.log("jsonData -->", jsonData);
          // Save the updated data back to the file
          await writeFile(
            `./data/${slug}-comments.json`,
            JSON.stringify(jsonData, null, 2),
            "utf8"
          );
          console.log("Updated comment:", comment);
          await sendJSX(res, <RenderPostPage slug={slug} />);
        } catch (err) {
          res.statusCode = 400; // Bad Request
          res.end();
        }
      });
    } else {
      await sendJSX(res, <Router url={url} />);
    }
  } catch (err) {
    res.statusCode = err.statusCode ?? 500;
    res.end();
  }
}).listen(8081);

async function RenderPostPage({ slug }) {
  const page = <BlogPostPage postSlug={slug} />;
  return <BlogLayout>{page}</BlogLayout>;
}

function Router({ url }) {
  // console.log("hello -->", url);
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
  return (
    <>
      <Post slug={postSlug} />
      <section>
        <form
          id="commentform"
          style={{ display: "flex", flexDirection: "column", width: "50%" }}
          // onSubmit={onSubmitForm}
        >
          <label htmlFor="comment">Comment:</label>
          <textarea
            id="comment"
            style={{ marginTop: "10px" }}
            name="comment"
            rows="4"
            required
          ></textarea>

          <button
            style={{
              display: "inline-block",
              width: "100px",
              marginTop: "10px",
              height: "30px",
              borderRadius: "10px",
              outline: "none",
              cursor: "pointer",
            }}
            type="submit"
          >
            Submit
          </button>
        </form>
      </section>
      <Comments slug={postSlug} />
    </>
  );
}

async function Comments({ slug }) {
  let commentsData = {};
  try {
    const commentsContent = await readFile(
      "./data/" + `${slug}-comments` + ".json",
      "utf8"
    );
    commentsData = JSON.parse(commentsContent);
  } catch (err) {
    commentsData = {
      comments: [],
    };
  }
  return (
    <section style={{ padding: "10px" }}>
      {commentsData.comments.map((item) => (
        <Comment item={item} key={item.time} />
      ))}
    </section>
  );
}
async function Comment({ item }) {
  return (
    <div
      style={{
        marginBottom: "20px",
        borderBottom: "1px solid",
        paddingBottom: "10px",
      }}
    >
      <div style={{ fontSize: "20px" }}> {item.comment}</div>
      <div style={{ fontSize: "14px" }}> {item.time} </div>
    </div>
  );
}

async function Post({ slug }) {
  let content;
  try {
    content = await readFile("./posts/" + slug + ".txt", "utf8");
  } catch (err) {
    throwNotFound(err);
  }
  return (
    <>
      <section>
        <h2>
          <a href={"/" + slug}>{slug}</a>
        </h2>
        <ReactMarkdown remarkPlugins={[a11yEmoji]}>{content}</ReactMarkdown>
      </section>
    </>
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

// style={{ background: getRandomColor(), transition: "background 2s" }}
function BlogLayout({ children }) {
  const author = "Jae Doe";
  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
      </head>
      <body>
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
  // console.log("clientJSXString -->", clientJSXString);
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
    // console.log("jsx -->", jsx);
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
  } else if (jsx != null && typeof jsx === "function") {
    return null;
  } else {
    console.log("In the not implement block", jsx, typeof jsx);
    throw new Error("Not implemented");
  }
}
