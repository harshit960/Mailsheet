function base64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function base64Utf8(text: string): string {
  return base64(new TextEncoder().encode(text));
}

function base64Url(text: string): string {
  return base64Utf8(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** RFC 2047 — a header with non-ASCII characters has to be encoded. */
function encodeHeader(value: string): string {
  const clean = value.replace(/[\r\n]+/g, " ").trim();
  return /^[\x00-\x7F]*$/.test(clean) ? clean : `=?UTF-8?B?${base64Utf8(clean)}?=`;
}

export interface MimeMessage {
  to: string;
  subject: string;
  body: string;
}

/** A base64url RFC 5322 message, which is what Gmail's API wants as `raw`. */
export function buildRawMessage({ to, subject, body }: MimeMessage): string {
  const headers = [
    `To: ${encodeHeader(to)}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  ].join("\r\n");

  // Base64 bodies must be wrapped at 76 characters.
  const encodedBody = (base64Utf8(body.replace(/\r?\n/g, "\r\n")).match(/.{1,76}/g) ?? []).join(
    "\r\n",
  );

  return base64Url(`${headers}\r\n\r\n${encodedBody}`);
}
