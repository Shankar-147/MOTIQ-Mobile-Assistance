import React, { useState } from "react";
import { Center, Heading, Text, VStack } from "@gluestack-ui/themed";
import { Smartphone } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/types";
import { authApi } from "../../api/authApi";
import { Button, Input } from "../../components/ui";

type Props = NativeStackScreenProps<AuthStackParamList, "PhoneEntry">;

export function PhoneEntryScreen({ route, navigation }: Props) {
  const { intendedRole } = route.params;
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await authApi.requestOtp(phone);
      navigation.navigate("OtpVerify", { phone, intendedRole });
    } catch {
      setError("Couldn't send a verification code. Check the number and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <VStack flex={1} bg="$backgroundLight0" p="$6" space="md">
      <Center py="$6">
        <Center w={72} h={72} borderRadius="$full" bg="$primary50" mb="$4">
          <Smartphone size={32} color="#4F46E5" />
        </Center>
        <Heading size="xl">What's your number?</Heading>
        <Text color="$textLight500" textAlign="center" mt="$1">
          We'll text you a one-time code to sign in.
        </Text>
      </Center>

      <Input label="Phone number" value={phone} onChangeText={setPhone} placeholder="+91XXXXXXXXXX" />
      {error ? (
        <Text color="$error600" size="sm">
          {error}
        </Text>
      ) : null}
      <Button
        label={submitting ? "Sending…" : "Send code"}
        accessibilityLabel="Send verification code"
        disabled={submitting || phone.length < 8}
        loading={submitting}
        onPress={handleSubmit}
      />
    </VStack>
  );
}
