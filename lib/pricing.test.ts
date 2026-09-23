import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computePricing, normalizeTiers, tierRangeLabel, mergeLines, getUnit } from "./pricing.ts";

const BASE = 55000;
const TIERS = [
  { qty: 2, unitPrice: 38000 },
  { qty: 3, unitPrice: 33000 }
];

describe("normalizeTiers", () => {
  test("tự thêm mốc 1 cái = giá mặc định và sắp xếp tăng dần", () => {
    const t = normalizeTiers([{ qty: 3, unitPrice: 33000 }, { qty: 2, unitPrice: 38000 }], BASE);
    assert.deepEqual(t, [
      { qty: 1, unitPrice: BASE },
      { qty: 2, unitPrice: 38000 },
      { qty: 3, unitPrice: 33000 }
    ]);
  });

  test("không có mốc nào -> chỉ còn mốc 1 cái", () => {
    assert.deepEqual(normalizeTiers([], BASE), [{ qty: 1, unitPrice: BASE }]);
    assert.deepEqual(normalizeTiers(null, BASE), [{ qty: 1, unitPrice: BASE }]);
    assert.deepEqual(normalizeTiers(undefined, BASE), [{ qty: 1, unitPrice: BASE }]);
  });

  test("mốc 1 cái khai báo sẵn thì ưu tiên hơn giá mặc định", () => {
    const t = normalizeTiers([{ qty: 1, unitPrice: 50000 }], BASE);
    assert.deepEqual(t, [{ qty: 1, unitPrice: 50000 }]);
  });

  test("bỏ mốc lỗi (qty <= 0, NaN, giá âm, thiếu giá)", () => {
    const t = normalizeTiers(
      [
        { qty: 0, unitPrice: 1000 },
        { qty: -2, unitPrice: 1000 },
        { qty: NaN, unitPrice: 1000 },
        { qty: 2, unitPrice: -5 },
        { qty: 4 },
        { qty: 5, unitPrice: 30000 }
      ],
      BASE
    );
    assert.deepEqual(t, [
      { qty: 1, unitPrice: BASE },
      { qty: 5, unitPrice: 30000 }
    ]);
  });

  test("trùng số lượng: mốc khai báo sau ghi đè mốc trước", () => {
    const t = normalizeTiers([{ qty: 2, unitPrice: 40000 }, { qty: 2, unitPrice: 38000 }], BASE);
    assert.equal(t.find((x) => x.qty === 2)?.unitPrice, 38000);
  });

  test("dữ liệu cũ dạng giá cả gói được đổi sang đơn giá", () => {
    const t = normalizeTiers([{ qty: 2, price: 75000 }, { qty: 3, price: 96000 }], BASE);
    assert.deepEqual(t, [
      { qty: 1, unitPrice: BASE },
      { qty: 2, unitPrice: 37500 },
      { qty: 3, unitPrice: 32000 }
    ]);
  });
});

describe("computePricing", () => {
  test("mua 1 cái -> giá lẻ, chưa có tiết kiệm", () => {
    const r = computePricing(TIERS, BASE, 1);
    assert.equal(r.total, 55000);
    assert.equal(r.unitPrice, 55000);
    assert.equal(r.tierQty, 1);
    assert.equal(r.savings, 0);
    assert.deepEqual(r.nextTier, { qty: 2, unitPrice: 38000, needMore: 1 });
  });

  test("đúng bằng mốc 2 -> đơn giá mốc 2 cho toàn bộ", () => {
    const r = computePricing(TIERS, BASE, 2);
    assert.equal(r.total, 76000);
    assert.equal(r.unitPrice, 38000);
    assert.equal(r.tierQty, 2);
    assert.equal(r.savings, 55000 * 2 - 76000);
    assert.deepEqual(r.nextTier, { qty: 3, unitPrice: 33000, needMore: 1 });
  });

  test("đúng bằng mốc cao nhất -> hết mốc kế tiếp", () => {
    const r = computePricing(TIERS, BASE, 3);
    assert.equal(r.total, 99000);
    assert.equal(r.tierQty, 3);
    assert.equal(r.nextTier, null);
  });

  test("vượt mốc cao nhất vẫn giữ đơn giá mốc cao nhất", () => {
    const r = computePricing(TIERS, BASE, 10);
    assert.equal(r.total, 330000);
    assert.equal(r.unitPrice, 33000);
    assert.equal(r.nextTier, null);
  });

  test("số lượng nằm giữa 2 mốc -> dùng mốc thấp hơn và báo cần mua thêm", () => {
    const tiers = [{ qty: 2, unitPrice: 38000 }, { qty: 5, unitPrice: 30000 }];
    const r = computePricing(tiers, BASE, 4);
    assert.equal(r.unitPrice, 38000);
    assert.equal(r.total, 152000);
    assert.deepEqual(r.nextTier, { qty: 5, unitPrice: 30000, needMore: 1 });
  });

  test("số lượng 0, âm, NaN -> tổng 0", () => {
    for (const q of [0, -1, NaN]) {
      const r = computePricing(TIERS, BASE, q);
      assert.equal(r.total, 0);
      assert.equal(r.savings, 0);
      assert.equal(r.nextTier, null);
    }
  });

  test("không có mốc -> luôn tính giá mặc định × số lượng", () => {
    const r = computePricing([], BASE, 7);
    assert.equal(r.total, 385000);
    assert.equal(r.tierQty, 1);
    assert.equal(r.nextTier, null);
  });

  test("cấu hình sai (mốc lớn hơn lại đắt hơn) -> không bao giờ tính đắt hơn mốc thấp", () => {
    const tiers = [{ qty: 2, unitPrice: 38000 }, { qty: 3, unitPrice: 45000 }];
    const r = computePricing(tiers, BASE, 3);
    assert.equal(r.unitPrice, 38000);
    assert.equal(r.total, 114000);
  });

  test("hai mốc cùng đơn giá -> báo mốc có số lượng lớn hơn", () => {
    const tiers = [{ qty: 2, unitPrice: 38000 }, { qty: 4, unitPrice: 38000 }];
    assert.equal(computePricing(tiers, BASE, 4).tierQty, 4);
  });

  test("tổng số lượng lớn (200) vẫn chính xác, không lỗi làm tròn", () => {
    assert.equal(computePricing(TIERS, BASE, 200).total, 200 * 33000);
  });

  test("ví dụ thực tế: 1 loại đen ×2 + 1 loại trắng ×1 = 3 cái -> mốc 3", () => {
    const totalQty = [{ qty: 1 }, { qty: 2 }].reduce((s, l) => s + l.qty, 0);
    assert.equal(computePricing(TIERS, BASE, totalQty).total, 99000);
  });
});

