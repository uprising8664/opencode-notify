interface SessionMessagePart {
	type?: string
	text?: string
}

interface SessionMessage {
	info?: {
		role?: string
		error?: unknown
	}
	parts?: SessionMessagePart[]
}

interface NotificationContentInput {
	sessionTitle: string | undefined
	sessionID: string
	messages: SessionMessage[]
	baseTitle: string
	baseMessage: string
}

export function extractMessageText(message: SessionMessage | undefined): string {
	if (!message?.parts || !Array.isArray(message.parts)) return ""
	return message.parts
		.filter((part) => part.type === "text" && typeof part.text === "string")
		.map((part) => part.text?.trim() ?? "")
		.filter(Boolean)
		.join("\n")
}

export function collapseWhitespace(text: unknown): string {
	if (typeof text !== "string") return ""
	return text
		.split(/\r?\n/g)
		.map((line) => line.trim())
		.filter(Boolean)
		.join(" ")
}

export function getLastNonEmptyLine(text: unknown): string {
	if (typeof text !== "string") return ""
	const lines = text
		.split(/\r?\n/g)
		.map((line) => line.trim())
		.filter(Boolean)

	return lines.at(-1) ?? ""
}

export function findLastMessage(messages: SessionMessage[] | undefined, role: "user" | "assistant"): SessionMessage | undefined {
	if (!messages || messages.length === 0) return undefined
	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i]
		if (message.info?.role !== role) continue
		if (role === "assistant" && message.info?.error) continue
		if (!extractMessageText(message)) continue
		return message
	}

	return undefined
}

export function buildNotificationContent(input: NotificationContentInput): { title: string; message: string } {
	const sessionTitle =
		input.sessionTitle && input.sessionTitle.trim().length > 0
			? input.sessionTitle.trim()
			: input.sessionID

	const lastUserText = collapseWhitespace(extractMessageText(findLastMessage(input.messages, "user")))
	const lastAssistantLine = getLastNonEmptyLine(extractMessageText(findLastMessage(input.messages, "assistant")))

	const detailLines = [
		lastUserText ? `User: ${lastUserText}` : "",
		lastAssistantLine ? `Assistant: ${lastAssistantLine}` : "",
	].filter(Boolean)

	return {
		title: `${input.baseTitle} · ${sessionTitle}`,
		message:
			detailLines.length > 0
				? [input.baseMessage, ...detailLines].join("\n")
				: input.baseMessage,
	}
}
