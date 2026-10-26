
const PURCHASE_KEY = "sudha_purchase_orders";
const SALES_KEY = "sudha_sales_orders";
const TRANSPORTER_KEY = "sudha_transporter_shipments";
const STOCK_MOVEMENTS_KEY = "sudha_stock_movements";

function readArray(key) {
  if (typeof window === "undefined") return [];

  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function normalizeUnit(unit) {
  return String(unit || "KG").trim().toUpperCase();
}

function normalizeItem(itemName) {
  return String(itemName || "").trim().toLowerCase();
}

function stockKey(itemName, unit) {
  return `${normalizeItem(itemName)}__${normalizeUnit(unit)}`;
}

function getOrderDate(order) {
  return (
    order.createdAt ||
    order.updatedAt ||
    order.orderDate ||
    order.date ||
    ""
  );
}

function getTimestamp(value) {
  if (!value) return 0;

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isValidOrder(order) {
  return (
    Boolean(String(order?.itemName || "").trim()) &&
    number(order?.qty) > 0
  );
}

function createProduct(itemName, unit) {
  return {
    itemName: String(itemName || "").trim(),
    unit: normalizeUnit(unit),
    purchasedQty: 0,
    soldQty: 0,
    reservedQty: 0,
    stockQty: 0,
    availableQty: 0,
    purchaseValue: 0,
    stockValue: 0,
    salesValue: 0,
    costOfGoodsSold: 0,
    averageCost: 0,
    grossProfit: 0,
  };
}

function ensureProduct(products, itemName, unit) {
  const key = stockKey(itemName, unit);

  if (!products.has(key)) {
    products.set(key, createProduct(itemName, unit));
  }

  return products.get(key);
}

/**
 * Option B:
 * Inventory is calculated from purchase and sales orders.
 * Stock movements are maintained separately as an audit history.
 */
export function getInventoryReport() {
  const purchases = readArray(PURCHASE_KEY);
  const sales = readArray(SALES_KEY);
  const shipments = readArray(TRANSPORTER_KEY);

  const products = new Map();
  const history = [];

  // Process completed purchases and dispatched/delivered sales
  // in chronological order for a more accurate running average cost.
  const events = [
    ...purchases
      .filter(
        (order) =>
          order.status === "Completed" && isValidOrder(order)
      )
      .map((order) => ({
        type: "purchase",
        order,
        timestamp: getTimestamp(getOrderDate(order)),
      })),

    ...sales
      .filter(
        (order) =>
          ["Dispatched", "Delivered"].includes(order.status) &&
          isValidOrder(order)
      )
      .map((order) => ({
        type: "sale",
        order,
        timestamp: getTimestamp(getOrderDate(order)),
      })),
  ].sort((a, b) => a.timestamp - b.timestamp);

  for (const event of events) {
    const order = event.order;
    const qty = number(order.qty);
    const unit = normalizeUnit(order.qtyUnit);
    const product = ensureProduct(products, order.itemName, unit);

    if (event.type === "purchase") {
      // billingPrice is the purchase rate used by the existing app.
      const unitCost = number(order.billingPrice);

      if (unitCost < 0) continue;

      const purchaseTotal = qty * unitCost;

      product.purchasedQty += qty;
      product.purchaseValue += purchaseTotal;
      product.stockQty += qty;
      product.stockValue += purchaseTotal;

      product.averageCost =
        product.stockQty > 0
          ? product.stockValue / product.stockQty
          : 0;

      history.push({
        type: "purchase",
        description: "Purchase received",
        date: getOrderDate(order),
        id: order.id || order.purchaseOrderNumber || "",
        orderNumber: order.purchaseOrderNumber || "",
        itemName: order.itemName,
        unit,
        qty,
        unitCost,
        rate: unitCost,
        value: purchaseTotal,
        total: purchaseTotal,
        purchaseValue: purchaseTotal,
        stockAfter: product.stockQty,
        averageCostAfter: product.averageCost,
      });
    } else {
      const rate = number(order.rate);
      const saleTotal = qty * rate;
      const averageCostAtSale = product.averageCost;
      const costOfGoodsSold = qty * averageCostAtSale;

      product.soldQty += qty;
      product.salesValue += saleTotal;
      product.costOfGoodsSold += costOfGoodsSold;

      product.stockQty -= qty;
      product.stockValue -= costOfGoodsSold;

      // Prevent tiny floating-point leftovers.
      if (Math.abs(product.stockQty) < 1e-9) {
        product.stockQty = 0;
      }

      if (Math.abs(product.stockValue) < 1e-7) {
        product.stockValue = 0;
      }

      product.averageCost =
        product.stockQty > 0
          ? product.stockValue / product.stockQty
          : 0;

      history.push({
        type: "sale",
        description: "Sales stock issued",
        date: getOrderDate(order),
        id: order.id || order.orderNumber || "",
        orderNumber: order.orderNumber || "",
        itemName: order.itemName,
        unit,
        qty,
        rate,
        unitCost: averageCostAtSale,
        value: saleTotal,
        total: saleTotal,
        salesValue: saleTotal,
        costOfGoodsSold,
        grossProfit: saleTotal - costOfGoodsSold,
        stockAfter: product.stockQty,
        averageCostAtSale,
      });
    }
  }

  // Pending / active sales reserve stock without reducing physical stock.
  for (const order of sales) {
    if (
      ["Cancelled", "Dispatched", "Delivered"].includes(order.status) ||
      !isValidOrder(order)
    ) {
      continue;
    }

    const product = ensureProduct(
      products,
      order.itemName,
      order.qtyUnit
    );

    product.reservedQty += number(order.qty);
  }

  const inventory = [...products.values()].map((product) => {
    const averageCost =
      product.stockQty > 0
        ? product.stockValue / product.stockQty
        : 0;

    return {
      ...product,
      averageCost,
      availableQty: product.stockQty - product.reservedQty,
      grossProfit: product.salesValue - product.costOfGoodsSold,
    };
  });

  const freightExpense = shipments
    .filter((shipment) => shipment.status !== "Cancelled")
    .reduce((sum, shipment) => sum + number(shipment.freight), 0);

  const sortedHistory = history.sort(
    (a, b) => getTimestamp(a.date) - getTimestamp(b.date)
  );

  return {
    inventory,
    history: sortedHistory,
    totals: {
      purchasedQty: inventory.reduce(
        (sum, product) => sum + product.purchasedQty,
        0
      ),
      soldQty: inventory.reduce(
        (sum, product) => sum + product.soldQty,
        0
      ),
      stockQty: inventory.reduce(
        (sum, product) => sum + product.stockQty,
        0
      ),
      availableQty: inventory.reduce(
        (sum, product) => sum + product.availableQty,
        0
      ),
      purchaseValue: inventory.reduce(
        (sum, product) => sum + product.purchaseValue,
        0
      ),
      salesValue: inventory.reduce(
        (sum, product) => sum + product.salesValue,
        0
      ),
      stockValue: inventory.reduce(
        (sum, product) => sum + product.stockValue,
        0
      ),
      reservedQty: inventory.reduce(
        (sum, product) => sum + product.reservedQty,
        0
      ),
      costOfGoodsSold: inventory.reduce(
        (sum, product) => sum + product.costOfGoodsSold,
        0
      ),
      grossProfit: inventory.reduce(
        (sum, product) => sum + product.grossProfit,
        0
      ),
      freightExpense,
    },
  };
}

export function getAvailableStock(itemName, unit) {
  const report = getInventoryReport();
  const key = stockKey(itemName, unit);

  return (
    report.inventory.find(
      (product) => stockKey(product.itemName, product.unit) === key
    ) || {
      ...createProduct(itemName, unit),
      availableQty: 0,
    }
  );
}

export function calculateOrderTotal(qty, rate) {
  return number(qty) * number(rate);
}

/**
 * Read stock movements in chronological order.
 */
export function getStockMovements() {
  return readArray(STOCK_MOVEMENTS_KEY).sort(
    (a, b) => getTimestamp(a.date) - getTimestamp(b.date)
  );
}

/**
 * Save a stock movement.
 * REVERSAL requires direction IN or OUT.
 * reversesMovementId can identify the original movement being reversed.
 */
export function recordStockMovement(movement) {
  if (typeof window === "undefined") {
    return {
      success: false,
      message: "Browser storage is unavailable.",
    };
  }

  if (
    !movement ||
    !movement.sourceType ||
    !movement.sourceId ||
    !movement.movementType ||
    !String(movement.itemName || "").trim() ||
    number(movement.qty) <= 0
  ) {
    return {
      success: false,
      message: "Invalid stock movement details.",
    };
  }

  const validTypes = ["IN", "OUT", "REVERSAL"];

  if (!validTypes.includes(movement.movementType)) {
    return {
      success: false,
      message: "Invalid movement type.",
    };
  }

  if (
    movement.movementType === "REVERSAL" &&
    !["IN", "OUT"].includes(movement.direction)
  ) {
    return {
      success: false,
      message: "A reversal requires direction IN or OUT.",
    };
  }

  const movements = readArray(STOCK_MOVEMENTS_KEY);

  const duplicate = movements.some((entry) => {
    const sameSource =
      String(entry.sourceType) === String(movement.sourceType) &&
      String(entry.sourceId) === String(movement.sourceId);

    if (!sameSource) return false;

    if (movement.movementType === "REVERSAL") {
      // Prefer a specific original movement reference.
      if (movement.reversesMovementId) {
        return (
          entry.movementType === "REVERSAL" &&
          String(entry.reversesMovementId || "") ===
            String(movement.reversesMovementId)
        );
      }

      // Legacy callers without a reference can only create one
      // reversal for a source event.
      return entry.movementType === "REVERSAL";
    }

    if (entry.movementType !== movement.movementType) {
      return false;
    }

    // Permit a new original movement if the previous one was reversed.
    const reversed = movements.some(
      (candidate) =>
        candidate.movementType === "REVERSAL" &&
        candidate.reversesMovementId &&
        String(candidate.reversesMovementId) === String(entry.id)
    );

    return !reversed;
  });

  if (duplicate) {
    return {
      success: true,
      duplicate: true,
      message: "Movement already exists.",
    };
  }

  const newMovement = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `SM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sourceType: String(movement.sourceType),
    sourceId: String(movement.sourceId),
    movementType: String(movement.movementType),
    itemName: String(movement.itemName).trim(),
    qty: number(movement.qty),
    unit: normalizeUnit(movement.unit),
    date: movement.date || new Date().toISOString(),
    description: String(movement.description || ""),
    ...(movement.movementType === "REVERSAL"
      ? {
          direction: movement.direction,
          reversesMovementId: movement.reversesMovementId || "",
        }
      : {}),
    createdAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(
      STOCK_MOVEMENTS_KEY,
      JSON.stringify([...movements, newMovement])
    );

    return {
      success: true,
      movement: newMovement,
    };
  } catch {
    return {
      success: false,
      message: "Could not save the stock movement.",
    };
  }
}

/**
 * Calculate physical stock from the movement ledger only.
 * This helper does not drive getInventoryReport() in Option B.
 */
export function getLedgerStock(itemName, unit) {
  const key = stockKey(itemName, unit);
  const movements = getStockMovements();

  const stockQty = movements.reduce((total, movement) => {
    if (stockKey(movement.itemName, movement.unit) !== key) {
      return total;
    }

    const qty = number(movement.qty);

    if (movement.movementType === "IN") {
      return total + qty;
    }

    if (movement.movementType === "OUT") {
      return total - qty;
    }

    if (movement.movementType === "REVERSAL") {
      if (movement.direction === "IN") return total + qty;
      if (movement.direction === "OUT") return total - qty;
    }

    return total;
  }, 0);

  return {
    itemName: String(itemName || "").trim(),
    unit: normalizeUnit(unit),
    stockQty,
  };
}

/**
 * Record a stock adjustment as a separate ledger event.
 */
export function recordStockAdjustment({
  sourceType = "purchase",
  sourceId,
  eventId,
  itemName,
  qty,
  unit,
  direction,
  date,
  description = "",
}) {
  if (typeof window === "undefined") {
    return {
      success: false,
      message: "Browser storage is unavailable.",
    };
  }

  if (
    !sourceId ||
    !eventId ||
    !String(itemName || "").trim() ||
    number(qty) <= 0 ||
    !["IN", "OUT"].includes(direction)
  ) {
    return {
      success: false,
      message: "Invalid stock adjustment.",
    };
  }

  const movements = readArray(STOCK_MOVEMENTS_KEY);

  const duplicate = movements.some(
    (movement) =>
      movement.sourceType === sourceType &&
      String(movement.sourceId) === String(sourceId) &&
      String(movement.eventId) === String(eventId)
  );

  if (duplicate) {
    return {
      success: true,
      duplicate: true,
      message: "Adjustment already exists.",
    };
  }

  const newMovement = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `SM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sourceType,
    sourceId: String(sourceId),
    eventId: String(eventId),
    movementType: direction,
    itemName: String(itemName).trim(),
    qty: number(qty),
    unit: normalizeUnit(unit),
    date: date || new Date().toISOString(),
    description,
    createdAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(
      STOCK_MOVEMENTS_KEY,
      JSON.stringify([...movements, newMovement])
    );

    return {
      success: true,
      movement: newMovement,
    };
  } catch {
    return {
      success: false,
      message: "Could not save the stock adjustment.",
    };
  }
}
