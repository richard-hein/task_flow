import { config } from "../config/app.config.js";
import { resend } from "./resendClient.js";
const mailer_sender = config.NODE_ENV === "development"
    ? `no-reply <onboarding@resend.dev>`
    : `no-reply <${config.MAILER_SENDER}>`;
export const sendEmail = async ({ to, subject, text, html, from = mailer_sender, }) => await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    text,
    subject,
    html,
});
