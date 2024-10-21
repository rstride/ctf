import smtplib
from email.mime.text import MIMEText

# SMTP configuration
smtp_server = "ssl0.ovh.net"
port = 465
username = "ctf@rstride.fr"
password = "Ichibisan66&"

# Email content
msg = MIMEText("This is a test email from the VPS.")
msg["Subject"] = "Test Email"
msg["From"] = "ctf@rstride.fr"
msg["To"] = "romain.stride@gmail.com"

# Sending the email
try:
    server = smtplib.SMTP_SSL(smtp_server, port)
    server.login(username, password)
    server.sendmail(msg["From"], [msg["To"]], msg.as_string())
    server.quit()
    print("Email sent successfully.")
except Exception as e:
    print(f"Failed to send email: {e}")