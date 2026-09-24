import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, isPlausiblePhone, validateCustomer, canonLines, createRateLimiter } from "./antispam.ts";

describe("normalizePhone", () => {
  test("bỏ ký tự phân cách và đổi đầu số quốc tế", () => {
    assert.equal(normalizePhone("0912 345 679"), "0912345679");
    assert.equal(normalizePhone("0912.345.679"), "0912345679");
    assert.equal(normalizePhone("+84912345679"), "0912345679");
    assert.equal(normalizePhone("84912345679"), "0912345679");
    assert.equal(normalizePhone(null), "");
  });
});

describe("isPlausiblePhone", () => {
  test("số thật hợp lệ", () => {
    assert.equal(isPlausiblePhone("0382383850"), true);
    assert.equal(isPlausiblePhone("0984225615"), true);
    assert.equal(isPlausiblePhone("0988666666"), true); // số đẹp vẫn cho qua
  });
  test("sai định dạng", () => {
    assert.equal(isPlausiblePhone("123456789"), false);
    assert.equal(isPlausiblePhone("0212345679"), false); // đầu số không phải di động
    assert.equal(isPlausiblePhone("038238385"), false); // thiếu số
    assert.equal(isPlausiblePhone("03823838500"), false); // thừa số
    assert.equal(isPlausiblePhone("abcdefghij"), false);
  });
  test("số bấm bừa", () => {
    assert.equal(isPlausiblePhone("0999999999"), false);
    assert.equal(isPlausiblePhone("0912345678"), false);
    assert.equal(isPlausiblePhone("0987654321"), false);
  });
});

describe("validateCustomer", () => {
  const good = { name: "  Nguyễn  Thị A ", phone: "+84 382 383 850", address: "Số 5, xã A, huyện B, Hà Nội" };
  test("hợp lệ và chuẩn hoá dữ liệu", () => {
    const r = validateCustomer(good);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.name, "Nguyễn Thị A");
      assert.equal(r.phone, "0382383850");
    }
  });
  test("tên toàn số hoặc quá ngắn", () => {
    assert.equal(validateCustomer({ ...good, name: "12345" }).ok, false);
    assert.equal(validateCustomer({ ...good, name: "A" }).ok, false);
  });
  test("địa chỉ quá ngắn", () => {
    assert.equal(validateCustomer({ ...good, address: "Ok" }).ok, false);
  });
  test("thiếu trường", () => {
    assert.equal(validateCustomer({}).ok, false);
  });
});

describe("canonLines", () => {
  test("không phụ thuộc thứ tự dòng hay thứ tự khoá", () => {
    const a = [
      { attrs: { Màu: "Đen", Size: "L" }, qty: 2 },
      { attrs: { Màu: "Xanh", Size: "M" }, qty: 1 }
    ];
    const b = [
      { attrs: { Size: "M", Màu: "Xanh" }, qty: 1 },
      { attrs: { Size: "L", Màu: "Đen" }, qty: 2 }
    ];
    assert.equal(canonLines(a), canonLines(b));
  });
  test("khác số lượng hoặc thuộc tính thì khác", () => {
    const a = [{ attrs: { Màu: "Đen" }, qty: 2 }];
    assert.notEqual(canonLines(a), canonLines([{ attrs: { Màu: "Đen" }, qty: 3 }]));
    assert.notEqual(canonLines(a), canonLines([{ attrs: { Màu: "Xanh" }, qty: 2 }]));
  });
});

describe("createRateLimiter", () => {
  test("chặn khi vượt số lần trong cửa sổ, cho lại khi hết cửa sổ", () => {
    const allow = createRateLimiter(3, 1000);
    assert.equal(allow("ip", 0), true);
    assert.equal(allow("ip", 100), true);
    assert.equal(allow("ip", 200), true);
    assert.equal(allow("ip", 300), false);
    assert.equal(allow("khac", 300), true);
    assert.equal(allow("ip", 1100), true);
  });
});
