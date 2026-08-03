const fs = require("fs");
const path = require("path");

const correctTsConfig = {
  compilerOptions: {
    target: "ES2020",
    module: "commonjs",
    moduleResolution: "node",
    lib: ["ES2020"],
    outDir: "dist",
    rootDir: "src",
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    resolveJsonModule: true,
  },
  include: ["src/**/*.ts"],
  exclude: ["node_modules", "dist"],
};

const tsconfigPath = path.join(__dirname, "tsconfig.json");
fs.writeFileSync(tsconfigPath, JSON.stringify(correctTsConfig, null, 2));

console.log("tsconfig.json has been overwritten with the correct settings.");
console.log("Contents now:");
console.log(fs.readFileSync(tsconfigPath, "utf-8"));