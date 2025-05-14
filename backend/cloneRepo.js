// cloneRepo.js
import { exec }         from "child_process";
import { promisify }    from "util";
import os               from "os";
import path             from "path";
import fs               from "fs-extra";

const execAsync = promisify(exec);

/**
 * Clone a private GitHub repo into ~/Documents.
 * If `replaceBuffer` is provided, writes it to test/test.spec.ts inside the clone.
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string} [ref="main"]
 * @param {Buffer} [replaceBuffer] – new contents for test/test.spec.ts
 * @returns {Promise<string>} – resolves with the local clone path
 */
export async function cloneRepoToDocuments(token, owner, repo, ref = "main", replaceBuffer) {
  console.log(token);
  if (!token) throw new Error("GITHUB_TOKEN must be set with `repo` scope");

  const gitUrl = `https://${token}@github.com/${owner}/${repo}.git`;
  const dest   = path.join(os.homedir(), "Documents", `${repo}-${ref}`);

  // clean existing clone
  if (await fs.pathExists(dest)) {
    await fs.remove(dest);
  }

  // clone branch
  await execAsync(
    `git clone --branch ${ref} --single-branch ${gitUrl} "${dest}"`
  );

  // if caller passed a buffer, overwrite test/test.spec.ts
  if (replaceBuffer) {
    const target = path.join(dest, "custom_test.sh");
    await fs.ensureDir(path.dirname(target));
    await fs.writeFile(target, replaceBuffer);
  }

  return dest;
}
