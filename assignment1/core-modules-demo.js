const os = require("os");
const path = require("path");
const fs = require("fs");

const sampleFilesDir = path.join(__dirname, "sample-files");
if (!fs.existsSync(sampleFilesDir)) {
  fs.mkdirSync(sampleFilesDir, { recursive: true });
}

// OS module
console.log("Platform:", os.platform());
console.log("CPU:", os.cpus()[0].model);
console.log("Total Memory:", os.totalmem());

// Path module
const joinedPath = path.join(sampleFilesDir, "folder", "file.txt");
console.log("Joined path:", joinedPath);

// fs.promises API
(async () => {
  await fs.promises.writeFile(
    path.join(sampleFilesDir, "demo.txt"),
    "Hello from fs.promises!",
    "utf8",
  );
  const demoText = await fs.promises.readFile(
    path.join(sampleFilesDir, "demo.txt"),
    "utf8",
  );
  console.log("fs.promises read:", demoText);
})().catch((error) => {
  console.error("Error:", error.message);
});

// Streams for large files- log first 40 chars of each chunk
(async () => {
  const largeFilePath = path.join(sampleFilesDir, "largefile.txt");
    await new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(largeFilePath, {
        encoding: "utf8",
      });
  
      writeStream.on("error", reject);
      writeStream.on("finish", resolve);
  
      for (let index = 1; index <= 100; index += 1) {
        writeStream.write(`This is a line in a large file. Line ${index}\n`);
      }
  
      writeStream.end();
    });
  
  const readStream = fs.createReadStream(largeFilePath, {
    encoding: "utf8",
    highWaterMark: 1024,
  });

  readStream.on("data", (chunk) => {
    console.log("Read chunk:", chunk.slice(0, 40) + "...");
  });

  readStream.on("end", () => {
    console.log("Finished reading large file with streams.");
  });
})().catch((error) => {
  console.error("Error:", error.message);
});
