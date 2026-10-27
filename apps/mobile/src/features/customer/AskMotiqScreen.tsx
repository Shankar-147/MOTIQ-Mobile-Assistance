import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowUp, Check, Sparkles, X } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CustomerStackParamList } from "../../navigation/types";
import { AgentPendingAction, AgentReply, AgentUiAction, aiApi } from "../../api/aiApi";
import { Button } from "../../components/ui";
import { COLORS, FONTS } from "../../theme/colors";

type Props = NativeStackScreenProps<CustomerStackParamList, "AskMotiq">;

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  emergency?: boolean;
  basicMode?: boolean;
  uiActions?: AgentUiAction[];
}

interface PendingState {
  action: AgentPendingAction;
  state: "waiting" | "working" | "done";
  result?: string;
}

const SUGGESTIONS = [
  "How is my car's health?",
  "Is anything due for service?",
  "My tyre is flat",
  "Show my recent requests",
  "Log an oil change",
];

const WELCOME =
  "Hi! I'm IQ, your MOTIQ assistant. I can check your vehicle's service status, explain what's due, log a service, and get you roadside help.";

let nextId = 1;
const newId = () => `m${nextId++}`;

/**
 * Ask MOTIQ — the customer's AI assistant. The server runs the agent (tools over the customer's
 * own data); this screen only shows the conversation. Any change the agent proposes arrives as a
 * card with Confirm / Cancel — nothing is saved until the customer taps Confirm.
 */
