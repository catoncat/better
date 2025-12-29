import { HelpCircle } from "lucide-react";
import type * as React from "react";
import type {
	DeepKeys,
	DeepValue,
	FieldApi,
	FieldAsyncValidateOrFn,
	FieldValidateOrFn,
	FieldValidators,
	FormAsyncValidateOrFn,
	FormValidateOrFn,
	ReactFormExtendedApi,
} from "@tanstack/react-form";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type FieldValue<TFormData, TName extends DeepKeys<TFormData>> = DeepValue<TFormData, TName>;

type FieldSyncValidator<TFormData, TName extends DeepKeys<TFormData>> =
	| FieldValidateOrFn<TFormData, TName, FieldValue<TFormData, TName>>
	| undefined;

type FieldAsyncValidator<TFormData, TName extends DeepKeys<TFormData>> =
	| FieldAsyncValidateOrFn<TFormData, TName, FieldValue<TFormData, TName>>
	| undefined;

type FieldValidatorsFor<TFormData, TName extends DeepKeys<TFormData>> = FieldValidators<
	TFormData,
	TName,
	FieldValue<TFormData, TName>,
	FieldSyncValidator<TFormData, TName>,
	FieldSyncValidator<TFormData, TName>,
	FieldAsyncValidator<TFormData, TName>,
	FieldSyncValidator<TFormData, TName>,
	FieldAsyncValidator<TFormData, TName>,
	FieldSyncValidator<TFormData, TName>,
	FieldAsyncValidator<TFormData, TName>,
	FieldSyncValidator<TFormData, TName>,
	FieldAsyncValidator<TFormData, TName>
>;

type FieldApiFor<
	TFormData,
	TName extends DeepKeys<TFormData>,
	TFormOnMount extends undefined | FormValidateOrFn<TFormData>,
	TFormOnChange extends undefined | FormValidateOrFn<TFormData>,
	TFormOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
	TFormOnBlur extends undefined | FormValidateOrFn<TFormData>,
	TFormOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
	TFormOnSubmit extends undefined | FormValidateOrFn<TFormData>,
	TFormOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
	TFormOnDynamic extends undefined | FormValidateOrFn<TFormData>,
	TFormOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
	TFormOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
	TSubmitMeta,
> = FieldApi<
	TFormData,
	TName,
	FieldValue<TFormData, TName>,
	FieldSyncValidator<TFormData, TName>,
	FieldSyncValidator<TFormData, TName>,
	FieldAsyncValidator<TFormData, TName>,
	FieldSyncValidator<TFormData, TName>,
	FieldAsyncValidator<TFormData, TName>,
	FieldSyncValidator<TFormData, TName>,
	FieldAsyncValidator<TFormData, TName>,
	FieldSyncValidator<TFormData, TName>,
	FieldAsyncValidator<TFormData, TName>,
	TFormOnMount,
	TFormOnChange,
	TFormOnChangeAsync,
	TFormOnBlur,
	TFormOnBlurAsync,
	TFormOnSubmit,
	TFormOnSubmitAsync,
	TFormOnDynamic,
	TFormOnDynamicAsync,
	TFormOnServer,
	TSubmitMeta
>;

type ErrorWithMessage = {
	message?: unknown;
};

function getErrorMessage(error: unknown): string | null {
	if (typeof error === "string") {
		return error;
	}

	if (error && typeof error === "object" && "message" in error) {
		const message = (error as ErrorWithMessage).message;
		if (typeof message === "string") {
			return message;
		}
	}

	return null;
}

export interface FormFieldWrapperProps<
	TFormData,
	TName extends DeepKeys<TFormData>,
	TFormOnMount extends undefined | FormValidateOrFn<TFormData>,
	TFormOnChange extends undefined | FormValidateOrFn<TFormData>,
	TFormOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
	TFormOnBlur extends undefined | FormValidateOrFn<TFormData>,
	TFormOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
	TFormOnSubmit extends undefined | FormValidateOrFn<TFormData>,
	TFormOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
	TFormOnDynamic extends undefined | FormValidateOrFn<TFormData>,
	TFormOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
	TFormOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
	TSubmitMeta,
