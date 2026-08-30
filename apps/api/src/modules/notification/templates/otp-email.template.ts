/**
 * Transactional HTML for the OTP email (Ch32/Ch50). Table-based layout with
 * inline styles only — the set of CSS most email clients (Gmail, Outlook,
 * Apple Mail) actually render consistently; a <style> block or flex/grid
 * would silently break in several of them. Brand colors mirror
 * apps/mobile/src/theme/colors.ts (COLORS.primary etc.) so this reads as the
 * same product as the app, not a generic transactional email.
 */
export function buildOtpEmailHtml(code: string, ttlSeconds: number): string {
  const minutes = Math.round(ttlSeconds / 60);
  const digits = code
    .split("")
    .map(
      (digit) =>
        `<td style="width:40px;height:52px;background:#F6F6FB;border-radius:8px;text-align:center;vertical-align:middle;font:700 26px 'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E1B4B;">${digit}</td>`,
    )
    .join(`<td style="width:8px;"></td>`);

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F6F6FB;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F6FB;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:480px;width:100%;box-shadow:0 4px 24px rgba(30,27,75,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#4F46E5,#4338CA);padding:28px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:36px;height:36px;background:rgba(255,255,255,0.15);border-radius:10px;text-align:center;vertical-align:middle;">
                      <span style="font:700 18px 'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;">M</span>
                    </td>
                    <td style="padding-left:10px;">
                      <span style="font:700 18px 'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;letter-spacing:0.5px;">MOTIQ</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 8px;">
                <p style="margin:0;font:700 20px 'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">Your verification code</p>
                <p style="margin:8px 0 0;font:400 14px 'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#64748b;line-height:1.5;">
                  Enter this code in the MOTIQ app to sign in. It expires in ${minutes} minute${minutes === 1 ? "" : "s"}.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>${digits}</tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <p style="margin:0;font:400 13px 'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#8B87A6;line-height:1.6;">
                  Didn't request this code? You can safely ignore this email — no account changes were made.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#F6F6FB;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font:400 12px 'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#8B87A6;">
                  MOTIQ &middot; AI-powered roadside assistance &middot; Now live in Bengaluru
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
