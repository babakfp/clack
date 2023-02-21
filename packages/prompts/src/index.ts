import {
	block,
	ConfirmPrompt,
	isCancel,
	MultiSelectPrompt,
	SelectPrompt,
	State,
	TextPrompt,
} from '@clack/core';
import isUnicodeSupported from 'is-unicode-supported';
import color from 'picocolors';
import { cursor, erase } from 'sisteransi';

export { isCancel } from '@clack/core';

const unicode = isUnicodeSupported();
const s = (c: string, fallback: string) => (unicode ? c : fallback);
const S_STEP_ACTIVE = s('◆', '*');
const S_STEP_CANCEL = s('■', 'x');
const S_STEP_ERROR = s('▲', 'x');
const S_STEP_SUBMIT = s('◇', 'o');

const S_BAR_START = s('┌', 'T');
const S_BAR = s('│', '|');
const S_BAR_END = s('└', '—');

const S_RADIO_ACTIVE = s('●', '>');
const S_RADIO_INACTIVE = s('○', ' ');
const S_CHECKBOX_ACTIVE = s('◻', '[•]');
const S_CHECKBOX_SELECTED = s('◼', '[+]');
const S_CHECKBOX_INACTIVE = s('◻', '[ ]');

const S_BAR_H = s('─', '-');
const S_CORNER_TOP_RIGHT = s('╮', '+');
const S_CONNECT_LEFT = s('├', '+');
const S_CORNER_BOTTOM_RIGHT = s('╯', '+');

const symbol = (state: State) => {
	switch (state) {
		case 'initial':
		case 'active':
			return color.cyan(S_STEP_ACTIVE);
		case 'cancel':
			return color.red(S_STEP_CANCEL);
		case 'error':
			return color.yellow(S_STEP_ERROR);
		case 'submit':
			return color.green(S_STEP_SUBMIT);
	}
};

export interface TextOptions {
	message: string;
	placeholder?: string;
	defaultValue?: string;
	initialValue?: string;
	validate?: (value: string) => string | void;
}
export const text = (opts: TextOptions) => {
	return new TextPrompt({
		validate: opts.validate,
		placeholder: opts.placeholder,
		defaultValue: opts.defaultValue,
		initialValue: opts.initialValue,
		render() {
			const title = `${color.gray(S_BAR)}\n${symbol(this.state)}  ${opts.message}\n`;
			const placeholder = opts.placeholder
				? color.inverse(opts.placeholder[0]) + color.dim(opts.placeholder.slice(1))
				: color.inverse(color.hidden('_'));
			const value = !this.value ? placeholder : this.valueWithCursor;

			switch (this.state) {
				case 'error':
					return `${title.trim()}\n${color.yellow(S_BAR)}  ${value}\n${color.yellow(
						S_BAR_END
					)}  ${color.yellow(this.error)}\n`;
				case 'submit':
					return `${title}${color.gray(S_BAR)}  ${color.dim(this.value || opts.placeholder)}`;
				case 'cancel':
					return `${title}${color.gray(S_BAR)}  ${color.strikethrough(
						color.dim(this.value ?? '')
					)}${this.value?.trim() ? '\n' + color.gray(S_BAR) : ''}`;
				default:
					return `${title}${color.cyan(S_BAR)}  ${value}\n${color.cyan(S_BAR_END)}\n`;
			}
		},
	}).prompt() as Promise<string | symbol>;
};

export interface ConfirmOptions {
	message: string;
	active?: string;
	inactive?: string;
	initialValue?: boolean;
}
export const confirm = (opts: ConfirmOptions) => {
	const active = opts.active ?? 'Yes';
	const inactive = opts.inactive ?? 'No';
	return new ConfirmPrompt({
		active,
		inactive,
		initialValue: opts.initialValue ?? true,
		render() {
			const title = `${color.gray(S_BAR)}\n${symbol(this.state)}  ${opts.message}\n`;
			const value = this.value ? active : inactive;

			switch (this.state) {
				case 'submit':
					return `${title}${color.gray(S_BAR)}  ${color.dim(value)}`;
				case 'cancel':
					return `${title}${color.gray(S_BAR)}  ${color.strikethrough(
						color.dim(value)
					)}\n${color.gray(S_BAR)}`;
				default: {
					return `${title}${color.cyan(S_BAR)}  ${
						this.value
							? `${color.green(S_RADIO_ACTIVE)} ${active}`
							: `${color.dim(S_RADIO_INACTIVE)} ${color.dim(active)}`
					} ${color.dim('/')} ${
						!this.value
							? `${color.green(S_RADIO_ACTIVE)} ${inactive}`
							: `${color.dim(S_RADIO_INACTIVE)} ${color.dim(inactive)}`
					}\n${color.cyan(S_BAR_END)}\n`;
				}
			}
		},
	}).prompt() as Promise<boolean | symbol>;
};

