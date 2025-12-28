import type { FieldApi, ReactFormApi } from "@tanstack/react-form";
import { HelpCircle } from "lucide-react";
import type * as React from "react";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface FormFieldWrapperProps<
	TParentData,
	TName extends string,
	TFieldValidator extends
		// biome-ignore lint/suspicious/noExplicitAny: Complex validator types
		| any
		| undefined = undefined,
> {
	// biome-ignore lint/suspicious/noExplicitAny: Complex TanStack Form types
	form: any;
	name: TName;
	label?: string;
	description?: string;
	tooltip?: string;
	className?: string;
	// biome-ignore lint/suspicious/noExplicitAny: Complex TanStack Form types
	// @ts-expect-error - Too complex to type correctly
	children: (field: FieldApi<TParentData, TName, TFieldValidator, any>) => React.ReactNode;
	validators?: any;
	required?: boolean;
	reserveErrorSpace?: boolean;
}

export function Field<
	TParentData,
	TName extends string,
	TFieldValidator extends
		// biome-ignore lint/suspicious/noExplicitAny: Complex validator types
		| any
		| undefined = undefined,
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
}: FormFieldWrapperProps<TParentData, TName, TFieldValidator>) {
	return (
		<form.Field
			name={name}
			validators={validators as any}
			// biome-ignore lint/suspicious/noExplicitAny: Complex TanStack Form types
			// @ts-expect-error - Too complex to type correctly
			children={(field: FieldApi<TParentData, TName, TFieldValidator, any>) => {
				// Field state
				const { meta } = field.state;
				const isInvalid = meta.isTouched && meta.errors.length > 0;
				// biome-ignore lint/suspicious/noExplicitAny: error message can be complex
				const errorMessage = meta.errors.map((err: any) => err?.message || err).join(", ");

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