describe("tierRangeLabel", () => {
  const tiers = normalizeTiers([{ qty: 2, unitPrice: 38000 }, { qty: 5, unitPrice: 30000 }], BASE);
  test("mốc đầu, giữa, cuối", () => {
    assert.equal(tierRangeLabel(tiers, 0), "1 cái");
    assert.equal(tierRangeLabel(tiers, 1), "2 – 4 cái");
    assert.equal(tierRangeLabel(tiers, 2), "5+ cái");
  });
  test("mốc liền kề chỉ hiện 1 số", () => {
    const t = normalizeTiers([{ qty: 2, unitPrice: 38000 }, { qty: 3, unitPrice: 33000 }], BASE);
    assert.deepEqual([0, 1, 2].map((i) => tierRangeLabel(t, i)), ["1 cái", "2 cái", "3+ cái"]);
  });
  test("chỉ có mốc 1 cái", () => {
    assert.equal(tierRangeLabel(normalizeTiers([], BASE), 0), "1 cái");
  });
});

describe("mergeLines", () => {
  test("gộp các dòng cùng thuộc tính, cộng dồn số lượng", () => {
    const merged = mergeLines([
      { attrs: { Màu: "đen", "kích thước": "15" }, qty: 1 },
      { attrs: { "kích thước": "15", Màu: "đen" }, qty: 2 },
      { attrs: { Màu: "trắng", "kích thước": "15" }, qty: 1 }
    ]);
    assert.equal(merged.length, 2);
    assert.equal(merged.find((l) => l.attrs["Màu"] === "đen")?.qty, 3);
  });
});

describe("tên đơn vị", () => {
  test("mặc định là 'cái' khi chưa đặt", () => {
    assert.equal(getUnit([]), "cái");
    assert.equal(getUnit(null), "cái");
    assert.equal(getUnit([{ qty: 2, unitPrice: 38000 }]), "cái");
  });

  test("đọc tên đơn vị admin đặt và cắt khoảng trắng", () => {
    assert.equal(getUnit([{ qty: 2, unitPrice: 38000 }, { qty: 0, unit: "  bộ " }]), "bộ");
  });

  test("tên đơn vị rỗng -> quay về 'cái'", () => {
    assert.equal(getUnit([{ qty: 0, unit: "   " }]), "cái");
  });

  test("phần tử đơn vị không bị tính thành mốc giá và không ảnh hưởng tiền", () => {
    const variants = [{ qty: 2, unitPrice: 38000 }, { qty: 0, unitPrice: 0, unit: "bộ" }];
    assert.deepEqual(normalizeTiers(variants, BASE), [
      { qty: 1, unitPrice: BASE },
      { qty: 2, unitPrice: 38000 }
    ]);
    assert.equal(computePricing(variants, BASE, 2).total, 76000);
    assert.equal(computePricing(variants, BASE, 1).total, 55000);
  });

  test("nhãn mốc dùng đúng đơn vị", () => {
    const t = normalizeTiers([{ qty: 3, unitPrice: 32000 }], BASE);
    assert.equal(tierRangeLabel(t, 0, "bộ"), "1 – 2 bộ");
    assert.equal(tierRangeLabel(t, 1, "bộ"), "3+ bộ");
  });
});
