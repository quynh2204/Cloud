import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

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
