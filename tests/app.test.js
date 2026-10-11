const fs = require("node:fs");
const assert = require("node:assert/strict");

const source = fs.readFileSync("app.js", "utf8");
const match = source.match(/const formulaHTML = \(text\) =>[\s\S]*?;\n\s*\/\* ---------- filtering ---------- \*\//);

if (!match) {
  throw new Error("Could not locate formulaHTML in app.js");
}

const formulaFuncSource = match[0].replace(/\n\s*\/\* ---------- filtering ---------- \*\//, "");
const formulaHTML = new Function(`${formulaFuncSource}; return formulaHTML;`)();

assert.equal(formulaHTML(undefined), "");
assert.equal(formulaHTML("H2O"), "H<sub>2</sub>O");
assert.equal(formulaHTML("Fe3Al2(SiO4)3"), "Fe<sub>3</sub>Al<sub>2</sub>(SiO<sub>4</sub>)<sub>3</sub>");

console.log("formulaHTML checks passed");
