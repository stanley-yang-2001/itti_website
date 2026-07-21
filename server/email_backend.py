"""
Pluggable email sending.

EMAIL_BACKEND controls how outgoing email actually gets sent:
  - "console" (default) -> logs the email instead of sending it. Zero
                            setup, works completely offline, and is what
                            makes the forgot-password flow fully testable
                            right now with no email provider at all.
  - "smtp"               -> sends via a real SMTP server (SendGrid,
                             Postmark, Mailgun, plain SMTP, etc - anything
                             that speaks SMTP).

Same shape as storage.py: pick a backend via env var, nothing else in
the codebase needs to change when you're ready to send real email.
"""
import logging
import os
import smtplib
from email.message import EmailMessage

logger = logging.getLogger("itti")


class ConsoleEmailBackend:
    """Logs the email instead of sending it. This is the dev default -
    the forgot-password flow is fully exercisable locally without any
    email provider: the reset link just shows up in the server log."""

    def send(self, to, subject, body):
        logger.info("=== EMAIL (console backend, not actually sent) ===")
        logger.info("To: %s", to)
        logger.info("Subject: %s", subject)
        logger.info("Body:\n%s", body)
        logger.info("=== end email ===")


class SMTPEmailBackend:
    """Sends real email via SMTP. Configure with SMTP_HOST, SMTP_PORT,
    SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL (see .env.example)."""

    def __init__(self):
        self.host = os.environ.get("SMTP_HOST")
        self.port = int(os.environ.get("SMTP_PORT", "587"))
        self.username = os.environ.get("SMTP_USERNAME")
        self.password = os.environ.get("SMTP_PASSWORD")
        self.from_email = os.environ.get("SMTP_FROM_EMAIL", self.username)

        if not self.host or not self.from_email:
            raise RuntimeError(
                "EMAIL_BACKEND=smtp requires SMTP_HOST and SMTP_FROM_EMAIL "
                "(and usually SMTP_USERNAME/SMTP_PASSWORD) to be set"
            )

    def send(self, to, subject, body):
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = self.from_email
        msg["To"] = to
        msg.set_content(body)

        with smtplib.SMTP(self.host, self.port) as server:
            server.starttls()
            if self.username and self.password:
                server.login(self.username, self.password)
            server.send_message(msg)


def get_email_backend():
    backend = os.environ.get("EMAIL_BACKEND", "console").lower()
    if backend == "smtp":
        return SMTPEmailBackend()
    return ConsoleEmailBackend()


def send_password_reset_email(backend, to_email, reset_link):
    backend.send(
        to=to_email,
        subject="Reset your ITTI password",
        body=(
            "Someone (hopefully you) requested a password reset for your ITTI account.\n\n"
            f"Reset your password here: {reset_link}\n\n"
            "This link expires in 1 hour. If you didn't request this, you can safely "
            "ignore this email - your password will not be changed."
        ),
    )