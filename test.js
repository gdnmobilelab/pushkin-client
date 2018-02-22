const typescript = require("typescript");
const path = require("path");
const fs = require("fs");
const http = require("http");
const url = require("url");
const browserify = require("browserify");
const tsify = require("tsify");

const TESTS_SOURCE = path.join(__dirname, "src-tests", "tests.ts");
const HTML_SOURCE = path.join(__dirname, "src-tests", "index.html");
const DUMMY_WORKER_SOURCE = path.join(__dirname, "src-tests", "dummy-worker.js");

const SYSTEMJS_PATH = path.join(__dirname, "node_modules", "systemjs", "dist", "system-production.js");

const MOCHA_PATHS = {
  JS: path.join(__dirname, "node_modules", "mocha", "mocha.js"),
  CSS: path.join(__dirname, "node_modules", "mocha", "mocha.css")
};

function pipeFile(file, res, mimeType) {
  console.info("Piping", file);
  if (mimeType) {
    res.setHeader("Content-Type", mimeType);
  }
  let read = fs.createReadStream(file);
  read.pipe(res);
}

// let source = fs.readFileSync(TESTS_SOURCE, "utf-8");

// let result = typescript.transpileModule(source, {
//   compilerOptions: {
//     module: typescript.ModuleKind.None
//   }
// });

// const program = typescript.createProgram(
//   [path.join(__dirname, "src-tests", "tests.ts")],
//   {}
// );

// console.log(result);

let server = http.createServer(function(req, res) {
  let parsedURL = url.parse(req.url);
  if (parsedURL.path === "/" || parsedURL.path === "index.html") {
    return pipeFile(HTML_SOURCE, res, "text/html");
  }
  if (parsedURL.path === "/system.js") {
    return pipeFile(SYSTEMJS_PATH, res, "application/javascript");
  }
  if (parsedURL.path === "/mocha.js") {
    return pipeFile(MOCHA_PATHS.JS, res, "application/javascript");
  }
  if (parsedURL.path === "/mocha.css") {
    return pipeFile(MOCHA_PATHS.CSS, res, "text/css");
  }
  if (parsedURL.path === "/dummy-worker.js") {
    return pipeFile(DUMMY_WORKER_SOURCE, res, "application/javascript");
  }
  if (parsedURL.path === "/tests.js") {
    console.info("Sending compiled tests...");

    let b = browserify([TESTS_SOURCE]);

    b.plugin("tsify", {
      target: "es5",
      project: {},
      lib: ["dom", "es2015"],
      moduleResolution: "node",
      module: "commonjs"
    });

    let stream = b.bundle();
    console.log(stream);
    return stream.pipe(res);

    // let source = fs.readFileSync(TESTS_SOURCE, "utf-8");

    // const program = typescript.createProgram([TESTS_SOURCE], {
    //   module: typescript.ModuleKind.System,
    //   target: typescript.ScriptTarget.ES2015,
    //   noEmitOnError: true,
    //   outFile: "out.js",

    //   // sourceRoot: path.join(__dirname, "src-tests"),
    //   moduleResolution: typescript.ModuleResolutionKind.NodeJs
    // });
    // return program.emit(undefined, function(filename, content) {
    //   console.log("result?", content);
    //   res.setHeader("Content-Type", "application/javascript");
    //   return res.end(content);
    // });
    // let result = program.emit();

    // let result = typescript.transpileModule(source, {
    //   compilerOptions: {
    //     module: typescript.ModuleKind.System
    //   }
    // });
  }
  return res.end("no", 404);
});

server.listen(3100, function() {
  console.log("Server listening...");
});
