import { SESClient, SendEmailCommand, SendRawEmailCommand } from "@aws-sdk/client-ses";

export type AWSSESPayload = {
  to: string;
  from: string;
  subject: string;
  htmlContent: string;
};

/**
 * AWS SES Service - Send emails via Amazon SES
 */

export function isAWSSESConfigured(): boolean {
  return !!(
    process.env.AWS_REGION &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );
}

export async function sendReceiptViaAWSSES(
  payload: AWSSESPayload
): Promise<string> {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "AWS SES not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY in .env"
    );
  }

  try {
    const client = new SESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const command = new SendEmailCommand({
      Source: payload.from,
      Destination: {
        ToAddresses: [payload.to],
      },
      Message: {
        Subject: {
          Data: payload.subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: payload.htmlContent,
            Charset: "UTF-8",
          },
        },
      },
    });

    const result = await client.send(command);

    console.log("✓ Email sent successfully via AWS SES");
    console.log(`   To: ${payload.to}`);
    console.log(`   From: ${payload.from}`);
    console.log(`   Message ID: ${result.MessageId}`);

    return result.MessageId || "";
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("✗ AWS SES send failed:", msg);
    throw new Error(`AWS SES delivery failed: ${msg}`);
  }
}

export async function sendReceiptViaAWSSESRaw(
  payload: AWSSESPayload & { attachments?: { filename: string; content: Buffer; cid?: string }[] }
): Promise<string> {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "AWS SES not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY in .env"
    );
  }

  try {
    const client = new SESClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    // Build raw MIME message (multipart/related) with inline attachments
    const boundaryOuter = "----=_scarfpos_outer_" + Date.now();
    const boundaryInner = "----=_scarfpos_inner_" + Date.now();

    let parts: string[] = [];
    parts.push(`From: ${payload.from}`);
    parts.push(`To: ${payload.to}`);
    parts.push(`Subject: ${payload.subject}`);
    parts.push("MIME-Version: 1.0");
    parts.push(`Content-Type: multipart/related; boundary="${boundaryOuter}"; type="text/html"`);
    parts.push("");

    parts.push(`--${boundaryOuter}`);
    parts.push(`Content-Type: multipart/alternative; boundary="${boundaryInner}"`);
    parts.push("");
    parts.push(`--${boundaryInner}`);
    parts.push("Content-Type: text/html; charset=\"UTF-8\"");
    parts.push("");
    parts.push(payload.htmlContent);
    parts.push("");
    parts.push(`--${boundaryInner}--`);

    if (payload.attachments && payload.attachments.length > 0) {
      for (const att of payload.attachments) {
        parts.push(`--${boundaryOuter}`);
        parts.push(`Content-Type: image/png; name="${att.filename}"`);
        parts.push("Content-Transfer-Encoding: base64");
        if (att.cid) parts.push(`Content-ID: <${att.cid}>`);
        parts.push(`Content-Disposition: inline; filename="${att.filename}"`);
        parts.push("");
        parts.push(att.content.toString("base64"));
        parts.push("");
      }
    }

    parts.push(`--${boundaryOuter}--`);

    const raw = parts.join("\r\n");

    const command = new SendRawEmailCommand({
      RawMessage: { Data: Buffer.from(raw) },
      Source: payload.from,
      Destinations: [payload.to],
    });

    const result = await client.send(command);

    console.log("✓ Email sent successfully via AWS SES (Raw)");
    console.log(`   To: ${payload.to}`);
    return result.MessageId || "";
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("✗ AWS SES (Raw) send failed:", msg);
    throw new Error(`AWS SES (Raw) delivery failed: ${msg}`);
  }
}
