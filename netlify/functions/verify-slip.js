const { createHash } = require('crypto');
// นำเข้าฟังก์ชันจากไลบรารี promptparse
const { parse } = require('promptparse');
const { slipVerify } = require('promptparse/validate');

// ฟังก์ชันทำความสะอาดเลขบัญชี (ตัด 0066, 66 และ 0 นำหน้าออก)
function normalizeAccount(value) {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.startsWith('0066')) digits = digits.slice(4);
    else if (digits.startsWith('66')) digits = digits.slice(2);
    if (digits.startsWith('0')) digits = digits.slice(1);
    return digits;
}

// ตรวจสอบว่าตรงกับกสิกร (06389886566) หรือพร้อมเพย์ (0822024218) หรือไม่
function isValidPromptPayAccount(account) {
    const normalized = normalizeAccount(account);
    const validAccounts = ['6389886566', '822024218'];
    return validAccounts.some(acc => normalized.endsWith(acc));
}

// ดึงเลขบัญชีที่ซ้อนอยู่ข้างใน (เช่น ใน Tag 29 ของ PromptPay)
function extractAccountFromTag(tagValue) {
    if (!tagValue) return null;
    try {
        // ใช้ promptparse ถอดรหัส Tag ย่อยที่ซ้อนอยู่
        const nested = parse(tagValue);
        // ค้นหาใน Sub-Tag มาตรฐานของ AnyID (01=เบอร์โทร, 02=บัตรปชช, 03=E-Wallet)
        for (let i = 1; i <= 9; i++) {
            const subId = '0' + i;
            const value = nested.getTagValue(subId);
            if (value) {
                const digits = String(value).replace(/\D/g, '');
                if (digits.length >= 9 && digits.length <= 15) return digits;
            }
        }
    } catch (e) {
        // กรณีไม่ใช่โครงสร้าง TLV ซ้อน ให้ข้ามไป
    }
    return null;
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers };

    try {
        const body = JSON.parse(event.body || '{}');
        const payload = body.payload;
        if (!payload || typeof payload !== 'string') {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Missing QR payload' }) };
        }


        const slipData = slipVerify(payload);

        if (slipData) {
            console.log('✅ Detected Valid e-Slip QR:', slipData);

            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    isSlip: true,
                    message: 'สแกนสำเร็จ: เป็นสลิปโอนเงิน แต่ระบบยังไม่ได้เชื่อมต่อ API สำหรับตรวจสอบยอด',
                    data: {
                        sendingBank: slipData.sendingBank,
                        transRef: slipData.transRef
                    }
                })
            };
        }

        let ppqr;
        try {
            ppqr = parse(payload);
        } catch (e) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'รูปแบบ QR ไม่ถูกต้อง (Invalid Format)' }) };
        }

        if (!ppqr || !ppqr.getTagValue('00')) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ไม่พบข้อมูล Payment QR ที่ถูกต้อง' }) };
        }

        const amountStr = ppqr.getTagValue('54');
        const amount = Number(amountStr) || 0;
        const merchantName = ppqr.getTagValue('59') || '';

        let account = '';
        const accountFields = ['26', '27', '28', '29', '30', '31', '32', '33', '34', '35'];
        for (const field of accountFields) {
            const tagValue = ppqr.getTagValue(field);
            if (tagValue) {
                const found = extractAccountFromTag(tagValue);
                if (found) {
                    account = found;
                    break;
                }
            }
        }

        let transRef = '';
        const tag62 = ppqr.getTagValue('62');
        if (tag62) {
            transRef = parse(tag62).getTagValue('07') || '';
        }

        const payloadHash = createHash('sha256').update(payload).digest('hex');

        const validAccount = isValidPromptPayAccount(account);
        const validAmount = amount > 0;

        const responseData = {
            success: validAccount && validAmount,
            data: {
                amountInSlip: amount,
                receiverName: merchantName,
                receiverAccount: account,
                transRef: transRef || payloadHash,
                payloadHash: payloadHash,
                rawSlip: {
                    receiver: {
                        account: { bank: { account: account || '06389886566 / 0822024218' } },
                        name: { th: merchantName || 'ณัฐวุฒิ ภักดีอำนาจ' }
                    },
                    transRef: transRef || payloadHash,
                    amount: { amount: amount }
                }
            }
        };

        if (!validAccount) {
            responseData.success = false;
            responseData.message = 'QR ไม่ตรงบัญชีที่กำหนด (กสิกร หรือ พร้อมเพย์ของเรา)';
            responseData.data.details = { foundAccount: account, expectedAccounts: ['06389886566', '0822024218'] };
        }

        if (!validAmount) {
            responseData.success = false;
            responseData.message = 'ยอดเงินใน QR ไม่ถูกต้อง หรือไม่มีการระบุยอดเงิน';
        }

        return { statusCode: 200, headers, body: JSON.stringify(responseData) };

    } catch (error) {
        console.error('Verification error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Server error', error: error.message }) };
    }
};