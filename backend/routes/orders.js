import { Router } from "express";
import { addAssignment, query, queryOne } from "../db.js";
import { HttpError, handle, rethrowDbError } from "../lib/errors.js";
import { parseOrderDate, parsePositiveInt, requireObject } from "../lib/validate.js";

const router = Router();

const orderSelect = `
  SELECT
    o.oid,
    o.uid,
    o.pid,
    to_char(o.order_date, 'YYYY-MM-DD') AS order_date,
    u.uname,
    u.email,
    p.pname,
    p.price
  FROM orders o
  INNER JOIN users u ON u.uid = o.uid
  INNER JOIN products p ON p.pid = o.pid
`;

/**
 * Confirm a user id exists before it is stored on an order.
 * @param {number} uid
 */
async function assertUserExists(uid) {
  const user = await queryOne("SELECT uid FROM users WHERE uid = $1", [uid]);
  if (!user) {
    throw new HttpError(400, "uid does not match an existing user");
  }
}

/**
 * Confirm a product id exists before it is stored on an order.
 * @param {number} pid
 */
async function assertProductExists(pid) {
  const product = await queryOne("SELECT pid FROM products WHERE pid = $1", [pid]);
  if (!product) {
    throw new HttpError(400, "pid does not match an existing product");
  }
}

/**
 * Load one order with its user and product, or respond 404.
 * @param {number} oid
 */
async function requireOrder(oid) {
  const order = await queryOne(`${orderSelect} WHERE o.oid = $1`, [oid]);
  if (!order) {
    throw new HttpError(404, "Order not found");
  }
  return order;
}

router.get(
  "/get_orders",
  handle(async (_req, res) => {
    const orders = await query(`${orderSelect} ORDER BY o.order_date DESC, o.oid DESC`);
    res.json({ success: true, data: orders });
  })
);

router.get(
  "/get_orders/uid/:uid",
  handle(async (req, res) => {
    const uid = parsePositiveInt(req.params.uid, "uid");
    await assertUserExists(uid);
    const orders = await query(
      `${orderSelect} WHERE o.uid = $1 ORDER BY o.order_date DESC, o.oid DESC`,
      [uid]
    );
    res.json({ success: true, data: orders });
  })
);

router.get(
  "/get_orders/pid/:pid",
  handle(async (req, res) => {
    const pid = parsePositiveInt(req.params.pid, "pid");
    await assertProductExists(pid);
    const orders = await query(
      `${orderSelect} WHERE o.pid = $1 ORDER BY o.order_date DESC, o.oid DESC`,
      [pid]
    );
    res.json({ success: true, data: orders });
  })
);

router.get(
  "/get_order/:id",
  handle(async (req, res) => {
    const oid = parsePositiveInt(req.params.id, "id");
    res.json({ success: true, data: await requireOrder(oid) });
  })
);

router.post(
  "/add_order",
  handle(async (req, res) => {
    requireObject(req.body);
    const uid = parsePositiveInt(req.body.uid, "uid");
    const pid = parsePositiveInt(req.body.pid, "pid");
    const orderDate = parseOrderDate(req.body.order_date);
    await assertUserExists(uid);
    await assertProductExists(pid);

    try {
      const inserted = await queryOne(
        "INSERT INTO orders (uid, pid, order_date) VALUES ($1, $2, $3) RETURNING oid",
        [uid, pid, orderDate]
      );
      const order = await requireOrder(Number(inserted?.oid));
      res.status(201).json({ success: true, data: order });
    } catch (error) {
      rethrowDbError(error);
    }
  })
);

router.put(
  "/update_order/:id",
  handle(async (req, res) => {
    requireObject(req.body);
    const oid = parsePositiveInt(req.params.id, "id");
    await requireOrder(oid);

    const assignments = [];
    const values = [];

    if (req.body.uid !== undefined) {
      const uid = parsePositiveInt(req.body.uid, "uid");
      await assertUserExists(uid);
      addAssignment(assignments, values, "uid", uid);
    }
    if (req.body.pid !== undefined) {
      const pid = parsePositiveInt(req.body.pid, "pid");
      await assertProductExists(pid);
      addAssignment(assignments, values, "pid", pid);
    }
    if (req.body.order_date !== undefined) {
      addAssignment(assignments, values, "order_date", parseOrderDate(req.body.order_date));
    }
    if (assignments.length === 0) {
      throw new HttpError(400, "Provide at least one of uid, pid, or order_date");
    }

    values.push(oid);
    try {
      await query(
        `UPDATE orders SET ${assignments.join(", ")} WHERE oid = $${values.length}`,
        values
      );
    } catch (error) {
      rethrowDbError(error);
    }

    res.json({ success: true, data: await requireOrder(oid) });
  })
);

router.delete(
  "/delete_order/:id",
  handle(async (req, res) => {
    const oid = parsePositiveInt(req.params.id, "id");
    await requireOrder(oid);
    try {
      await query("DELETE FROM orders WHERE oid = $1", [oid]);
    } catch (error) {
      rethrowDbError(error);
    }
    res.json({ success: true, data: { oid } });
  })
);

export default router;
