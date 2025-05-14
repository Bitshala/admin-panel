// testRunner.js
import { promisify } from "util";
import { exec }      from "child_process";
import os            from "os";
import path          from "path";
import fs            from "fs-extra";

const execAsync = promisify(exec);

/**
 * Parse a Jest/Mocha-style stdout and count total vs. passing tests.
 *
 * @param {string} stdout
 * @returns {{ total: string}}
 */

function returnLast4LinesFromStdOut(stdout) {
  const lines = stdout.split("\n");
  const last4Lines = lines.slice(-6);
  return last4Lines.join("\n");
}

/**
 * Run a test script in an existing cloned repo under ~/Documents,
 * then parse its output to report total and passing test counts.
 *
 * @param {string} repo           – name of the folder in ~/Documents (e.g. "my-repo")
 * @param {string} [ref="main"]   – branch or tag suffix used in folder name
 * @param {string} [scriptName="test.sh"] – script filename at the root of that folder
 * @returns {Promise<{ path: string, total: string, passing: number }>}
 */
export async function runTests(repo, ref = "main", scriptName = "custom_test.sh") {
  const dest = path.join(os.homedir(), "Documents", `${repo}-${ref}`);

  // 1. Ensure the repo folder exists
  if (!(await fs.pathExists(dest))) {
    throw new Error(`Directory not found: ${dest}`);
  }

  // 2. Ensure the script exists
  const scriptPath = path.join(dest, scriptName);
  if (!(await fs.pathExists(scriptPath))) {
    throw new Error(`Script not found: ${scriptPath}`);
  }

  // 3. Execute the script and capture stdout
  let stdout, stderr;
  try {
    ({ stdout, stderr } = await execAsync(`sh ${scriptName}`, { cwd: dest }));
  } catch (err) {
    // If the script itself fails, it may still produce output
    stdout = err.stdout || "";
    stderr = err.stderr || err.message;
    console.error(`Error running ${scriptName}:`, stderr);
  }

  if (stderr) {
    console.error(`stderr from ${scriptName}:\n`, stdout);
  }
  const last4Lines = returnLast4LinesFromStdOut(stdout);  
  return {last4Lines, stdout, stderr};
}
