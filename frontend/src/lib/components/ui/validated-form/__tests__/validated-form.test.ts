import { describe, expect, test, vi } from "vitest";
import { Ref, createApp, h, ref, toRef, withDirectives } from "vue";
import ValidatedForm, { CustomSubmitEvent, ValidatedFormData } from "../validated-form.vue";
import { sleep } from "facilmap-utils";
import vValidity from "../validity";

function mockForm({ onSubmit, validationError }: {
	onSubmit?: (event: CustomSubmitEvent) => void;
	validationError?: Ref<string | undefined | Promise<string | undefined>>;
}): {
	formData: Readonly<ValidatedFormData>;
} {
	let formRef = ref<InstanceType<typeof ValidatedForm>>();

	const app = createApp({
		setup() {
			return () => h(ValidatedForm, {
				onSubmit,
				ref: formRef
			}, () => [
				withDirectives(h('input'), [[vValidity, validationError?.value]])
			]);
		}
	});
	const div = document.createElement('div');
	document.body.appendChild(div);
	app.mount(div);

	return {
		formData: formRef.value!.formData
	};
}

test("<ValidatedForm> waits for onSubmit promise", async () => {
	let resolvePromise: () => void;
	const onSubmit = vi.fn((event: CustomSubmitEvent) => {
		event.waitUntil(new Promise<void>((resolve) => {
			resolvePromise = resolve;
		}));
	});

	const { formData } = mockForm({ onSubmit });

	const form = document.querySelector('form')!;

	expect(formData.isSubmitting).toBe(false);
	expect(formData.isTouched).toBe(false);

	form.dispatchEvent(new Event('submit', { bubbles: true }))

	expect(formData.isSubmitting).toBe(true);
	expect(formData.isTouched).toBe(true);
	await sleep(0);
	expect(formData.isSubmitting).toBe(true);

	resolvePromise!();
	await sleep(0);
	expect(formData.isSubmitting).toBe(false);
});

describe("<ValidatedForm> handles validation errors", () => {
	test("submits when there are no validation errors (sync)", async () => {
		const onSubmit = vi.fn();
		const { formData } = mockForm({
			onSubmit,
			validationError: toRef(undefined)
		});

		expect(onSubmit).toBeCalledTimes(0);
		await formData!.submit();
		expect(onSubmit).toBeCalledTimes(1);
	});

	test("submits when there are no validation errors (async)", async () => {
		const onSubmit = vi.fn();
		const { formData } = mockForm({
			onSubmit,
			validationError: toRef(Promise.resolve(undefined))
		});

		expect(onSubmit).toBeCalledTimes(0);
		await formData!.submit();
		expect(onSubmit).toBeCalledTimes(1);
	});

	test("does not submit when there are validation errors (sync)", async () => {
		const onSubmit = vi.fn();
		const { formData } = mockForm({
			onSubmit,
			validationError: toRef("Error")
		});

		expect(onSubmit).toBeCalledTimes(0);
		await formData!.submit();
		expect(onSubmit).toBeCalledTimes(0);
	});

	test("does not submit when there are validation errors (async)", async () => {
		const onSubmit = vi.fn();
		const { formData } = mockForm({
			onSubmit,
			validationError: toRef(Promise.resolve("Error"))
		});

		expect(onSubmit).toBeCalledTimes(0);
		await formData!.submit();
		expect(onSubmit).toBeCalledTimes(0);
	});
});