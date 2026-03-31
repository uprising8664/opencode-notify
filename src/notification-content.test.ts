import { describe, it, expect } from "bun:test"
import {
	extractMessageText,
	collapseWhitespace,
	getLastNonEmptyLine,
	findLastMessage,
	buildNotificationContent,
} from "./notification-content"

describe("extractMessageText", () => {
	describe("#given a message with a text part", () => {
		it("#when extracting, #then returns the text", () => {
			const message = { parts: [{ type: "text", text: "hello" }] }
			expect(extractMessageText(message)).toBe("hello")
		})
	})

	describe("#given a message with a non-text part", () => {
		it("#when extracting, #then ignores non-text parts", () => {
			const message = {
				parts: [
					{ type: "tool_use", text: "ignored" },
					{ type: "text", text: "kept" },
				],
			}
			expect(extractMessageText(message)).toBe("kept")
		})
	})

	describe("#given undefined input", () => {
		it("#when extracting, #then returns empty string", () => {
			expect(extractMessageText(undefined)).toBe("")
		})
	})

	describe("#given a message with multiple text parts", () => {
		it("#when extracting, #then joins with newline", () => {
			const message = {
				parts: [
					{ type: "text", text: "first" },
					{ type: "text", text: "second" },
				],
			}
			expect(extractMessageText(message)).toBe("first\nsecond")
		})
	})

	describe("#given a message with whitespace in text parts", () => {
		it("#when extracting, #then trims each part", () => {
			const message = { parts: [{ type: "text", text: "  trimmed  " }] }
			expect(extractMessageText(message)).toBe("trimmed")
		})
	})
})

describe("collapseWhitespace", () => {
	describe("#given multi-line text", () => {
		it("#when collapsing, #then produces a single line", () => {
			expect(collapseWhitespace("line one\nline two\nline three")).toBe("line one line two line three")
		})
	})

	describe("#given empty string", () => {
		it("#when collapsing, #then returns empty string", () => {
			expect(collapseWhitespace("")).toBe("")
		})
	})

	describe("#given lines with leading/trailing whitespace", () => {
		it("#when collapsing, #then trims each line before joining", () => {
			expect(collapseWhitespace("  hello  \n  world  ")).toBe("hello world")
		})
	})
})

describe("getLastNonEmptyLine", () => {
	describe("#given multi-line text", () => {
		it("#when getting last non-empty line, #then returns the last line", () => {
			expect(getLastNonEmptyLine("first line\nsecond line\nthird line")).toBe("third line")
		})
	})

	describe("#given empty string", () => {
		it("#when getting last non-empty line, #then returns empty string", () => {
			expect(getLastNonEmptyLine("")).toBe("")
		})
	})

	describe("#given text with trailing empty lines", () => {
		it("#when getting last non-empty line, #then skips trailing empty lines", () => {
			expect(getLastNonEmptyLine("actual last\n\n\n")).toBe("actual last")
		})
	})
})

describe("findLastMessage", () => {
	describe("#given messages with user and assistant roles", () => {
		it("#when finding last user message, #then returns the last user message", () => {
			const messages = [
				{ info: { role: "user" }, parts: [{ type: "text", text: "first user" }] },
				{ info: { role: "assistant" }, parts: [{ type: "text", text: "first assistant" }] },
				{ info: { role: "user" }, parts: [{ type: "text", text: "second user" }] },
			]
			const result = findLastMessage(messages, "user")
			expect(result?.parts?.[0]?.text).toBe("second user")
		})
	})

	describe("#given messages ending with an assistant", () => {
		it("#when finding last assistant message, #then returns the last assistant", () => {
			const messages = [
				{ info: { role: "user" }, parts: [{ type: "text", text: "question" }] },
				{ info: { role: "assistant" }, parts: [{ type: "text", text: "answer" }] },
			]
			const result = findLastMessage(messages, "assistant")
			expect(result?.parts?.[0]?.text).toBe("answer")
		})
	})

	describe("#given the last assistant message has an error", () => {
		it("#when finding last assistant, #then skips the error message and returns the earlier one", () => {
			const messages = [
				{ info: { role: "assistant" }, parts: [{ type: "text", text: "good response" }] },
				{ info: { role: "assistant", error: "something broke" }, parts: [{ type: "text", text: "error msg" }] },
			]
			const result = findLastMessage(messages, "assistant")
			expect(result?.parts?.[0]?.text).toBe("good response")
		})
	})

	describe("#given no messages match the role", () => {
		it("#when finding a message, #then returns undefined", () => {
			const messages = [
				{ info: { role: "user" }, parts: [{ type: "text", text: "only user" }] },
			]
			expect(findLastMessage(messages, "assistant")).toBeUndefined()
		})
	})

	describe("#given a message with empty text content", () => {
		it("#when finding last message, #then skips messages with empty text", () => {
			const messages = [
				{ info: { role: "user" }, parts: [{ type: "text", text: "non-empty" }] },
				{ info: { role: "user" }, parts: [{ type: "tool_use", text: "ignored" }] },
			]
			const result = findLastMessage(messages, "user")
			expect(result?.parts?.[0]?.text).toBe("non-empty")
		})
	})
})

