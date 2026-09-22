import { google } from "googleapis";

export async function appendOrderToSheet(row: (string | number)[]) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  // Chưa cấu hình Google Sheet thì bỏ qua, không làm hỏng luồng đặt hàng
  if (!email || !key || !sheetId) {
    console.warn("Thiếu GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY / GOOGLE_SHEET_ID, bỏ qua ghi Sheet.");
    return;
  }

  const auth = new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Sheet1!A:I",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] }
  });
}
