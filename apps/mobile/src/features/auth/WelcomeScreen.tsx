import React from "react";
import { Box, Center, Heading, Text, VStack } from "@gluestack-ui/themed";
import { LifeBuoy, Wrench } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { UserRole } from "@motiq/types";
import { AuthStackParamList } from "../../navigation/types";
import { Button } from "../../components/ui";

type Props = NativeStackScreenProps<AuthStackParamList, "Welcome">;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <Box flex={1} bg="$backgroundLight0">
      <Center flex={1} bg="$primary600" borderBottomLeftRadius="$3xl" borderBottomRightRadius="$3xl">
        <VStack alignItems="center" space="md">
          <Center w={88} h={88} borderRadius="$full" bg="rgba(255,255,255,0.16)">
            <LifeBuoy size={44} color="#FFFFFF" strokeWidth={1.75} />
          </Center>
          <Heading size="4xl" color="$white" fontWeight="$extrabold">
            MOTIQ
          </Heading>
          <Text color="rgba(255,255,255,0.85)" size="md" textAlign="center" px="$8">
            Roadside assistance, on demand.
          </Text>
        </VStack>
      </Center>

      <VStack flex={1} px="$6" pt="$8" pb="$6" space="md" justifyContent="flex-end">
        <Button
          label="I need assistance"
          accessibilityLabel="Continue as a customer"
          onPress={() => navigation.navigate("PhoneEntry", { intendedRole: UserRole.CUSTOMER })}
        />
        <Button
          label="I provide roadside assistance"
          variant="outline"
          icon={Wrench}
          accessibilityLabel="Continue as a provider"
          onPress={() => navigation.navigate("PhoneEntry", { intendedRole: UserRole.PROVIDER })}
        />
      </VStack>
    </Box>
  );
}
