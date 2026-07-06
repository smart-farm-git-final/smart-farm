const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const generatePayload = require('promptpay-qr');
const Stripe = require('stripe');

// เริ่มต้น Firebase Admin
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? Stripe(stripeSecretKey) : null;
const stripePriceId = process.env.STRIPE_PRICE_ID_MONTHLY_699;
const stripeSuccessUrl = process.env.STRIPE_SUCCESS_URL || 'https://smart-farm-c69be.web.app/subscribe?session_id={CHECKOUT_SESSION_ID}';
const stripeCancelUrl = process.env.STRIPE_CANCEL_URL || 'https://smart-farm-c69be.web.app/subscribe?cancelled=true';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// 🚨 สำคัญมาก: ต้องตรงกับหน้าบ้าน (สิงคโปร์)
setGlobalOptions({ region: "asia-southeast1" });

exports.getscbqr = onCall({ cors: true }, async (request) => {
    const { amount } = request.data;

    // � ดึงเบอร์โทร PromptPay จาก environment variables
    const mobileNumber = process.env.PROMPTPAY_MOBILE || process.env.VITE_PROMPTPAY_MOBILE;

    if (!mobileNumber) {
        throw new Error('ไม่พบการตั้งค่า PromptPay mobile number');
    }

    try {
        console.log(`Generating PromptPay QR for amount: ${amount}`);

        // เจนค่า Payload (ข้อความดิบ) สำหรับ PromptPay
        const payload = generatePayload(mobileNumber, { amount: Number(amount) });

        // ส่งกลับไปในชื่อเดิม หน้าบ้านจะได้ไม่ต้องแก้เยอะ
        return { qrRawData: payload };

    } catch (error) {
        console.error('PromptPay Error:', error);
        return { error: "เจน QR ไม่สำเร็จครับบอส", details: error.message };
    }
});

exports.createStripeCheckoutSession = onCall({ cors: true }, async (request) => {
    const data = request.data || {};
    const { userId, email } = data;

    if (!stripe) {
        throw new Error('Stripe is not configured on the server');
    }
    if (!stripePriceId) {
        throw new Error('STRIPE_PRICE_ID_MONTHLY_699 is not configured');
    }
    if (!userId || !email) {
        throw new Error('Missing userId or email for subscription checkout');
    }

    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{ price: stripePriceId, quantity: 1 }],
            customer_email: email,
            client_reference_id: userId,
            subscription_data: {
                metadata: {
                    userId,
                    plan: 'monthly_699',
                },
            },
            success_url: stripeSuccessUrl,
            cancel_url: stripeCancelUrl,
        });

        const checkoutRef = admin.firestore().collection('stripeCheckoutSessions').doc(session.id);
        await checkoutRef.set({
            userId,
            email,
            plan: 'monthly_699',
            priceId: stripePriceId,
            status: 'created',
            sessionId: session.id,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { sessionId: session.id };
    } catch (error) {
        console.error('Stripe checkout session error:', error);
        throw new HttpsError('internal', 'ไม่สามารถสร้างการชำระเงินได้ โปรดลองใหม่อีกครั้ง', {
            code: error.code || 'stripe_checkout_error',
            message: error.message,
        });
    }
});

exports.stripeWebhook = onRequest({ cors: true }, async (req, res) => {
    if (!stripe || !stripeWebhookSecret) {
        return res.status(500).send('Stripe webhook not configured');
    }

    const signature = req.headers['stripe-signature'];
    if (!signature) {
        return res.status(400).send('Missing Stripe signature');
    }

    let event;
    let rawBody = req.rawBody;
    if (!rawBody) {
        rawBody = Buffer.from(JSON.stringify(req.body), 'utf8');
    }
    try {
        event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const db = admin.firestore();
    const eventObject = event.data.object;

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = eventObject;
                const subscriptionId = session.subscription;
                const userId = session.client_reference_id || session.metadata?.userId;

                await db.collection('stripeCheckoutSessions').doc(session.id).set({
                    status: 'completed',
                    subscriptionId,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });

                if (subscriptionId) {
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                    await db.collection('subscriptions').doc(subscription.id).set({
                        userId,
                        email: session.customer_email,
                        customerId: subscription.customer,
                        subscriptionId: subscription.id,
                        plan: 'monthly_699',
                        priceId: stripePriceId,
                        status: subscription.status,
                        currentPeriodStart: subscription.current_period_start,
                        currentPeriodEnd: subscription.current_period_end,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });

                    if (userId) {
                        await db.collection('users').doc(userId).set({
                            subscription: {
                                status: subscription.status,
                                plan: 'monthly_699',
                                startedAt: admin.firestore.FieldValue.serverTimestamp(),
                                currentPeriodEnd: subscription.current_period_end,
                            }
                        }, { merge: true });
                    }
                }
                break;
            }
            case 'invoice.payment_succeeded': {
                const invoice = eventObject;
                const subscriptionId = invoice.subscription;
                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                await db.collection('subscriptions').doc(subscriptionId).set({
                    status: subscription.status,
                    currentPeriodStart: subscription.current_period_start,
                    currentPeriodEnd: subscription.current_period_end,
                    latestInvoice: invoice.id,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
                break;
            }
            case 'customer.subscription.deleted':
            case 'customer.subscription.updated': {
                const subscription = eventObject;
                await db.collection('subscriptions').doc(subscription.id).set({
                    status: subscription.status,
                    currentPeriodStart: subscription.current_period_start,
                    currentPeriodEnd: subscription.current_period_end,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
                if (subscription.metadata?.userId) {
                    await db.collection('users').doc(subscription.metadata.userId).set({
                        subscription: {
                            status: subscription.status,
                            currentPeriodEnd: subscription.current_period_end,
                        }
                    }, { merge: true });
                }
                break;
            }
            default:
                break;
        }

        res.json({ received: true });
    } catch (err) {
        console.error('Stripe webhook processing failed:', err);
        res.status(500).send('Webhook processing error');
    }
});