export function AskMotiqScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<PendingState[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  function scrollToEnd() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    setInput("");
    setSending(true);
    setMessages((current) => [...current, { id: newId(), role: "user", text: message }]);
    scrollToEnd();
    try {
      const response = await aiApi.sendAgentMessage({ conversationId, message });
      const reply: AgentReply = response.data;
      setConversationId(reply.conversationId);
      setMessages((current) => [
        ...current,
        {
          id: newId(),
          role: "assistant",
          text: reply.reply,
          emergency: reply.emergencyDetected,
          basicMode: reply.mode === "FAQ" && !reply.emergencyDetected,
          uiActions: reply.uiActions,
        },
      ]);
      if (reply.pendingActions.length > 0) {
        setPending((current) => [...current, ...reply.pendingActions.map((action) => ({ action, state: "waiting" as const }))]);
      }
    } catch {
      setMessages((current) => [
        ...current,
        { id: newId(), role: "assistant", text: "I couldn't reach MOTIQ just now. Please check your connection and try again." },
      ]);
    } finally {
      setSending(false);
      scrollToEnd();
    }
  }

  async function decide(actionId: string, confirm: boolean) {
    setPending((current) => current.map((p) => (p.action.id === actionId ? { ...p, state: "working" } : p)));
    let result: string;
    try {
      const response = confirm ? await aiApi.confirmAgentAction(actionId) : await aiApi.cancelAgentAction(actionId);
      result = response.data.message;
    } catch {
      result = "That action expired or couldn't be completed. Please ask me again.";
    }
    setPending((current) => current.map((p) => (p.action.id === actionId ? { ...p, state: "done", result } : p)));
    scrollToEnd();
  }

  function openRequest(action: AgentUiAction) {
    navigation.navigate("CreateRequest", { issueType: action.issueType });
  }

  const empty = messages.length === 0;
  const bottomPad = keyboardHeight > 0 ? keyboardHeight + 8 : insets.bottom + 8;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
      >
        <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: COLORS.accentTint,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={17} color={COLORS.accent} />
          </View>
          <View style={{ flex: 1, backgroundColor: COLORS.surface, borderRadius: 18, borderTopLeftRadius: 4, padding: 14 }}>
            <Text style={{ fontFamily: FONTS.body, fontSize: 15, lineHeight: 22, color: COLORS.text }}>{WELCOME}</Text>
          </View>
        </View>

        {empty ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {SUGGESTIONS.map((suggestion) => (
              <Pressable
                key={suggestion}
                accessibilityRole="button"
                accessibilityLabel={`Ask: ${suggestion}`}
                onPress={() => send(suggestion)}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  backgroundColor: COLORS.surfaceRaised,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.text }}>{suggestion}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {messages.map((message) =>
          message.role === "user" ? (
            <View key={message.id} style={{ alignItems: "flex-end" }}>
              <View
                style={{
                  maxWidth: "85%",
                  backgroundColor: COLORS.accent,
                  borderRadius: 18,
                  borderBottomRightRadius: 4,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ fontFamily: FONTS.body, fontSize: 15, lineHeight: 21, color: COLORS.accentInk }}>{message.text}</Text>
              </View>
            </View>
          ) : (
            <View key={message.id} style={{ gap: 8, maxWidth: "92%" }}>
              <View
                style={{
                  backgroundColor: message.emergency ? "rgba(255, 77, 77, 0.16)" : COLORS.surface,
                  borderWidth: message.emergency ? 1 : 0,
                  borderColor: COLORS.danger,
                  borderRadius: 18,
                  borderTopLeftRadius: 4,
                  padding: 14,
                  gap: 6,
                }}
              >
                <Text style={{ fontFamily: FONTS.body, fontSize: 15, lineHeight: 22, color: COLORS.text }}>{message.text}</Text>
                {message.basicMode ? (
                  <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted }}>
                    Basic answers only — the AI assistant isn't available right now.
                  </Text>
                ) : null}
              </View>
              {message.uiActions?.map((action) => (
                <Button
                  key={action.issueType}
                  label={action.label}
                  accessibilityLabel={action.label}
                  fullWidth={false}
                  onPress={() => openRequest(action)}
                />
              ))}
            </View>
          ),
        )}

        {pending.map(({ action, state, result }) => (
          <View
            key={action.id}
            style={{
              backgroundColor: COLORS.surfaceRaised,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: state === "done" ? COLORS.border : COLORS.accent,
              padding: 14,
              gap: 12,
            }}
          >
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.accent, letterSpacing: 0.4 }}>
              {state === "done" ? "RESULT" : "PLEASE CONFIRM"}
            </Text>
            <Text style={{ fontFamily: FONTS.body, fontSize: 15, lineHeight: 22, color: COLORS.text }}>
              {state === "done" ? result : action.summary}
            </Text>
            {state !== "done" ? (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Confirm"
                    icon={Check}
                    accessibilityLabel="Confirm this change"
                    loading={state === "working"}
                    disabled={state === "working"}
                    onPress={() => decide(action.id, true)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Cancel"
                    icon={X}
                    variant="outline"
                    accessibilityLabel="Cancel this change"
                    disabled={state === "working"}
                    onPress={() => decide(action.id, false)}
                  />
                </View>
              </View>
            ) : null}
          </View>
        ))}

        {sending ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 4 }}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary }}>Thinking…</Text>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 10,
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: bottomPad,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          backgroundColor: COLORS.bg,
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask about your car…"
          placeholderTextColor={COLORS.textMuted}
          multiline
          maxLength={1000}
          accessibilityLabel="Message IQ"
          onSubmitEditing={() => send(input)}
          style={{
            flex: 1,
            maxHeight: 120,
            minHeight: 48,
            borderRadius: 24,
            backgroundColor: COLORS.surfaceRaised,
            borderWidth: 1,
            borderColor: COLORS.border,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 12,
            fontFamily: FONTS.body,
            fontSize: 15,
            color: COLORS.text,
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          disabled={sending || input.trim() === ""}
          onPress={() => send(input)}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: COLORS.accent,
            alignItems: "center",
            justifyContent: "center",
            opacity: sending || input.trim() === "" ? 0.4 : 1,
          }}
        >
          <ArrowUp size={22} color={COLORS.accentInk} />
        </Pressable>
      </View>
    </View>
  );
}
