"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
	return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			data-slot="dialog-overlay"
			className={cn(
				"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/30",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * Wraps form children with DialogBody for proper scrolling.
 * - DialogHeader and DialogFooter stay outside (fixed)
 * - All other content goes inside DialogBody (scrollable)
 */
function wrapFormChildren(children: React.ReactNode): React.ReactNode {
	const childArray = React.Children.toArray(children);

	// Check if DialogBody is already present
	const hasDialogBody = childArray.some(
		(child) =>
			React.isValidElement(child) &&
			(child.props as { "data-slot"?: string })["data-slot"] === "dialog-body",
	);

	if (hasDialogBody) {
		return children;
	}

	// Separate header, footer, and body content
	const header: React.ReactNode[] = [];
	const footer: React.ReactNode[] = [];
	const body: React.ReactNode[] = [];

	for (const child of childArray) {
		if (React.isValidElement(child)) {
			const slot = (child.props as { "data-slot"?: string })["data-slot"];
			if (slot === "dialog-header") {
				header.push(child);
			} else if (slot === "dialog-footer") {
				footer.push(child);
			} else {
				body.push(child);
			}
		} else {
			body.push(child);
		}
	}

	// If there's body content, wrap it in DialogBody
	if (body.length > 0) {
		return (
			<>
				{header}
				<DialogBody>{body}</DialogBody>
				{footer}
			</>
		);
	}

	return children;
}

function DialogContent({
	className,
	children,
	showCloseButton = true,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
	showCloseButton?: boolean;
}) {
	// Process children to auto-wrap form content
	const processedChildren = React.Children.map(children, (child) => {
		if (React.isValidElement(child) && typeof child.type === "string" && child.type === "form") {
			// Clone the form with wrapped children
			return React.cloneElement(
				child as React.ReactElement<{ children?: React.ReactNode }>,
				{},
				wrapFormChildren(
					(child as React.ReactElement<{ children?: React.ReactNode }>).props.children,
				),
			);
		}
		return child;
	});

	return (
		<DialogPortal data-slot="dialog-portal">
			<DialogOverlay />
			<DialogPrimitive.Content
				data-slot="dialog-content"
				className={cn(
					"bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 flex flex-col w-full max-w-[calc(100%-2rem)] max-h-[85vh] translate-x-[-50%] translate-y-[-50%] rounded-lg border p-6 shadow-lg duration-200 sm:max-w-2xl [&>form]:flex [&>form]:flex-col [&>form]:flex-1 [&>form]:min-h-0",
					className,
				)}
				{...props}
			>
				{processedChildren}
				{showCloseButton && (
					<DialogPrimitive.Close
						data-slot="dialog-close"
						className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
					>
						<XIcon />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Content>
		</DialogPortal>
	);
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-header"
			className={cn("flex flex-col gap-2 mb-2 text-center sm:text-left shrink-0", className)}
			{...props}
		/>
	);
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-body"
			className={cn("flex-1 overflow-y-auto py-2 -mx-6 px-6", className)}
			{...props}
		/>
	);
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-footer"
			className={cn(
				"flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-4 shrink-0",
				className,
			)}
			{...props}
		/>
	);
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn("text-lg leading-none font-semibold", className)}
			{...props}
		/>
	);
}

function DialogDescription({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

export {
	Dialog,
	DialogBody,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
};