type Primitive = Readonly<string | boolean | number>;
interface Option<Value extends Primitive> {
	value: Value;
	label?: string;
	hint?: string;
}
export interface SelectOptions<Options extends Option<Value>[], Value extends Primitive> {
	message: string;
	options: Options;
	initialValue?: Options[number]['value'];
}

export interface MultiSelectOptions<Options extends Option<Value>[], Value extends Primitive> {
	message: string;
	options: Options;
	initialValue?: Options[number]['value'][];
	required?: boolean;
	cursorAt?: Options[number]['value'];
}

export const select = <Options extends Option<Value>[], Value extends Primitive>(
	opts: SelectOptions<Options, Value>
) => {
	const opt = (
		option: Options[number],
		state: 'inactive' | 'active' | 'selected' | 'cancelled'
	) => {
		const label = option.label ?? String(option.value);
		if (state === 'active') {
			return `${color.green(S_RADIO_ACTIVE)} ${label} ${
				option.hint ? color.dim(`(${option.hint})`) : ''
			}`;
		} else if (state === 'selected') {
			return `${color.dim(label)}`;
		} else if (state === 'cancelled') {
			return `${color.strikethrough(color.dim(label))}`;
		}
		return `${color.dim(S_RADIO_INACTIVE)} ${color.dim(label)}`;
	};

	return new SelectPrompt({
		options: opts.options,
		initialValue: opts.initialValue,
		render() {
			const title = `${color.gray(S_BAR)}\n${symbol(this.state)}  ${opts.message}\n`;

			switch (this.state) {
				case 'submit':
					return `${title}${color.gray(S_BAR)}  ${opt(this.options[this.cursor], 'selected')}`;
				case 'cancel':
					return `${title}${color.gray(S_BAR)}  ${opt(
						this.options[this.cursor],
						'cancelled'
					)}\n${color.gray(S_BAR)}`;
				default: {
					return `${title}${color.cyan(S_BAR)}  ${this.options
						.map((option, i) => opt(option, i === this.cursor ? 'active' : 'inactive'))
						.join(`\n${color.cyan(S_BAR)}  `)}\n${color.cyan(S_BAR_END)}\n`;
				}
			}
		},
	}).prompt() as Promise<Options[number]['value'] | symbol>;
};

export const multiselect = <Options extends Option<Value>[], Value extends Primitive>(
	opts: MultiSelectOptions<Options, Value>
) => {
	const opt = (
		option: Options[number],
		state: 'inactive' | 'active' | 'selected' | 'active-selected' | 'submitted' | 'cancelled'
	) => {
		const label = option.label ?? String(option.value);
		if (state === 'active') {
			return `${color.cyan(S_CHECKBOX_ACTIVE)} ${label} ${
				option.hint ? color.dim(`(${option.hint})`) : ''
			}`;
		} else if (state === 'selected') {
			return `${color.green(S_CHECKBOX_SELECTED)} ${color.dim(label)}`;
		} else if (state === 'cancelled') {
			return `${color.strikethrough(color.dim(label))}`;
		} else if (state === 'active-selected') {
			return `${color.green(S_CHECKBOX_SELECTED)} ${label} ${
				option.hint ? color.dim(`(${option.hint})`) : ''
			}`;
		} else if (state === 'submitted') {
			return `${color.dim(label)}`;
		}
		return `${color.dim(S_CHECKBOX_INACTIVE)} ${color.dim(label)}`;
	};

	return new MultiSelectPrompt({
		options: opts.options,
		initialValue: opts.initialValue,
		required: opts.required ?? true,
		cursorAt: opts.cursorAt,
		render() {
			let title = `${color.gray(S_BAR)}\n${symbol(this.state)}  ${opts.message}\n`;

			switch (this.state) {
				case 'submit': {
					const selectedOptions = this.options.filter((option) =>
						this.selectedValues.some((selectedValue) => selectedValue === (option.value as any))
					);
					return `${title}${color.gray(S_BAR)}  ${selectedOptions
						.map((option, i) => opt(option, 'submitted'))
						.join(color.dim(', '))}`;
				}
				case 'cancel': {
					const selectedOptions = this.options.filter((option) =>
						this.selectedValues.some((selectedValue) => selectedValue === (option.value as any))
					);
					const label = selectedOptions
						.map((option, i) => opt(option, 'cancelled'))
						.join(color.dim(', '));
					return `${title}${color.gray(S_BAR)}  ${
						label.trim() ? `${label}\n${color.gray(S_BAR)}` : ''
					}`;
				}
				case 'error': {
					const footer = this.error
						.split('\n')
						.map((ln, i) =>
							i === 0 ? `${color.yellow(S_BAR_END)}  ${color.yellow(ln)}` : `   ${ln}`
						)
						.join('\n');
					return `${title}${color.yellow(S_BAR)}  ${this.options
						.map((option, i) => {
							const isOptionSelected = this.selectedValues.includes(option.value as any);
							const isOptionHovered = i === this.cursor;
							if (isOptionHovered && isOptionSelected) {
								return opt(option, 'active-selected');
							}
							if (isOptionSelected) {
								return opt(option, 'selected');
							}
							return opt(option, isOptionHovered ? 'active' : 'inactive');
						})
						.join(`\n${color.yellow(S_BAR)}  `)}\n${footer}\n`;
				}
				default: {
					return `${title}${color.cyan(S_BAR)}  ${this.options
						.map((option, i) => {
							const isOptionSelected = this.selectedValues.includes(option.value as any);
							const isOptionHovered = i === this.cursor;
							if (isOptionHovered && isOptionSelected) {
								return opt(option, 'active-selected');
							}
							if (isOptionSelected) {
								return opt(option, 'selected');
							}
							return opt(option, isOptionHovered ? 'active' : 'inactive');
						})
						.join(`\n${color.cyan(S_BAR)}  `)}\n${color.cyan(S_BAR_END)}\n`;
				}
			}
		},
	}).prompt() as Promise<Options[number]['value'][] | symbol>;
};

