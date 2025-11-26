import * as readline from "node:readline";
import { stdin, stdout } from "node:process";

/**
 * Ask a question and get user input
 */
export function question(query: string): Promise<string> {
	const rl = readline.createInterface({ input: stdin, output: stdout });

	return new Promise((resolve) => {
		rl.question(query, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
}

/**
 * Ask a yes/no question
 */
export async function confirm(
	query: string,
	defaultValue = false,
): Promise<boolean> {
	const defaultStr = defaultValue ? "Y/n" : "y/N";
	const answer = await question(`${query} (${defaultStr}): `);

	if (answer === "") {
		return defaultValue;
	}

	return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}

/**
 * Select from a list of options
 */
export async function select<T extends string>(
	query: string,
	options: { value: T; label: string; description?: string }[],
	defaultValue?: T,
): Promise<T> {
	console.log(`\n${query}`);
	console.log("");

	for (let i = 0; i < options.length; i++) {
		const option = options[i];
		if (!option) continue;

		const isDefault = defaultValue === option.value;
		const prefix = isDefault ? ">" : " ";
		const suffix = isDefault ? " (default)" : "";
		console.log(`${prefix} ${i + 1}. ${option.label}${suffix}`);
		if (option.description) {
			console.log(`     ${option.description}`);
		}
	}

	console.log("");

	const answer = await question("Select option (1-" + options.length + "): ");

	if (answer === "" && defaultValue) {
		return defaultValue;
	}

	const index = Number.parseInt(answer, 10) - 1;

	if (Number.isNaN(index) || index < 0 || index >= options.length) {
		console.log("❌ Invalid selection. Please try again.");
		return select(query, options, defaultValue);
	}

	const option = options[index];
	if (!option) {
		console.log("❌ Invalid selection. Please try again.");
		return select(query, options, defaultValue);
	}

	return option.value;
}

/**
 * Ask for text input with validation
 */
export async function input(
	query: string,
	options: {
		defaultValue?: string;
		placeholder?: string;
		validate?: (value: string) => boolean | string;
	} = {},
): Promise<string> {
	const { defaultValue, placeholder, validate } = options;

	let prompt = query;
	if (defaultValue) {
		prompt += ` (default: ${defaultValue})`;
	} else if (placeholder) {
		prompt += ` (e.g., ${placeholder})`;
	}
	prompt += ": ";

	const answer = await question(prompt);

	// Use default if empty
	if (answer === "" && defaultValue) {
		return defaultValue;
	}

	// Validate
	if (validate) {
		const result = validate(answer);
		if (result !== true) {
			const errorMsg = typeof result === "string" ? result : "Invalid input";
			console.log(`❌ ${errorMsg}`);
			return input(query, options);
		}
	}

	return answer;
}
