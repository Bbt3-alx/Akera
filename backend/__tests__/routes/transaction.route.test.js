import { describe, expect, it, jest } from "@jest/globals";

import transactionRoutes from "../../routes/transactionRoute.js";

describe("transaction routes", () => {
  it("returns 410 from legacy edit and restore routes", () => {
    for (const path of ["/:id/edit", "/:id/restore"]) {
      const route = findRoute(path, "put");
      const res = createResponse();

      route.stack.at(-1).handle({}, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(410);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        code: 410,
        message: "Legacy transaction route disabled.",
      });
    }
  });
});

function findRoute(path, method) {
  const layer = transactionRoutes.stack.find(
    (candidate) =>
      candidate.route?.path === path && candidate.route?.methods?.[method],
  );

  expect(layer).toBeDefined();

  return layer.route;
}

function createResponse() {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };

  return res;
}
