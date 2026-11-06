import { Router } from "express";
import bcrypt from "bcryptjs";
import { addAssignment, query, queryOne } from "../db.js";
import { HttpError, handle, rethrowDbError } from "../lib/errors.js";
import {
  parseEmail,
  parsePassword,
  parsePositiveInt,
  parseRequiredText,
  requireObject,
} from "../lib/validate.js";

const router = Router();

/**
 * Remove the password hash before sending a user to the client.
 * @param {object | null} user
 * @returns {object | null}
 */
function publicUser(user) {
  if (!user) {
    return null;
  }
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

/**
 * Load one user or respond 404.
 * @param {number} uid
 */
async function requireUser(uid) {
  const user = await queryOne("SELECT uid, uname, email, password FROM users WHERE uid = $1", [uid]);
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  return user;
}

router.get(
  "/get_users",
  handle(async (_req, res) => {
    const users = await query("SELECT uid, uname, email, password FROM users ORDER BY uid");
    res.json({ success: true, data: users.map((user) => publicUser(user)) });
  })
);

router.get(
  "/get_user/:id",
  handle(async (req, res) => {
    const uid = parsePositiveInt(req.params.id, "id");
    res.json({ success: true, data: publicUser(await requireUser(uid)) });
  })
);

router.post(
  "/add_user",
  handle(async (req, res) => {
    requireObject(req.body);
    const uname = parseRequiredText(req.body.uname, "uname", 80);
    const email = parseEmail(req.body.email);
    const password = parsePassword(req.body.password);
    const passwordHash = bcrypt.hashSync(password, 10);

    try {
      const inserted = await queryOne(
        "INSERT INTO users (uname, email, password) VALUES ($1, $2, $3) RETURNING uid",
        [uname, email, passwordHash]
      );
      const user = publicUser(await requireUser(Number(inserted?.uid)));
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      rethrowDbError(error);
    }
  })
);

router.put(
  "/update_user/:id",
  handle(async (req, res) => {
    requireObject(req.body);
    const uid = parsePositiveInt(req.params.id, "id");
    await requireUser(uid);

    const assignments = [];
    const values = [];

    if (req.body.uname !== undefined) {
      addAssignment(assignments, values, "uname", parseRequiredText(req.body.uname, "uname", 80));
    }
    if (req.body.email !== undefined) {
      addAssignment(assignments, values, "email", parseEmail(req.body.email));
    }
    if (req.body.password !== undefined && req.body.password !== "") {
      addAssignment(
        assignments,
        values,
        "password",
        bcrypt.hashSync(parsePassword(req.body.password), 10)
      );
    }
    if (assignments.length === 0) {
      throw new HttpError(400, "Provide at least one of uname, email, or password");
    }

    values.push(uid);
    try {
      await query(`UPDATE users SET ${assignments.join(", ")} WHERE uid = $${values.length}`, values);
    } catch (error) {
      rethrowDbError(error);
    }

    res.json({ success: true, data: publicUser(await requireUser(uid)) });
  })
);

router.delete(
  "/delete_user/:id",
  handle(async (req, res) => {
    const uid = parsePositiveInt(req.params.id, "id");
    await requireUser(uid);
    try {
      await query("DELETE FROM users WHERE uid = $1", [uid]);
    } catch (error) {
      rethrowDbError(error);
    }
    res.json({ success: true, data: { uid } });
  })
);

export default router;
