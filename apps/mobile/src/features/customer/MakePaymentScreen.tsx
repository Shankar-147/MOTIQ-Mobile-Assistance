import React, { useCallback, useEffect, useState } from "react";
import { Center, Heading, Text, VStack } from "@gluestack-ui/themed";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { AlertTriangle } from "lucide-react-native";
import { CustomerStackParamList } from "../../navigation/types";
import { requestApi } from "../../api/requestApi";
import { Button, LoadingScreen } from "../../components/ui";
import { COLORS } from "../../theme/colors";

type Props = NativeStackScreenProps<CustomerStackParamList, "MakePayment">;

interface PaymentForCheckout {
  totalAmount: string;
  status: string;
  gatewayReference: string | null;
  razorpayKeyId: string | null;
}

type CheckoutMessage =
  | { type: "success"; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
  | { type: "cancelled" }
  | { type: "error"; description?: string };

/**
 * Ch57's mobile checkout screen — the piece that was previously entirely
 * missing: a request could be COMPLETED and settled server-side (a Razorpay
 * *order* created) with no UI ever collecting the actual charge. Rendered as
 * a WebView loading Razorpay's own hosted Checkout (checkout.js) rather than
 * a native Razorpay SDK — no new native module/rebuild needed, same
 * reasoning as LiveTrackingMap's WebView-based map.
 */
export function MakePaymentScreen({ route, navigation }: Props) {
  const { serviceRequestId } = route.params;
  const [payment, setPayment] = useState<PaymentForCheckout | null>(null);
  const [phase, setPhase] = useState<"loading" | "checkout" | "confirming" | "failed" | "done">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    requestApi
      .getPayment(serviceRequestId)
      .then((response) => {
        const data = response.data as PaymentForCheckout | null;
        if (!data || !data.gatewayReference || !data.razorpayKeyId) {
          setErrorMessage("This request has no payment ready to collect yet.");
          setPhase("failed");
          return;
        }
        setPayment(data);
        setPhase("checkout");
      })
      .catch(() => {
        setErrorMessage("Couldn't load the payment details — try again.");
        setPhase("failed");
      });
  }, [serviceRequestId]);

  const handleMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      let message: CheckoutMessage;
      try {
        message = JSON.parse(event.nativeEvent.data) as CheckoutMessage;
      } catch {
        return;
      }

      if (message.type === "cancelled") {
        navigation.goBack();
        return;
      }
      if (message.type === "error") {
        setErrorMessage(message.description ?? "Payment failed — please try again.");
        setPhase("failed");
        return;
      }

      setPhase("confirming");
      try {
        await requestApi.confirmPayment(serviceRequestId, {
          razorpayOrderId: message.razorpay_order_id,
          razorpayPaymentId: message.razorpay_payment_id,
          razorpaySignature: message.razorpay_signature,
        });
        setPhase("done");
        navigation.goBack();
      } catch {
        setErrorMessage("Payment went through, but we couldn't confirm it — contact support.");
        setPhase("failed");
      }
    },
    [navigation, serviceRequestId],
  );

  if (phase === "loading" || phase === "confirming") {
    return <LoadingScreen />;
  }

  if (phase === "failed") {
    return (
      <Center flex={1} bg="$backgroundLight0" p="$6">
        <VStack space="md" alignItems="center">
          <AlertTriangle size={40} color={COLORS.danger} />
          <Heading size="lg" textAlign="center">
            Payment couldn&apos;t be completed
          </Heading>
          <Text color="$textLight500" textAlign="center">
            {errorMessage}
          </Text>
          <Button label="Go back" variant="outline" onPress={() => navigation.goBack()} />
        </VStack>
      </Center>
    );
  }

  if (!payment) {
    return <LoadingScreen />;
  }

  return (
    <WebView
      source={{ html: buildCheckoutHtml(payment) }}
      onMessage={handleMessage}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={["*"]}
      style={{ flex: 1, backgroundColor: COLORS.bg }}
    />
  );
}

function buildCheckoutHtml(payment: PaymentForCheckout): string {
  const amountInPaise = Math.round(Number(payment.totalAmount) * 100);
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>html, body { height: 100%; margin: 0; padding: 0; background: ${COLORS.bg}; }</style>
</head>
<body>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    function post(payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }

    var options = {
      key: ${JSON.stringify(payment.razorpayKeyId)},
      amount: ${amountInPaise},
      currency: "INR",
      name: "MOTIQ",
      description: "Roadside assistance",
      order_id: ${JSON.stringify(payment.gatewayReference)},
      handler: function (response) {
        post({
          type: "success",
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: function () {
          post({ type: "cancelled" });
        },
      },
      theme: { color: ${JSON.stringify(COLORS.primary)} },
    };

    try {
      var rzp = new Razorpay(options);
      rzp.on("payment.failed", function (response) {
        post({ type: "error", description: response.error && response.error.description });
      });
      rzp.open();
    } catch (err) {
      post({ type: "error", description: String(err) });
    }
  </script>
</body>
</html>`;
}
