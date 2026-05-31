'use strict';

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'nanmeihao@' + (process.env.RESEND_DOMAIN || 'your-domain.com');
const SITE_NAME = '小南娘好物推荐';
const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Rate limiter: ensure at least 500ms between sends (max 2 req/s, Resend free tier limit)
let lastSentTime = 0;
const MIN_INTERVAL_MS = 500;

const waitForRateLimit = async () => {
  const now = Date.now();
  const elapsed = now - lastSentTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }
  lastSentTime = Date.now();
};

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const verificationEmailHtml = (code, username) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>邮箱验证</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f0eb;font-family:'PingFang SC','Microsoft YaHei',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f0eb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#e879a9,#f0a0c0);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;">${SITE_NAME}</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">亚文化好物推荐社区</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#333333;font-size:16px;">您好，<strong>${username}</strong>：</p>
              <p style="margin:0 0 24px;color:#666666;font-size:14px;line-height:1.7;">感谢您注册 ${SITE_NAME}！请使用下方验证码完成邮箱验证，验证码 <strong>10 分钟内有效</strong>。</p>

              <!-- Code Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#fdf2f7;border:2px solid #e879a9;border-radius:12px;padding:24px;text-align:center;">
                    <p style="margin:0 0 8px;color:#999999;font-size:12px;">您的验证码</p>
                    <p style="margin:0;font-size:36px;font-weight:bold;color:#e879a9;letter-spacing:8px;">${code}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;color:#999999;font-size:12px;line-height:1.6;">⚠️ 如果您没有注册账号，请忽略此邮件。此验证码只对本次操作有效。</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f9f5f2;padding:20px 40px;text-align:center;border-top:1px solid #f0e8e3;">
              <p style="margin:0;color:#bbbbbb;font-size:11px;">&copy; ${new Date().getFullYear()} ${SITE_NAME} — 互相抄作业，分享美好生活</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const resetPasswordEmailHtml = (code, username, isReset = true) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${isReset ? '重置密码' : '修改密码'}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f0eb;font-family:'PingFang SC','Microsoft YaHei',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f0eb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#e879a9,#f0a0c0);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;">${SITE_NAME}</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">亚文化好物推荐社区</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#333333;font-size:16px;">您好，<strong>${username}</strong>：</p>
              <p style="margin:0 0 24px;color:#666666;font-size:14px;line-height:1.7;">我们收到了${isReset ? '重置密码' : '修改密码'}的请求，请使用下方验证码完成操作，验证码 <strong>10 分钟内有效</strong>。</p>

              <!-- Code Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#fdf2f7;border:2px solid #e879a9;border-radius:12px;padding:24px;text-align:center;">
                    <p style="margin:0 0 8px;color:#999999;font-size:12px;">您的验证码</p>
                    <p style="margin:0;font-size:36px;font-weight:bold;color:#e879a9;letter-spacing:8px;">${code}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;color:#999999;font-size:12px;line-height:1.6;">⚠️ 如果您没有发起${isReset ? '重置密码' : '修改密码'}请求，请忽略此邮件。此验证码只对本次操作有效。</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f9f5f2;padding:20px 40px;text-align:center;border-top:1px solid #f0e8e3;">
              <p style="margin:0;color:#bbbbbb;font-size:11px;">&copy; ${new Date().getFullYear()} ${SITE_NAME} — 互相抄作业，分享美好生活</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Send verification email
const sendVerificationEmail = async (to, username) => {
  const code = generateVerificationCode();
  try {
    await waitForRateLimit();
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `【${SITE_NAME}】注册验证码：${code}`,
      html: verificationEmailHtml(code, username),
    });
    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message, code };
    }
    return { success: true, code };
  } catch (err) {
    console.error('Send email error:', err);
    return { success: false, error: err.message, code };
  }
};

// Send reset password email
const sendResetPasswordEmail = async (to, username) => {
  const code = generateVerificationCode();
  try {
    await waitForRateLimit();
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `【${SITE_NAME}】重置密码验证码：${code}`,
      html: resetPasswordEmailHtml(code, username, true),
    });
    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message, code };
    }
    return { success: true, code };
  } catch (err) {
    console.error('Send email error:', err);
    return { success: false, error: err.message, code };
  }
};

// Send change password email (same template but different subject)
const sendChangePasswordEmail = async (to, username) => {
  const code = generateVerificationCode();
  try {
    await waitForRateLimit();
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `【${SITE_NAME}】修改密码验证码：${code}`,
      html: resetPasswordEmailHtml(code, username, false),
    });
    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message, code };
    }
    return { success: true, code };
  } catch (err) {
    console.error('Send email error:', err);
    return { success: false, error: err.message, code };
  }
};

module.exports = {
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendChangePasswordEmail,
  generateVerificationCode,
};