const strip = (str: string) => str.replace(ansiRegex(), '');
export const note = (message = '', title = '') => {
	const lines = `\n${message}\n`.split('\n');
	const len =
		lines.reduce((sum, ln) => {
			ln = strip(ln);
			return ln.length > sum ? ln.length : sum;
		}, 0) + 2;
	const msg = lines
		.map(
			(ln) =>
				`${color.gray(S_BAR)}  ${color.dim(ln)}${' '.repeat(len - strip(ln).length)}${color.gray(
					S_BAR
				)}`
		)
		.join('\n');
	process.stdout.write(
		`${color.gray(S_BAR)}\n${color.green(S_STEP_SUBMIT)}  ${color.reset(title)} ${color.gray(
			S_BAR_H.repeat(len - title.length - 1) + S_CORNER_TOP_RIGHT
		)}\n${msg}\n${color.gray(S_CONNECT_LEFT + S_BAR_H.repeat(len + 2) + S_CORNER_BOTTOM_RIGHT)}\n`
	);
};

export const cancel = (message = '') => {
	process.stdout.write(`${color.gray(S_BAR_END)}  ${color.red(message)}\n\n`);
};

export const intro = (title = '') => {
	process.stdout.write(`${color.gray(S_BAR_START)}  ${title}\n`);
};

export const outro = (message = '') => {
	process.stdout.write(`${color.gray(S_BAR)}\n${color.gray(S_BAR_END)}  ${message}\n\n`);
};

const frames = unicode ? ['◒', '◐', '◓', '◑'] : ['•', 'o', 'O', '0'];

export const spinner = () => {
	let unblock: () => void;
	let loop: NodeJS.Timer;
	const delay = unicode ? 80 : 120;
	return {
		start(message = '') {
			message = message.replace(/\.?\.?\.$/, '');
			unblock = block();
			process.stdout.write(`${color.gray(S_BAR)}\n${color.magenta('○')}  ${message}\n`);
			let i = 0;
			let dot = 0;
			loop = setInterval(() => {
				let frame = frames[i];
				process.stdout.write(cursor.move(-999, -1));
				process.stdout.write(
					`${color.magenta(frame)}  ${message}${
						Math.floor(dot) >= 1 ? '.'.repeat(Math.floor(dot)).slice(0, 3) : ''
					}   \n`
				);
				i = i === frames.length - 1 ? 0 : i + 1;
				dot = dot === frames.length ? 0 : dot + 0.125;
			}, delay);
		},
		stop(message = '') {
			process.stdout.write(cursor.move(-999, -2));
			process.stdout.write(erase.down(2));
			clearInterval(loop);
			process.stdout.write(`${color.gray(S_BAR)}\n${color.green(S_STEP_SUBMIT)}  ${message}\n`);
			unblock();
		},
	};
};

// Adapted from https://github.com/chalk/ansi-regex
// @see LICENSE
function ansiRegex() {
	const pattern = [
		'[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
		'(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))',
	].join('|');

	return new RegExp(pattern, 'g');
}

type GroupAwaitedReturn<T> = {
	[P in keyof T]: Awaited<T[P]>;
};

type GroupPromptFactory<T, P extends keyof T = keyof T> = (
	results: Partial<GroupAwaitedReturn<T>>
) => Promise<T[P] | symbol>;

export type Group<T> = {
	[P in keyof T]: GroupPromptFactory<T, P>;
};

/**
 * Define a group of prompts to be displayed in sequence,
 * returns results for each prompt in the group or `cancel`.
 */
export const group = async <T>(prompts: Group<T>): Promise<GroupAwaitedReturn<T> | symbol> => {
	const results = {} as GroupAwaitedReturn<T>;

	for (const [key, prompt] of Object.entries<GroupPromptFactory<T>>(prompts)) {
		const result = await prompt(results);

		if (isCancel(result)) {
			return result;
		}

		results[key as keyof T] = result;
	}

	return results;
};