describe("buildNotificationContent", () => {
	describe("#given full rich session data", () => {
		it("#when building notification, #then returns title with session name and message with user/assistant lines", () => {
			const result = buildNotificationContent({
				sessionTitle: "Bugfix session",
				sessionID: "ses_123",
				messages: [
					{ info: { role: "user" }, parts: [{ type: "text", text: "Investigate\nthis flaky test" }] },
					{ info: { role: "assistant" }, parts: [{ type: "text", text: "First line\nFinal answer line" }] },
				],
				baseTitle: "OpenCode",
				baseMessage: "Agent is ready for input",
			})
			expect(result).toEqual({
				title: "OpenCode · Bugfix session",
				message: "Agent is ready for input\nUser: Investigate this flaky test\nAssistant: Final answer line",
			})
		})
	})

	describe("#given an empty messages array", () => {
		it("#when building notification, #then message is just baseMessage", () => {
			const result = buildNotificationContent({
				sessionTitle: "My session",
				sessionID: "ses_abc",
				messages: [],
				baseTitle: "OpenCode",
				baseMessage: "Agent is ready for input",
			})
			expect(result).toEqual({
				title: "OpenCode · My session",
				message: "Agent is ready for input",
			})
		})
	})

	describe("#given no session title", () => {
		it("#when building notification, #then uses sessionID in title", () => {
			const result = buildNotificationContent({
				sessionTitle: undefined,
				sessionID: "ses_fallback",
				messages: [],
				baseTitle: "OpenCode",
				baseMessage: "Agent is ready for input",
			})
			expect(result.title).toBe("OpenCode · ses_fallback")
		})
	})

	describe("#given a whitespace-only session title", () => {
		it("#when building notification, #then uses sessionID in title", () => {
			const result = buildNotificationContent({
				sessionTitle: "   ",
				sessionID: "ses_fallback",
				messages: [],
				baseTitle: "OpenCode",
				baseMessage: "Agent is ready for input",
			})
			expect(result.title).toBe("OpenCode · ses_fallback")
		})
	})

	describe("#given messages with user but no assistant", () => {
		it("#when building notification, #then shows only User line", () => {
			const result = buildNotificationContent({
				sessionTitle: "Session",
				sessionID: "ses_001",
				messages: [
					{ info: { role: "user" }, parts: [{ type: "text", text: "just a question" }] },
				],
				baseTitle: "OpenCode",
				baseMessage: "Agent is ready for input",
			})
			expect(result.message).toBe("Agent is ready for input\nUser: just a question")
		})
	})

	describe("#given messages with assistant but no user", () => {
		it("#when building notification, #then shows only Assistant line", () => {
			const result = buildNotificationContent({
				sessionTitle: "Session",
				sessionID: "ses_002",
				messages: [
					{ info: { role: "assistant" }, parts: [{ type: "text", text: "line one\nfinal line" }] },
				],
				baseTitle: "OpenCode",
				baseMessage: "Agent is ready for input",
			})
			expect(result.message).toBe("Agent is ready for input\nAssistant: final line")
		})
	})
})
