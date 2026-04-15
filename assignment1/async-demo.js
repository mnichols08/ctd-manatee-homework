const fs = require("fs");
const path = require("path");

// Write a sample file for demonstration
const sampleDir = path.join(__dirname, "sample-files");
const filePath = path.join(sampleDir, "sample.txt");
const message = "Hello, async world!";
fs.mkdirSync(sampleDir, { recursive: true });
fs.writeFileSync(filePath, message);

// 1. Callback style
fs.readFile(filePath, "utf8", (err, data) => {
  if (err) {
    console.error("Callback Error:", err.message);
  } else {
    console.log("Callback read:", data);
  }
});

// Callback hell example (test and leave it in comments):
// fs.readFile(fileA, 'utf8', (errA, dataA) => {
//   if (errA) return console.error(errA);
//   fs.readFile(fileB, 'utf8', (errB, dataB) => {
//     if (errB) return console.error(errB);
//     fs.readFile(fileC, 'utf8', (errC, dataC) => {
//       if (errC) return console.error(errC);
//       console.log(dataA, dataB, dataC);
//     });
//   });
// });

// 2. Promise style
const { promisify } = require("util");
const readFilePromise = promisify(fs.readFile);
readFilePromise(filePath, "utf8")
  .then((data) => {
    console.log("Promise read:", data);
  })
  .catch((err) => {
    console.error("Promise Error:", err.message);
  });

// 3. Async/Await style
const readFileAsync = async () => {
  try {
    const data = await readFilePromise(filePath, "utf8");
    console.log("Async/Await read:", data);
  } catch (err) {
    console.error("Async/Await Error:", err.message);
  }
};

readFileAsync();