> {
	form: ReactFormExtendedApi<
		TFormData,
		TFormOnMount,
		TFormOnChange,
		TFormOnChangeAsync,
		TFormOnBlur,
		TFormOnBlurAsync,
		TFormOnSubmit,
		TFormOnSubmitAsync,
		TFormOnDynamic,
		TFormOnDynamicAsync,
		TFormOnServer,
		TSubmitMeta
	>;
	name: TName;
	label?: string;
	description?: string;
	tooltip?: string;
	className?: string;
	children: (
		field: FieldApiFor<
			TFormData,
			TName,
			TFormOnMount,
			TFormOnChange,
			TFormOnChangeAsync,
			TFormOnBlur,
			TFormOnBlurAsync,
			TFormOnSubmit,
			TFormOnSubmitAsync,
			TFormOnDynamic,
			TFormOnDynamicAsync,
			TFormOnServer,
			TSubmitMeta
		>,
	) => React.ReactNode;
	validators?: FieldValidatorsFor<TFormData, TName>;
	required?: boolean;
	reserveErrorSpace?: boolean;
}

export function Field<
	TFormData,
	TName extends DeepKeys<TFormData>,
	TFormOnMount extends undefined | FormValidateOrFn<TFormData>,
	TFormOnChange extends undefined | FormValidateOrFn<TFormData>,
	TFormOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
	TFormOnBlur extends undefined | FormValidateOrFn<TFormData>,
	TFormOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
	TFormOnSubmit extends undefined | FormValidateOrFn<TFormData>,
	TFormOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
	TFormOnDynamic extends undefined | FormValidateOrFn<TFormData>,
	TFormOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
	TFormOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
	TSubmitMeta,
>({
	form,
	name,
	label,
	description,
	tooltip,
	className,
	children,
	validators,
	required,
	reserveErrorSpace = true,
}: FormFieldWrapperProps<
	TFormData,
	TName,
	TFormOnMount,
	TFormOnChange,
	TFormOnChangeAsync,
	TFormOnBlur,
	TFormOnBlurAsync,
	TFormOnSubmit,
	TFormOnSubmitAsync,
	TFormOnDynamic,
	TFormOnDynamicAsync,
	TFormOnServer,
	TSubmitMeta
>) {
	return (
		<form.Field
			name={name}
			validators={validators}
			children={(field) => {
				// Field state
				const { meta } = field.state;
				const isInvalid = meta.isTouched && meta.errors.length > 0;
				const errorMessage = meta.errors
					.map(getErrorMessage)
					.filter((message): message is string => Boolean(message))
					.join(", ");

				// Accessibility IDs
				const id = field.name;
				const descriptionId = `${id}-desc`;
				const messageId = `${id}-msg`;

				return (
					<div className={cn("group grid gap-1.5", className)}>
						{/* Label Row */}
						{label && (
							<div className="flex items-center gap-1.5 min-h-[20px]">
								<Label
									htmlFor={id}
									className={cn(
										"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
										isInvalid && "text-destructive",
									)}
								>
									{label}
									{required && <span className="ml-0.5 text-destructive">*</span>}
								</Label>
								{tooltip && (
									<Tooltip>
										<TooltipTrigger asChild>
											<HelpCircle className="h-3.5 w-3.5 text-muted-foreground/70 transition-colors hover:text-muted-foreground cursor-help" />
										</TooltipTrigger>
										<TooltipContent>{tooltip}</TooltipContent>
									</Tooltip>
								)}
							</div>
						)}

						{/* Control */}
						{children(field)}

						{/* Message/Description Slot (Shared) */}
						<div
							className={cn(
								"text-[0.8rem] transition-all",
								reserveErrorSpace ? "min-h-[20px]" : "min-h-0",
							)}
						>
							{isInvalid ? (
								<p
									id={messageId}
									className="font-medium text-destructive animate-in slide-in-from-top-1 fade-in-0"
								>
									{errorMessage}
								</p>
							) : description ? (
								<p id={descriptionId} className="text-muted-foreground">
									{description}
								</p>
							) : null}
						</div>
					</div>
				);
			}}
		/>
	);
}
