import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";

import { colors, fonts, radius, shadow, spacing } from "@/constants/Theme";
import GlassBackground from "@/components/GlassBackground";
import { useAuth } from "@/context/AuthContext";
import { verifyCoursePayment } from "@/services/payments";

export default function RazorpayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { session } = useAuth();
  const token = session?.access_token || "";

  const orderId = typeof params.orderId === "string" ? params.orderId : "";
  const keyId = typeof params.keyId === "string" ? params.keyId : "";
  const amount = typeof params.amount === "string" ? params.amount : "";
  const currency = typeof params.currency === "string" ? params.currency : "INR";
  const courseSlug = typeof params.courseSlug === "string" ? params.courseSlug : "";
  const courseName = typeof params.courseName === "string" ? params.courseName : "Gradus course";

  const [verifying, setVerifying] = useState(false);

  const paymentHtml = useMemo(() => {
    return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Gradus Payment</title>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <style>
          html, body { margin: 0; padding: 0; height: 100%; }
          body { font-family: -apple-system, Arial, sans-serif; display: flex; align-items: center; justify-content: center; background: #f5f7f9; }
          .panel { padding: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="panel">
          <h3>Launching payment...</h3>
        </div>
        <script>
          const options = {
            key: ${JSON.stringify(keyId)},
            amount: ${JSON.stringify(amount)},
            currency: ${JSON.stringify(currency)},
            name: "Gradus",
            description: ${JSON.stringify(courseName)},
            order_id: ${JSON.stringify(orderId)},
            handler: function (response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: "success",
                payload: response
              }));
            },
            modal: {
              ondismiss: function () {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: "dismiss"
                }));
              }
            }
          };
          const rzp = new Razorpay(options);
          rzp.on('payment.failed', function (response) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: "error",
              payload: response.error || {}
            }));
          });
          rzp.open();
        </script>
      </body>
    </html>`;
  }, [amount, courseName, currency, keyId, orderId]);

  const handleMessage = async (event: any) => {
    if (!token) {
      Alert.alert("Sign in required", "Please sign in again to verify payment.");
      router.replace("/auth/phone");
      return;
    }
    let data: any = null;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch (error) {
      console.warn("[payment] Unable to parse message", error);
      return;
    }

    if (data.type === "dismiss") {
      Alert.alert("Payment cancelled", "You can retry enrollment anytime.");
      router.back();
      return;
    }

    if (data.type === "error") {
      Alert.alert("Payment failed", data.payload?.description || "Try again.");
      router.back();
      return;
    }

    if (data.type === "success") {
      const payload = data.payload || {};
      const order = payload.razorpay_order_id;
      const payment = payload.razorpay_payment_id;
      const signature = payload.razorpay_signature;
      if (!order || !payment || !signature) {
        Alert.alert("Verification failed", "Missing payment details.");
        return;
      }
      try {
        setVerifying(true);
        await verifyCoursePayment(token, {
          razorpay_order_id: order,
          razorpay_payment_id: payment,
          razorpay_signature: signature,
        });
        Alert.alert("Enrollment confirmed", "Payment verified successfully.");
        if (courseSlug) {
          router.replace({
            pathname: "/course/[slug]",
            params: { slug: courseSlug },
          });
        } else {
          router.replace("/my-courses");
        }
      } catch (error: any) {
        Alert.alert("Verification failed", error?.message || "Contact support.");
      } finally {
        setVerifying(false);
      }
    }
  };

  if (!orderId || !keyId) {
    return (
      <GlassBackground>
        <View style={styles.loading}>
          <Text style={styles.error}>Payment session expired.</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryText}>Go back</Text>
          </Pressable>
        </View>
      </GlassBackground>
    );
  }

  if (Platform.OS === "web") {
    return (
      <GlassBackground>
        <View style={styles.loading}>
          <Text style={styles.error}>
            Complete this payment on a mobile device.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryText}>Go back</Text>
          </Pressable>
        </View>
      </GlassBackground>
    );
  }

  return (
    <GlassBackground>
      <View style={styles.container}>
        <WebView
          originWhitelist={["*"]}
          source={{ html: paymentHtml }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}
        />
        {verifying ? (
          <View style={styles.verifying}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.verifyingText}>Verifying payment...</Text>
          </View>
        ) : null}
      </View>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  error: {
    fontSize: 15,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    fontFamily: fonts.bodySemi,
  },
  verifying: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    ...shadow.card,
  },
  verifyingText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
    fontFamily: fonts.bodySemi,
  },
});
