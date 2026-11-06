import { Router } from "express";
import { addAssignment, query, queryOne } from "../db.js";
import { HttpError, handle, rethrowDbError } from "../lib/errors.js";
import {
  parseOptionalText,
  parsePositiveInt,
  parsePrice,
  parseQty,
  parseRequiredText,
  requireObject,
} from "../lib/validate.js";

const router = Router();

const productColumns = "pid, pname, description, price, qty";

/**
 * Load one product or respond 404.
 * @param {number} pid
 */
async function requireProduct(pid) {
  const product = await queryOne(
    `SELECT ${productColumns} FROM products WHERE pid = $1`,
    [pid]
  );
  if (!product) {
    throw new HttpError(404, "Product not found");
  }
  return product;
}

router.get(
  "/get_products",
  handle(async (_req, res) => {
    const products = await query(
      `SELECT ${productColumns} FROM products ORDER BY pid`
    );
    res.json({ success: true, data: products });
  })
);

router.get(
  "/get_product/:id",
  handle(async (req, res) => {
    const pid = parsePositiveInt(req.params.id, "id");
    res.json({ success: true, data: await requireProduct(pid) });
  })
);

router.post(
  "/add_product",
  handle(async (req, res) => {
    requireObject(req.body);
    const pname = parseRequiredText(req.body.pname, "pname", 120);
    const description = parseOptionalText(req.body.description, "description", 1000);
    const price = parsePrice(req.body.price);
    const qty = parseQty(req.body.qty);

    try {
      const inserted = await queryOne(
        `INSERT INTO products (pname, description, price, qty)
         VALUES ($1, $2, $3, $4)
         RETURNING pid`,
        [pname, description, price, qty]
      );
      const product = await requireProduct(Number(inserted?.pid));
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      rethrowDbError(error);
    }
  })
);

router.put(
  "/update_product/:id",
  handle(async (req, res) => {
    requireObject(req.body);
    const pid = parsePositiveInt(req.params.id, "id");
    await requireProduct(pid);

    const assignments = [];
    const values = [];

    if (req.body.pname !== undefined) {
      addAssignment(assignments, values, "pname", parseRequiredText(req.body.pname, "pname", 120));
    }
    if (req.body.description !== undefined) {
      addAssignment(
        assignments,
        values,
        "description",
        parseOptionalText(req.body.description, "description", 1000)
      );
    }
    if (req.body.price !== undefined) {
      addAssignment(assignments, values, "price", parsePrice(req.body.price));
    }
    if (req.body.qty !== undefined) {
      addAssignment(assignments, values, "qty", parseQty(req.body.qty));
    }
    if (assignments.length === 0) {
      throw new HttpError(400, "Provide at least one of pname, description, price, or qty");
    }

    values.push(pid);
    try {
      await query(
        `UPDATE products SET ${assignments.join(", ")} WHERE pid = $${values.length}`,
        values
      );
    } catch (error) {
      rethrowDbError(error);
    }

    res.json({ success: true, data: await requireProduct(pid) });
  })
);

router.delete(
  "/delete_product/:id",
  handle(async (req, res) => {
    const pid = parsePositiveInt(req.params.id, "id");
    await requireProduct(pid);
    try {
      await query("DELETE FROM products WHERE pid = $1", [pid]);
    } catch (error) {
      rethrowDbError(error);
    }
    res.json({ success: true, data: { pid } });
  })
);

export default router;
