import React from "react";
import { Center, Spinner } from "@gluestack-ui/themed";

/** The project's one full-screen loading state — replaces the repeated
 * `<View style={{flex:1, alignItems:"center", justifyContent:"center"}}>
 * <ActivityIndicator /></View>` pattern every screen used to hand-roll. */
export function LoadingScreen() {
  return (
    <Center flex={1} bg="$backgroundLight50">
      <Spinner size="large" color="$primary600" />
    </Center>
  );
}
