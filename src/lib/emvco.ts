function tlv(tag: string, value: string) {
  const len = String(value.length).padStart(2, "0");
  return `${tag}${len}${value}`;
}

function crc16ccitt(buf: Buffer): number {
  let crc = 0xffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= (buf[i] << 8);
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc & 0xffff;
}

function buildMerchantAccountInfo({
  gui,
  bankBin,
  accountNumber,
  service,
}: {
  gui: string;
  bankBin: string;
  accountNumber: string;
  service: string;
}) {
  // VietQR/Napas standard for bank transfers uses tag 38.
  const f00 = tlv("00", gui);
  const f01 = tlv("01", tlv("00", bankBin) + tlv("01", accountNumber));
  const f02 = tlv("02", service);
  return tlv("38", `${f00}${f01}${f02}`);
}

export function buildEmvCoPayload({
  gui = "A000000727",
  bankBin,
  accountNumber,
  amount, // string like "100000" (no decimals) or "100000.00"
  referenceLabel, // sale id or note
}: {
  gui?: string;
  bankBin: string;
  accountNumber: string;
  amount?: string;
  referenceLabel?: string;
}) {
  // 00 Payload Format Indicator
  const pfi = tlv("00", "01");
  // 01 Point of Initiation Method: 11 = static, 12 = dynamic (includes amount)
  const pim = tlv("01", amount ? "12" : "11");

  const mai = buildMerchantAccountInfo({
    gui,
    bankBin,
    accountNumber,
    service: "QRIBFTTA",
  });

  // 52: Merchant Category Code (0000 = unspecified)
  const mcc = tlv("52", "0000");
  // 53: Currency (704 = VND)
  const currency = tlv("53", "704");

  const amt = amount ? tlv("54", amount) : "";

  const country = tlv("58", "VN");

  // Additional data field template (62) — subfield 08 = purpose/note
  const addData = referenceLabel ? tlv("08", referenceLabel) : "";
  const addDataTemplate = addData ? tlv("62", addData) : "";

  const payloadNoCrc = `${pfi}${pim}${mai}${mcc}${currency}${amt}${country}${addDataTemplate}`;

  // CRC (tag 63) must be computed over payload + '6304'
  const payloadForCrc = `${payloadNoCrc}6304`;
  // Use CRC-16/CCITT-FALSE (poly 0x1021 init 0xFFFF)
  const crc = crc16ccitt(Buffer.from(payloadForCrc, "utf8"));
  const crcHex = crc.toString(16).toUpperCase().padStart(4, "0");
  const crcField = tlv("63", crcHex);

  return `${payloadNoCrc}${crcField}`;
}
